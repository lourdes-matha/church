#!/usr/bin/env python3
"""Validate the public schedule feed and atomically refresh its website snapshot."""
import csv
import io
import json
import os
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSbJkXx468_CZPB3G46WklY1cc_lmT2dyzqItejHDyiywc5k8DeJDIbmtBCHWk9C4x1jru6Nys2Dy2V/pub?gid=0&single=true&output=csv'
COLUMNS = ['Date', 'Time', 'Event', 'Details', 'Responsibility', 'Category', 'Link']
DESTINATION = Path(__file__).resolve().parents[1] / 'schedule-data.json'


def parse_schedule(text):
    reader = csv.DictReader(io.StringIO(text.lstrip('\ufeff')), strict=True)
    headers = [str(value).strip() for value in (reader.fieldnames or [])]
    if not set(COLUMNS).issubset(headers):
        raise ValueError('Sheet headings must include: ' + ', '.join(COLUMNS))
    reader.fieldnames = headers
    records = []
    for line, row in enumerate(reader, 2):
        if not any(str(value or '').strip() for key, value in row.items() if key):
            continue
        if None in row:
            raise ValueError(f'Row {line}: too many columns')
        record = {key: (row.get(key) or '').strip() for key in COLUMNS}
        try:
            parsed = date.fromisoformat(record['Date'])
            if parsed.isoformat() != record['Date']:
                raise ValueError()
        except ValueError as error:
            raise ValueError(f'Row {line}: use YYYY-MM-DD in Date') from error
        if not record['Event']:
            raise ValueError(f'Row {line}: Event is required')
        category = record['Category'].lower()
        if category not in ('weekly', 'upcoming'):
            raise ValueError(f'Row {line}: Category must be Weekly or Upcoming')
        record['Category'] = category.title()
        records.append(record)
    if not records or not any(row['Category'] == 'Weekly' for row in records):
        raise ValueError('Feed must contain at least one Weekly event; retaining the previous snapshot')
    return records


def save_snapshot(records, destination=DESTINATION):
    if destination.exists():
        previous = json.loads(destination.read_text())
        if previous.get('schema_version') == 1 and previous.get('records') == records:
            print('Schedule unchanged; no commit needed.')
            return False
    payload = {'schema_version': 1, 'updated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'records': records}
    temporary = destination.with_suffix('.json.tmp')
    try:
        temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)
    print(f'Saved {len(records)} validated schedule rows.')
    return True


def main():
    request = Request(SHEET_URL, headers={'User-Agent': 'LourdesMatha-ScheduleSync/1.0', 'Cache-Control': 'no-cache'})
    with urlopen(request, timeout=30) as response:
        data = response.read(2_000_001)
    if len(data) > 2_000_000:
        raise ValueError('Feed unexpectedly large; retaining the previous snapshot')
    records = parse_schedule(data.decode('utf-8-sig'))
    save_snapshot(records)


if __name__ == '__main__':
    main()
