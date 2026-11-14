import csv
import tempfile
import unittest
from pathlib import Path

from prepare_quote_attributions import normalize_csvs


class NormalizeQuoteAttributionsTest(unittest.TestCase):
    def test_normalizes_titles_and_authors_from_resolved_sources_only(self):
        with tempfile.TemporaryDirectory() as directory:
            quotes = Path(directory) / 'quotes'
            quotes.mkdir()
            fields = ['Time', 'Id', 'Quote time', 'Quote', 'Title', 'Author', 'SFW', 'Source locale']
            source = {'Time': '07:30', 'Id': '0730-000', 'Quote time': 'seven thirty',
                      'Quote': 'At seven thirty.', 'Title': 'Original title',
                      'Author': 'Original author', 'SFW': 'true', 'Source locale': 'en'}
            translated = {**source, 'Quote time': 'siete y media', 'Quote': 'A las siete y media.',
                          'Title': 'Título traducido', 'Author': 'Autor traducido'}
            for locale, row in [('en-GB', source), ('es-ES', translated)]:
                with (quotes / f'quotes.{locale}.csv').open('w', encoding='utf-8', newline='') as stream:
                    writer = csv.DictWriter(stream, fieldnames=fields, delimiter='|')
                    writer.writeheader()
                    writer.writerow(row)

            changed = normalize_csvs(quotes)

            with (quotes / 'quotes.es-ES.csv').open(encoding='utf-8', newline='') as stream:
                row = next(csv.DictReader(stream, delimiter='|'))
            self.assertEqual(row['Title'], source['Title'])
            self.assertEqual(row['Author'], source['Author'])
            self.assertEqual(row['Quote'], translated['Quote'])
            self.assertEqual(row['Quote time'], translated['Quote time'])
            self.assertEqual(changed['quotes.es-ES.csv'], 1)
            self.assertNotIn('quotes.en-GB.csv', changed)


if __name__ == '__main__':
    unittest.main()
