"""Regressions for repaired Chinese data and publication of contextual drafts."""
import json
from pathlib import Path
import tempfile
import unittest

from chinese_time import clock_phrase
from generate_times import generate_catalogue
from quote_sources import source_catalogue
from validate_translation import ROOT, read_catalogue, validate, is_draft


class ChineseCatalogueTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = read_catalogue(ROOT / 'quotes/quotes.zh-CN.csv')
        cls.index = {row['Id']: row for row in cls.rows}
        cls.source = source_catalogue(ROOT / 'quotes')

    def test_strict_validation_also_checks_pending_passages(self):
        self.assertEqual(validate(self.source, [{**row, 'Draft': 'false'} for row in self.rows]), [])

    def test_corrected_subtraction_and_precision_are_present_in_the_passage(self):
        expected = {'0252-000': 172, '0253-000': 173, '0359-001': 239,
                    '0451-001': 291, '0658-000': 418, '0730-005': 450,
                    '0753-001': 473, '0845-002': 525, '0858-000': 538,
                    '0942-001': 582, '0950-003': 590, '1046-001': 646,
                    '1202-001': 2, '1551-000': 231, '1658-000': 298,
                    '1746-000': 346, '2149-000': 589, '2150-002': 590,
                    '2246-001': 646, '2252-000': 652, '2357-000': 717}
        for identifier, minute in expected.items():
            with self.subTest(identifier=identifier):
                row = self.index[identifier]
                self.assertIn(row['Quote time'], row['Quote'])
                self.assertEqual(clock_phrase(row['Quote time']), minute)
        self.assertIn('两分十五秒', self.index['1202-001']['Quote'])
        self.assertIn('差一刻三点', self.index['1658-000']['Quote'])
        self.assertIn('差一刻五点', self.index['1658-000']['Quote'])
        self.assertIn('五点零两分', self.index['1658-000']['Quote'])

    def test_corrupted_passages_are_restored_without_metadata_drift(self):
        originals = {row['Id']: row for row in self.source}
        for identifier in ['0100-002', '0200-006', '0301-000', '0830-000',
                           '0913-001', '1000-018', '1649-001', '1800-003']:
            row = self.index[identifier]
            with self.subTest(identifier=identifier):
                self.assertGreater(len(row['Quote']), 20)
                self.assertIn(row['Quote time'], row['Quote'])
                for field in ['Time', 'Id', 'Author', 'SFW', 'Source locale']:
                    self.assertEqual(row[field], originals[identifier][field])

    def test_repaired_duplicate_passages_retain_their_individual_highlights(self):
        for a, b in [('0800-021', '0955-003'), ('0800-021', '1000-022')]:
            self.assertEqual(self.index[a]['Quote'], self.index[b]['Quote'])
            self.assertNotEqual(self.index[a]['Quote time'], self.index[b]['Quote time'])
        self.assertEqual(self.index['0950-003']['Quote'], self.index['2150-002']['Quote'])

    def test_jointly_reviewed_passages_are_enabled_and_source_slots_agree(self):
        for identifier in ['1430-008', '0919-000', '2250-001', '2156-000', '1500-038']:
            self.assertFalse(is_draft(self.index[identifier]))
        self.assertIn('Traveler', self.index['1430-008']['Quote'])
        self.assertIn('钉子', self.index['1430-008']['Quote'])
        self.assertIn('满月和新月', self.index['0919-000']['Quote'])
        self.assertIn('Coach', self.index['2250-001']['Quote'])
        self.assertNotIn('一百度', self.index['2250-001']['Quote'])
        self.assertIn('扯开', self.index['2156-000']['Quote'])
        self.assertEqual(clock_phrase(self.index['2156-000']['Quote time']), 596)
        for path in (ROOT / 'quotes').glob('quotes.*.csv'):
            rows = {row['Id']: row for row in read_catalogue(path)}
            with self.subTest(catalogue=path.name):
                self.assertEqual(rows['1500-038']['Time'], '03:00')
                self.assertNotEqual(rows['1500-038']['Quote'], rows['0300-002']['Quote'])
        for locale in ['en-GB', 'en-US']:
            rows = {row['Id']: row for row in read_catalogue(ROOT / f'quotes/quotes.{locale}.csv')}
            self.assertIn('full and change', rows['0919-000']['Quote'])

    def test_context_and_source_slot_drafts_do_not_enter_public_json(self):
        identifiers = {row['Id'] for row in self.rows if is_draft(row)}
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            generate_catalogue(ROOT / 'quotes/quotes.zh-CN.csv', output)
            published = [quote for path in (output / 'zh-CN').glob('[0-2][0-9]_[0-5][0-9].json')
                         for quote in json.loads(path.read_text())]
            self.assertEqual(len(published), sum(not is_draft(row) for row in self.rows))
            self.assertFalse(identifiers.intersection(quote['id'] for quote in published))
            self.assertTrue(all(type(quote['sfw']) is bool for quote in published))


if __name__ == '__main__':
    unittest.main()
