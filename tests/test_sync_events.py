import importlib.util
import csv
import io
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('sync_events', Path(__file__).parents[1] / 'scripts/sync_events.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)

class EventValidation(unittest.TestCase):
    def row(self):
        return dict(zip(sync.COLUMNS, ['event-2026','Event','2026-11-28','','images/poster.webp','images/desktop.webp','images/mobile.webp','parish-night-2026.html','Yes','2026-11-01','2026-11-28','2','Yes']))
    def parse(self, rows):
        s = io.StringIO(); w = csv.DictWriter(s,fieldnames=sync.COLUMNS);w.writeheader();w.writerows(rows)
        return sync.parse_events(s.getvalue())
    def test_blank_end_uses_start(self):
        result = self.parse([self.row()])[0]
        self.assertEqual(result['End Date'],'2026-11-28')
        self.assertTrue(result['Enabled'])
    def test_empty_feed_retains_snapshot(self):
        self.assertEqual(self.parse([]),[])
    def test_duplicate_ids_rejected(self):
        with self.assertRaises(ValueError): self.parse([self.row(),self.row()])
    def test_bad_date_and_reversed_dates(self):
        for value in ['2026-02-30','11/28/2026','2026-11-01']:
            r=self.row();r['End Date']=value
            with self.assertRaises(ValueError): self.parse([r])
    def test_slide_requires_both_sizes(self):
        r=self.row();r['Mobile Banner URL']=''
        with self.assertRaises(ValueError): self.parse([r])
    def test_unsafe_link_rejected(self):
        r=self.row();r['Event Link']='javascript:alert(1)'
        with self.assertRaises(ValueError): self.parse([r])
    def test_disable_all_is_explicitly_supported(self):
        r=self.row();r['Enabled']='No';r['Show in Slideshow']='No';r['Poster URL']=''
        self.assertFalse(self.parse([r])[0]['Enabled'])

if __name__ == '__main__': unittest.main()
