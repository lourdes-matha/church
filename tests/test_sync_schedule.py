import csv
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('sync_schedule', Path(__file__).resolve().parents[1] / 'scripts/sync_schedule.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


class ScheduleSyncTests(unittest.TestCase):
    def feed(self, rows):
        stream = io.StringIO()
        writer = csv.writer(stream)
        writer.writerow(sync.COLUMNS)
        writer.writerows(rows)
        return stream.getvalue()

    def test_quotes_commas_and_multiple_lines_survive(self):
        detail = 'Rosary, prayer\nBring "your" book'
        records = sync.parse_schedule(self.feed([['2026-10-27', '19:00', 'Holy Qurbana', detail, '', 'Weekly', '']]))
        self.assertEqual(records[0]['Details'], detail)

    def test_invalid_data_never_replaces_last_good_file(self):
        good = ['2026-10-27', '19:00', 'Holy Qurbana', '', '', 'Weekly', '']
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'schedule-data.json'
            sync.save_snapshot(sync.parse_schedule(self.feed([good])), target)
            before = target.read_bytes()
            for field, invalid in [(0, '2026-02-30'), (2, ''), (5, 'Weekley')]:
                row = good.copy()
                row[field] = invalid
                with self.assertRaises(ValueError):
                    sync.save_snapshot(sync.parse_schedule(self.feed([row])), target)
                self.assertEqual(target.read_bytes(), before)

    def test_empty_or_wrong_feed_rejected(self):
        for data in ['', '<html>Sign in</html>', self.feed([])]:
            with self.assertRaises(ValueError):
                sync.parse_schedule(data)

    def test_unchanged_records_do_not_rewrite_sync_time(self):
        records = sync.parse_schedule(self.feed([['2026-10-27', '', 'Holy Qurbana', '', '', 'Weekly', '']]))
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'schedule-data.json'
            self.assertTrue(sync.save_snapshot(records, target))
            before = target.read_bytes()
            self.assertFalse(sync.save_snapshot(records, target))
            self.assertEqual(target.read_bytes(), before)
            self.assertEqual(json.loads(before)['records'], records)


if __name__ == '__main__':
    unittest.main()
