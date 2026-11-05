#!/usr/bin/env python3
"""Publish validated event data and small local image copies; never read Sheets in visitors' browsers."""
import csv
import hashlib
import io
import json
import os
import re
import tempfile
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRoxocl9mHeT5eMxnq16kpZQNhTVPapCLRD8P_m44088wGyLEea_fBXO8gWLRckZSMgnAFqQkYF-Dzb/pub?gid=0&single=true&output=csv'
COLUMNS = ['ID', 'Event Name', 'Start Date', 'End Date', 'Poster URL', 'Desktop Banner URL', 'Mobile Banner URL', 'Event Link', 'Show in Slideshow', 'Slide Start Date', 'Slide End Date', 'Slide Order', 'Enabled']
IMAGES = ['Poster URL', 'Desktop Banner URL', 'Mobile Banner URL']

def yes(value):
    if value.lower() not in ('yes', 'no', 'true', 'false'):
        raise ValueError('Use Yes or No for Enabled and Show in Slideshow')
    return value.lower() in ('yes', 'true')

def day(value):
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        raise ValueError('Dates must use YYYY-MM-DD')
    return date.fromisoformat(value)

def safe_link(value):
    if not value:
        return
    u = urlparse(value)
    if u.scheme == 'https' and u.hostname and not u.username and not u.password:
        return
    if not u.scheme and not u.netloc and not value.startswith('/') and '..' not in value.split('/'):
        return
    raise ValueError('Links must use HTTPS or a relative website path')

def parse_events(text):
    reader = csv.DictReader(io.StringIO(text.lstrip('\ufeff')), strict=True)
    if not set(COLUMNS).issubset(reader.fieldnames or []):
        raise ValueError('Missing event headings')
    rows, ids = [], set()
    for raw in reader:
        if not any(raw.values()):
            continue
        if None in raw:
            raise ValueError('Too many columns in an event row')
        row = {k: (v or '').strip() for k, v in raw.items()}
        if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,79}', row['ID']) or row['ID'] in ids:
            raise ValueError('IDs must be unique lowercase names such as parish-night-2026')
        ids.add(row['ID'])
        if not row['Event Name']:
            raise ValueError('Event Name is required')
        enabled, slideshow = yes(row['Enabled']), yes(row['Show in Slideshow'])
        show_in_events = yes(row.get('Show in Events') or 'Yes')
        row['Show in Events'] = show_in_events
        if show_in_events or row['Start Date'] or row['End Date']:
            start = day(row['Start Date'])
            row['End Date'] = row['End Date'] or row['Start Date']
            if day(row['End Date']) < start:
                raise ValueError('End Date cannot precede Start Date')
        for field in IMAGES + ['Event Link', 'Instagram URL', 'Facebook URL']:
            safe_link(row.get(field, ''))
        if enabled and show_in_events and not row['Poster URL']:
            raise ValueError('Enabled events need a Poster URL')
        if slideshow:
            if not all(row[k] for k in ('Desktop Banner URL', 'Mobile Banner URL')):
                raise ValueError('Slideshow entries need desktop and mobile images')
            if not row['Slide Start Date'] or not row['Slide End Date']:
                raise ValueError('Slideshow events need both slide dates')
            if day(row['Slide End Date']) < day(row['Slide Start Date']):
                raise ValueError('Slide End Date cannot precede Slide Start Date')
        for k in ['Slide Start Date', 'Slide End Date']:
            if row[k]:
                day(row[k])
        row['Slide Order'] = int(row['Slide Order'] or 0)
        row['Enabled'], row['Show in Slideshow'] = enabled, slideshow
        rows.append(row)
    return rows

