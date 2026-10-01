"""Publication and regressions for the Russian translation import."""
import json
from pathlib import Path
import tempfile
import unittest

from audit_translation_quality import clock_phrase
from generate_times import generate_catalogue
from quote_sources import source_catalogue, source_language
from validate_translation import ROOT, read_catalogue, validate


class RussianCatalogueTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = read_catalogue(ROOT / 'quotes/quotes.ru-RU.csv')
        cls.source = source_catalogue(ROOT / 'quotes')
        cls.sources = {row['Id']: row for row in cls.source}
        cls.by_id = {row['Id']: row for row in cls.rows}

    def test_all_rows_preserve_source_metadata_and_formatting(self):
        self.assertEqual(len(self.rows), 3640)
        self.assertEqual(validate(self.source, self.rows), [])

    def test_parsable_times_preserve_source_meaning(self):
        compared = 0
        for row in self.rows:
            source = self.sources[row['Id']]
            expected = clock_phrase(source['Quote time'], source_language(source['Source locale']))
            actual = clock_phrase(row['Quote time'], 'ru')
            if expected is not None and actual is not None:
                compared += 1
                with self.subTest(identifier=row['Id']):
                    self.assertEqual(actual, expected)
        self.assertGreater(compared, 2700)

    def test_literary_and_omission_repairs(self):
        rayuela = self.by_id['1430-008']['Quote']
        self.assertIn('Травелера', rayuela)
        self.assertIn('гвозди', rayuela)
        self.assertNotIn('ногти', rayuela)
        self.assertIn('Coach', self.by_id['2250-001']['Quote'])
        self.assertIn('девять часов вечера', self.by_id['2100-007']['Quote'])
        self.assertIn('полуночная', self.by_id['0000-053']['Quote'])
        self.assertIn('15:08', self.by_id['1459-002']['Quote'])
        self.assertIn('22:12:30–40', self.by_id['2212-002']['Quote'])

    def test_every_quote_is_generated_with_a_visible_time_and_boolean_safety(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            generate_catalogue(ROOT / 'quotes/quotes.ru-RU.csv', output)
            quotes = [quote for path in (output / 'ru-RU').glob('[0-2][0-9]_[0-5][0-9].json')
                      for quote in json.loads(path.read_text())]
            self.assertEqual(len(quotes), len(self.rows))
            for quote in quotes:
                self.assertTrue(quote['quote_time_case'])
                self.assertIsInstance(quote['sfw'], bool)


if __name__ == '__main__':
    unittest.main()
