import copy
import tempfile
import unittest
from pathlib import Path

from validate_translation import read_catalogue, validate


class TranslationValidationTest(unittest.TestCase):
    def setUp(self):
        self.source = [{'Time': '07:30', 'Id': '0730-000', 'Quote time': 'half past seven',
                        'Quote': 'It was half past seven.<br>He waited.', 'Title': 'Book',
                        'Author': 'Author', 'SFW': 'sfw'}]
        self.target = [{**self.source[0], 'Quote time': 'επτά και μισή',
                        'Quote': 'Ήταν επτά και μισή.<br>Περίμενε.', 'Title': 'Βιβλίο'}]

    def test_accepts_translation_without_mutating_it(self):
        before = copy.deepcopy(self.target)
        self.assertEqual(validate(self.source, self.target), [])
        self.assertEqual(self.target, before)

    def test_rejects_missing_and_duplicate_quotes(self):
        self.assertTrue(validate(self.source, []))
        self.assertTrue(validate(self.source, self.target * 2))

    def test_rejects_separately_translated_time_not_in_quote(self):
        self.target[0]['Quote time'] = '7:30'
        self.assertTrue(validate(self.source, self.target))

    def test_rejects_changed_metadata_and_lost_formatting(self):
        for field, value in [('Time', '19:30'), ('SFW', 'nsfw'), ('Author', 'Other'),
                             ('Quote', 'Ήταν επτά και μισή.'), ('Title', '')]:
            with self.subTest(field=field):
                changed = [{**self.target[0], field: value}]
                self.assertTrue(validate(self.source, changed))

    def test_reads_utf8_without_rewriting_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'quotes.csv'
            contents = ('Time|Id|Quote time|Quote|Title|Author|SFW\n'
                        '07:30|0730-000|επτά και μισή|Ήταν επτά και μισή.|Βιβλίο|Author|sfw\n')
            path.write_text(contents, encoding='utf-8')
            before = path.read_bytes()
            self.assertEqual(read_catalogue(path)[0]['Title'], 'Βιβλίο')
            self.assertEqual(path.read_bytes(), before)

    def test_rejects_malformed_csv(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'quotes.csv'
            path.write_text('Time|Id|Quote time|Quote|Title|Author|SFW\n07:30|0730-000\n')
            with self.assertRaises(ValueError):
                read_catalogue(path)


if __name__ == '__main__':
    unittest.main()
