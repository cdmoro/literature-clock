"""Second-pass clock coverage and source-fidelity regressions."""
import unittest
from chinese_review_time import compare_times, review_clock
from quote_sources import source_catalogue
from validate_translation import ROOT, read_catalogue, is_draft


class ChineseSecondPassTest(unittest.TestCase):
    def test_extra_clock_formats_are_checked_without_slot_inference(self):
        for phrase, minute in [('eight-eleven', 491), ('one seventeen', 77),
                               ('eight past midnight', 8), ('half past midnight', 30),
                               ('five-and-twenty minutes past midnight', 25),
                               ('a quarter to nine', 525), ('five and twenty to nine', 515),
                               ('twenty three minutes past ten', 623),
                               ('three o’clock in the morning', 180),
                               ('ten twenty nine', 629), ('1654', 294), ('0331 hours', 211)]:
            with self.subTest(phrase=phrase):
                self.assertEqual(review_clock(phrase, 'en'), minute)
        for phrase in ['about quarter to one', 'one minute after the quarter to seven',
                       'four minutes later', 'Three thirty-one and a half', '25:67', '2401',
                       '9:03 +1', 'four hours of sleep']:
            with self.subTest(phrase=phrase):
                self.assertIsNone(review_clock(phrase, 'en'))
        self.assertEqual(compare_times('three', '三', 'en'), (180, 180))
        self.assertEqual(compare_times('eight past midnight', '午夜过后八分钟', 'en'), (8, 8))
        self.assertEqual(compare_times('Eight-eleven', '八十一', 'en'), (491, None))

    def test_expanded_clock_comparisons_have_no_known_mismatches(self):
        sources = {row['Id']: row for row in source_catalogue(ROOT / 'quotes')}
        from quote_sources import source_language
        for row in read_catalogue(ROOT / 'quotes/quotes.zh-CN.csv'):
            original = sources[row['Id']]
            expected, actual = compare_times(original['Quote time'], row['Quote time'],
                                             source_language(original['Source locale']))
            if expected is not None and actual is not None:
                self.assertEqual(actual, expected, row['Id'])

    def test_noon_slot_follows_explicit_pm_without_rewriting_the_source(self):
        for path in (ROOT / 'quotes').glob('quotes.*.csv'):
            row = next(row for row in read_catalogue(path) if row['Id'] == '0000-032')
            self.assertEqual(row['Time'], '12:00', path.name)
        rows = {row['Id']: row for row in read_catalogue(ROOT / 'quotes/quotes.zh-CN.csv')}
        self.assertIn('中午12点', rows['0000-032']['Quote'])
        source = next(row for row in source_catalogue(ROOT / 'quotes') if row['Id'] == '0000-032')
        self.assertIn('12.00 pm', source['Quote'])

    def test_second_pass_keeps_ages_units_seconds_and_secondary_times(self):
        rows = {r['Id']: r for r in read_catalogue(ROOT / 'quotes/quotes.zh-CN.csv')}
        self.assertIn('16岁', rows['0320-000']['Quote'])
        self.assertIn('9点52分', rows['0925-000']['Quote'])
        self.assertIn('一点十七分零四秒', rows['1317-001']['Quote'])
        self.assertIn('一点十七分四十秒', rows['1317-001']['Quote'])
        self.assertIn('细胞数量降至40万', rows['0810-003']['Quote'])
        self.assertNotIn('零下20', rows['2030-000']['Quote'])
        self.assertIn('2的15次方', rows['2316-001']['Quote'])
        self.assertIn('Y.D.A.U.年4月1日20:10', rows['2010-002']['Quote'])
        self.assertNotIn('1654年', rows['1654-003']['Quote'])
        self.assertEqual(rows['1520-003']['Quote'].count('我正在喝酒'), 9)
        self.assertFalse(is_draft(rows['0000-032']))
        for identifier, row in rows.items():
            self.assertIn(row['Quote time'], row['Quote'], identifier)


if __name__ == '__main__':
    unittest.main()