def download(url, maximum):
    # Source images are limited to the parish site or Google's public file hosts.
    def allowed(u):
        h = (urlparse(u).hostname or '').lower()
        return h in ('docs.google.com', 'drive.google.com', 'drive.usercontent.google.com', 'lourdesmathawindsor.ca') or h.endswith('.googleusercontent.com')
    if not allowed(url):
        raise ValueError('Use a public Google Drive image or an existing parish website image')
    with urlopen(Request(url, headers={'User-Agent': 'LourdesMathaEventSync/1.0'}), timeout=30) as response:
        if not allowed(response.url):
            raise ValueError('Unexpected download host')
        data = response.read(maximum + 1)
        if len(data) > maximum:
            raise ValueError('Download exceeds size limit')
        return data

def local_image(source, stage):
    u = urlparse(source)
    if not u.scheme or u.hostname == 'lourdesmathawindsor.ca':
        path = u.path.lstrip('/')
        if '..' in path.split('/') or not path.startswith('images/'):
            raise ValueError('Existing website images must be inside images/')
        if (ROOT / path).is_file():
            return path
    if u.hostname == 'drive.google.com':
        match = re.search(r'/file/d/([\w-]+)', u.path)
        fid = match.group(1) if match else parse_qs(u.query).get('id', [''])[0]
        if not re.fullmatch(r'[\w-]+', fid):
            raise ValueError('Use a Google Drive file sharing link, not a folder link')
        source = 'https://drive.google.com/uc?export=download&id=' + fid
    data = download(source, 15 * 1024 * 1024)
    from PIL import Image, ImageOps
    with Image.open(io.BytesIO(data)) as original:
        if original.width * original.height > 40_000_000:
            raise ValueError('Image is too large')
        image = ImageOps.exif_transpose(original).convert('RGB')
        image.thumbnail((2200, 2200))
        out = io.BytesIO()
        image.save(out, format='WEBP', quality=84, method=6)
    result = out.getvalue()
    filename = hashlib.sha256(result).hexdigest()[:20] + '.webp'
    (stage / filename).write_bytes(result)
    return 'images/events/managed/' + filename

def main():
    text = download(SHEET_URL, 1024 * 1024).decode('utf-8-sig')
    rows = parse_events(text)
    if not rows:
        print('Sheet has headings only. Keeping the existing published events until rows are added.')
        return
    old = json.loads((ROOT / 'events-data.json').read_text())
    old_rows = {r['ID']: r for r in old['events']}
    with tempfile.TemporaryDirectory() as tmp:
        stage = Path(tmp)
        for row in rows:
            previous = old_rows.get(row['ID'], {})
            # Optional social links and descriptions from existing cards survive the basic sheet.
            for key in ['Instagram URL', 'Facebook URL', 'Description', 'Date Label', 'Media Type']:
                if key not in row:
                    row[key] = previous.get(key, '')
            sources = {}
            for key in IMAGES:
                source = row[key]
                sources[key] = source
                cached = previous.get('sources', {}).get(key) == source
                existing = previous.get(key, '')
                if source and row['Enabled']:
                    row[key] = existing if cached and (ROOT / existing).is_file() else local_image(source, stage)
                elif not row['Enabled']:
                    row[key] = ''
            row['sources'] = sources
        if rows == old['events']:
            print('No changes to publish.')
            return
        payload = {'schema_version': 1, 'updated_at': datetime.now(timezone.utc).isoformat(), 'events': rows}
        data = json.dumps(payload, ensure_ascii=False, indent=2)
        assets = ROOT / 'images/events/managed'
        assets.mkdir(parents=True, exist_ok=True)
        for file in stage.iterdir():
            os.replace(file, assets / file.name)
        for name, content in [('events-data.json', data + '\n'), ('events-data.js', 'window.PARISH_EVENTS = ' + data.replace('<', '\\u003c') + ';\n')]:
            temp = ROOT / (name + '.tmp')
            temp.write_text(content, encoding='utf-8')
            os.replace(temp, ROOT / name)
        print(f'Published {len(rows)} events. Images served from the parish website.')

if __name__ == '__main__':
    main()
