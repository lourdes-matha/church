"""Build the Parish Night sponsor gallery from the published sponsor sheet."""
import csv
import hashlib
import io
import json
import re
import tempfile
from functools import lru_cache
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, build_opener

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
FEED = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTh3nS82lZwW4lFP5SE2SrmON3K9_c0vTYazSQJartd29Bl18LpOUUYvYW9c44EnFPOB3FR4akjvWBW/pub?gid=0&single=true&output=csv'
HEADERS = {'ID', 'Sponsor Name', 'Tier', 'Laptop Image URL', 'Mobile Image URL', 'Display Order', 'Approved'}
TIERS = ('platinum', 'gold', 'silver', 'family')


def check_host(url):
    parsed = urlsplit(url)
    host = parsed.hostname or ''
    if parsed.scheme != 'https' or not (
        host in {'docs.google.com', 'drive.google.com', 'drive.usercontent.google.com'}
        or host.endswith('.googleusercontent.com')
    ):
        raise ValueError('Unexpected Google download host')


class GoogleRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        check_host(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def download(url, limit):
    check_host(url)
    with build_opener(GoogleRedirect()).open(url, timeout=30) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError('Google download exceeds the size limit')
    return data


def parse(text):
    reader = csv.DictReader(io.StringIO(text), strict=True)
    if not HEADERS.issubset(reader.fieldnames or []):
        raise ValueError('Sponsor sheet is missing required headings')
    ids = set()
    rows = []
    for line, raw in enumerate(reader, 2):
        if not any(raw.values()):
            continue
        if None in raw:
            raise ValueError(f'Row {line}: too many columns')
        row = {key: (value or '').strip() for key, value in raw.items()}
        approved = row['Approved'].lower()
        if approved in ('', 'no', 'false'):
            continue
        if approved not in ('yes', 'true'):
            raise ValueError(f'Row {line}: use Yes or No for Approved')
        sponsor_id = row['ID']
        tier = row['Tier'].lower()
        if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,79}', sponsor_id) or sponsor_id in ids:
            raise ValueError(f'Row {line}: use a unique lowercase sponsor ID')
        ids.add(sponsor_id)
        if not row['Sponsor Name'] or tier not in TIERS:
            raise ValueError(f'Row {line}: enter a sponsor name and a valid tier')
        order = row['Display Order'] or '9999'
        if not re.fullmatch(r'[0-9]{1,6}', order):
            raise ValueError(f'Row {line}: use a whole number for Display Order')
        rows.append((TIERS.index(tier), int(order), sponsor_id, row))
    return [row for _, _, _, row in sorted(rows)]


@lru_cache(maxsize=128)
def poster(link):
    url = urlsplit(link)
    match = re.fullmatch(r'/file/d/([\w-]+)(?:/view)?/?', url.path)
    if url.scheme != 'https' or url.netloc != 'drive.google.com' or not match:
        raise ValueError('Use the sharing link for an individual Google Drive image')
    query = {'id': match[1], 'export': 'download'}
    resource_key = parse_qs(url.query).get('resourcekey')
    if resource_key:
        query['resourcekey'] = resource_key[0]
    data = download('https://drive.google.com/uc?' + urlencode(query), 15 * 1024 * 1024)
    with Image.open(io.BytesIO(data)) as original:
        if original.width * original.height > 40_000_000:
            raise ValueError('Sponsor image is too large')
        image = ImageOps.exif_transpose(original).convert('RGB')
        image.thumbnail((1800, 1800))
        output = io.BytesIO()
        image.save(output, 'WEBP', quality=86, method=6)
    content = output.getvalue()
    digest = hashlib.sha256(content).hexdigest()[:20]
    return f'images/sponsors/sheet-{digest}.webp', content


def main():
    rows = parse(download(FEED, 1024 * 1024).decode('utf-8-sig'))
    entries, images = [], {}
    for row in rows:
        desktop, mobile = row['Laptop Image URL'], row['Mobile Image URL']
        if not desktop and not mobile:
            raise ValueError(f"{row['ID']}: add at least one Drive image link")
        entry = {'name': row['Sponsor Name'], 'tier': row['Tier'].lower()}
        for field, link in [('desktop', desktop or mobile), ('mobile', mobile or desktop)]:
            path, content = poster(link)
            images[path] = content
            entry[field] = path
        entries.append(entry)

    # Download and validate the complete sheet before replacing the gallery data.
    with tempfile.TemporaryDirectory(dir=ROOT) as temp:
        staged = Path(temp)
        for path, content in images.items():
            target = ROOT / path
            if not target.exists():
                candidate = staged / target.name
                candidate.write_bytes(content)
                candidate.replace(target)
        data = staged / 'parish-night-sponsors.json'
        data.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        data.replace(ROOT / data.name)
    print(f'Synced {len(entries)} approved sponsor(s) and {len(images)} image(s).')


if __name__ == '__main__':
    main()
