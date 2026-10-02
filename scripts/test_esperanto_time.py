import unittest

from audit_translation_quality import clock_phrase, explicit_period


class EsperantoTimeTests(unittest.TestCase):
    def test_hours_minutes_and_inflections(self):
        for phrase, expected in [
            ('noktomezo', 0), ('tagmeze', 0), ('la dekunua horo', 660),
            ('dek-dua', 0), ('dek kvin', 180), ('kvin', 300),
            ('je la tria kaj dek kvin', 195), ('la sepa kaj duono', 450),
            ('kvarono antaŭ la naŭa', 525), ('duono post la dekdua', 30),
            ('kvin minutojn antaŭ la unua', 55), ('dek du minutoj post la tria', 192),
            ('kvardek kvar minutojn post la deka', 644),
            ('la deka kaj naŭ minutoj', 609), ('01:16 atm.', 76),
            ('23:13', 673), ('2010h.', 490), ('9-a horo matene', 540),
        ]:
            with self.subTest(phrase=phrase):
                self.assertEqual(clock_phrase(phrase, 'eo'), expected)

    def test_ambiguous_and_contextual_forms_stay_unparsed(self):
        for phrase in [
            'duono de la naŭa', 'kvarono de la unua', 'ĉirkaŭ la tria',
            'preskaŭ noktomezo', 'inter la oka kaj la naŭa',
            'dek minutoj', 'la tria post dek du minutoj',
            'post du horoj estos la sepa', '3:60', '24:00',
            '22:12:30-40h.', 'du minutoj kaj kvar sekundoj post la tria',
        ]:
            with self.subTest(phrase=phrase):
                self.assertIsNone(clock_phrase(phrase, 'eo'))

    def test_explicit_periods_do_not_infer_night_or_unmarked_times(self):
        for phrase, expected in [('noktomezo', 0), ('tagmezo', 1),
                                 ('tria matene', 0), ('tria atm.', 0),
                                 ('tria posttagmeze', 1), ('tria ptm.', 1),
                                 ('tria vespere', 1), ('tria nokte', None),
                                 ('tria', None)]:
            with self.subTest(phrase=phrase):
                self.assertEqual(explicit_period(phrase, 'eo'), expected)
