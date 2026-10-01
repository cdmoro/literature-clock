import unittest
from chinese_time import clock_phrase


class ChineseTimeTest(unittest.TestCase):
    def test_unambiguous_hours_minutes_and_fullwidth_digits(self):
        for phrase, expected in [('中午', 0), ('午夜', 0), ('凌晨三点五十七分', 237),
                                 ('下午两点半', 150), ('九点一刻', 555), ('十一时三刻', 705),
                                 ('八点零五分', 485), ('１２：３０', 30), ('23:59', 719),
                                 ('午夜过后三分钟', 3), ('凌晨 2:52', 172),
                                 ('差七分三点', 173), ('凌晨差七分钟到三点', 173),
                                 ('两点差八分', 112), ('差一刻九点', 525),
                                 ('还有三分钟就到午夜', 717), ('一点零十一分', 71),
                                 ('早上7点过3分', 423), ('离十一点还有一分钟', 659)]:
            with self.subTest(phrase=phrase):
                self.assertEqual(clock_phrase(phrase), expected)

    def test_context_approximations_and_invalid_values_remain_unparsed(self):
        for phrase in ['三', '快到三点', '三点左右', '过了十二点', '二十四点', '三点六十分', '三点多', '差六十一分钟到三点']:
            with self.subTest(phrase=phrase):
                self.assertIsNone(clock_phrase(phrase))


if __name__ == '__main__':
    unittest.main()
