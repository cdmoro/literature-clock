import unittest
from audit_translation_quality import clock_phrase, explicit_period


class GreekTimeTests(unittest.TestCase):
    def test_unambiguous_times(self):
        for phrase, expected in [('μία και έντεκα', 71), ('τρεις και εννέα', 189),
                                 ('δέκα παρά πέντε', 595), ('πέντε παρά δέκα', 290),
                                 ('Οκτώ παρά επτά', 473), ('δύο και τριάντα τέσσερα', 154),
                                 ('μεσάνυχτα και μισή', 30), ('ένα λεπτό μετά τα μεσάνυχτα', 1),
                                 ('δέκα λεπτά πριν το μεσημέρι', 710), ('έντεκα και τρία τέταρτα', 705),
                                 ('14:24', 144), ('0005h.', 5), ('δύο-σαράντα-δύο', 162),
                                 ('τρεις και ένα λεπτό', 181), ('23:11 μ.μ.', 671)]:
            with self.subTest(phrase=phrase):
                self.assertEqual(clock_phrase(phrase, 'el'), expected)

    def test_context_and_invalid_times_remain_unparsed(self):
        for phrase in ['περίπου στις τρεις', 'σχεδόν επτά και είκοσι πέντε',
                       'μεταξύ έντεκα και δεκαπέντε και έντεκα και δεκαέξι',
                       'σε πέντε λεπτά θα ήταν επτά και τέταρτο', '24:00', '3:60',
                       'πέντε και δώδεκα λεπτά και έξι δευτερόλεπτα']:
            self.assertIsNone(clock_phrase(phrase, 'el'), phrase)

    def test_day_periods(self):
        self.assertEqual(explicit_period('τρεις το πρωί', 'el'), 0)
        self.assertEqual(explicit_period('τρεις μ.μ.', 'el'), 1)
        self.assertIsNone(explicit_period('τρεις', 'el'))
