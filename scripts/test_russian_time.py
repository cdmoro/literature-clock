"""Russian hour conventions and conservative rejection of ambiguous excerpts."""
import unittest
from russian_time import clock_phrase


class RussianTimeTest(unittest.TestCase):
    def test_declined_hours_and_relative_times(self):
        cases = {'двух часов': 120, 'половине третьего': 150,
                 'полдесятого': 570, 'четверть восьмого': 435,
                 'без четверти час': 45, 'без двадцати пяти десять': 575,
                 'двадцать две минуты после полуночи': 22,
                 'пять минут второго': 65, 'тридцать две минуты шестого': 332,
                 '23:59': 719, 'полудня': 0, 'полуночной': 0}
        for phrase, expected in cases.items():
            with self.subTest(phrase=phrase):
                self.assertEqual(clock_phrase(phrase), expected)

    def test_context_and_invalid_numeric_times_are_not_guessed(self):
        for phrase in ['без двадцати пяти', 'через четыре минуты',
                       'почти восемь', 'между шестью и семью часами', '25:12', '12:99']:
            with self.subTest(phrase=phrase):
                self.assertIsNone(clock_phrase(phrase))


if __name__ == '__main__':
    unittest.main()
