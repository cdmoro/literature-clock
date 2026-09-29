"""Safety is shared by ID, including unpublished translated passages."""
import csv
import json
import tempfile
import unittest
from pathlib import Path

from generate_times import generate_catalogue
from validate_translation import FIELDS, ROOT, parse_sfw, read_catalogue, validate


class QuoteSafetyTest(unittest.TestCase):
    def test_all_catalogues_use_the_same_boolean_classification_by_id(self):
        source = read_catalogue(ROOT / 'quotes/quotes.en-GB.csv')
        expected = {row['Id']: parse_sfw(row['SFW'], row['Id']) for row in source}
        self.assertEqual(len(expected), len(source))
        for path in (ROOT / 'quotes').glob('*.csv'):
            with self.subTest(catalogue=path.name):
                rows = read_catalogue(path)
                actual = {row['Id']: parse_sfw(row['SFW'], row['Id']) for row in rows}
                self.assertEqual(len(actual), len(rows))
                self.assertEqual(actual, expected)

    def test_rejects_ambiguous_values_including_draft_rows(self):
        row = dict(zip(FIELDS, ['12:00', '1200-000', 'noon', 'At noon.', 'Book', 'Author', 'true', 'en']))
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'quotes.en-GB.csv'
            for value in ['', 'unknown', 'sfw', 'nsfw', 'nswf', 'True', 'FALSE', '1', ' true ']:
                with self.subTest(value=value):
                    invalid = {**row, 'SFW': value, 'Draft': 'true'}
                    with path.open('w', newline='') as stream:
                        writer = csv.DictWriter(stream, fieldnames=FIELDS + ['Draft'], delimiter='|')
                        writer.writeheader()
                        writer.writerow(invalid)
                    with self.assertRaisesRegex(ValueError, 'SFW must be true or false'):
                        read_catalogue(path)
                    self.assertTrue(validate([invalid], [invalid]))

    def test_generation_emits_real_booleans_in_published_and_draft_json(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / 'quotes.en-GB.csv'
            path.write_text(
                'Time|Id|Quote time|Quote|Title|Author|SFW|Draft\n'
                '12:00|1200-000|noon|At noon.|Book|Author|true|false\n'
                '12:00|1200-001|noon|At noon.|Book|Author|false|false\n'
                '12:00|1200-002|noon|At noon.|Book|Author|false|true\n'
            )
            output = root / 'times'
            generate_catalogue(path, output)
            generate_catalogue(path, output, include_drafts=True)
            for locale, expected in [('en-GB', [True, False]), ('en-GB-draft', [True, False, False])]:
                rows = json.loads((output / locale / '12_00.json').read_text())
                self.assertEqual([row['sfw'] for row in rows], expected)
                self.assertTrue(all(type(row['sfw']) is bool for row in rows))


if __name__ == '__main__':
    unittest.main()
