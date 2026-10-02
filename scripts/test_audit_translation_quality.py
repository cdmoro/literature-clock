"""Regression examples from the editorial audit; no catalogue mutation."""
import tempfile
from pathlib import Path
import unittest

from audit_translation_quality import clock_phrase, explicit_period, passage_findings, audit, digit_tokens


class TimePhraseTests(unittest.TestCase):
    def test_digit_script_changes_preserve_values_and_repeated_quantities(self):
        source = digit_tokens('2:36, 1985, 26 seconds, 26 people', 'en')
        self.assertEqual(source, digit_tokens('٢:٣٦، ١٩٨٥، ٢٦ ثانية، ٢٦ شخصًا', 'ar'))
        self.assertEqual(source, digit_tokens('۲:۳۶، ۱۹۸۵، ۲۶، ۲۶', 'ar'))
        self.assertNotEqual(source, digit_tokens('٢:٣٥، ١٩٨٥، ٢٦، ٢٦', 'ar'))
        self.assertNotEqual(source, digit_tokens('٢:٣٦، ١٩٨٥، ٢٦', 'ar'))
        self.assertNotEqual(digit_tokens('01:34', 'en'), digit_tokens('1:34', 'ar'))

    def test_real_time_regressions(self):
        examples = [
            ('en', 'Half-past one', 90), ('en', 'half past one', 90),
            ('de', 'Halb eins', 30), ('de', 'halb zwei', 90),
            ('de', 'halb vier Uhr morgens', 210), ('de', '13:21 Uhr', 81),
            ('en', 'five to nine', 535), ('es', 'cinco menos nueve', 291),
            ('es', 'nueve menos cinco', 535), ('fr', 'neuf heures moins cinq', 535),
            ('en', 'Four minutes after four!', 244), ('fr', 'Quatre heures moins quatre !', 236),
            ('fr', 'une heure et demie', 90), ('en', 'one minute past one', 61),
            ('pt', 'Quarenta para três', 140), ('pt', 'um quarto para as três', 165),
            ('it', 'due e venti minuti', 140), ('it', '22.11', 611),
            ('en', '11.22', 682), ('fr', 'six heures trente', 390),
            ('es', 'las ocho y media', 510), ('pt', 'oito e meia', 510),
        ]
        for lang, phrase, expected in examples:
            with self.subTest(lang=lang, phrase=phrase):
                self.assertEqual(clock_phrase(phrase, lang), expected)

    def test_context_is_not_silently_parsed(self):
        for phrase in ['nearly half past one', 'in five minutes it would be a quarter past seven',
                       'one minute and twenty seconds to five', '25:00', '12:99']:
            self.assertIsNone(clock_phrase(phrase, 'en'))
        self.assertIsNone(clock_phrase('septembre moins vingt-huit', 'fr'))
        self.assertIsNone(clock_phrase('deux minutes moins trois', 'fr'))

    def test_equivalent_digital_notation(self):
        self.assertEqual(clock_phrase('1:21 P.M.', 'en'), clock_phrase('13:21', 'de'))

    def test_explicit_periods(self):
        self.assertEqual(explicit_period('minuit', 'fr'), 0)
        self.assertEqual(explicit_period('midi', 'fr'), 1)
        self.assertIsNone(explicit_period('twelve', 'en'))
        self.assertIsNone(explicit_period('at night', 'en'))

    def test_dialogue_conventions_are_not_translation_errors(self):
        source = {'Source locale': 'es-AR', 'Quote': '—¿Se aburre?<br>—Regular.'}
        for lang, text in [('en', '“Are you bored?”<br>“So-so.”'),
                           ('de', '„Langweilen Sie sich?“<br>„Es geht.“'),
                           ('fr', '« Vous vous ennuyez ? »<br>« Moyennement. »'),
                           ('pt', '— Aborrece-se?<br>— Assim assim.')]:
            with self.subTest(lang=lang):
                self.assertEqual(passage_findings(source, {'Quote': text}, lang), [])

    def test_detects_premature_close_without_rejecting_source_excerpt(self):
        source = {'Source locale': 'en', 'Quote': '“It was awful. It went on and on.”'}
        target = {'Quote': '„Es war schrecklich.“ Es ging immer weiter.“'}
        self.assertEqual(passage_findings(source, target, 'de')[0][0], 'dialogue')
        source['Quote'] = '“An intentionally unfinished excerpt'
        self.assertEqual(passage_findings(source, target, 'de'), [])

    def test_checks_secondary_and_approximate_german_half_hours(self):
        source = {'Source locale': 'en', 'Quote': 'At nine he waited until half-past eleven.'}
        wrong = {'Quote': 'Um neun wartete er bis halb elf.'}
        right = {'Quote': 'Um neun wartete er bis halb zwölf.'}
        self.assertEqual(passage_findings(source, wrong, 'de')[0][0], 'german_half_hour')
        self.assertEqual(passage_findings(source, right, 'de'), [])
        source['Quote'] = 'It was around half past six.'
        self.assertEqual(passage_findings(source, {'Quote': 'Es war ungefähr halb sieben.'}, 'de'), [])

    def test_declared_spanish_source_and_french_six(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            header = 'Time|Id|Quote time|Quote|Title|Author|SFW|Source locale\n'
            samples = {
                'es-ES': '19:30|1930-010|siete y media|siete y media|T|A|true|es-AR\n',
                'en-GB': '19:30|1930-010|half past six|half past six|T|A|true|es-AR\n',
                'fr-FR': '19:30|1930-010|six heures trente|six heures trente|T|A|true|es-AR\n',
            }
            for locale, body in samples.items():
                (root / f'quotes.{locale}.csv').write_text(header + body)
            report = audit(root)
            english = next(f for f in report['findings'] if f['locale'] == 'en-GB')
            self.assertEqual(english['source_time'], 'siete y media')
            self.assertIn('time', [r['category'] for r in english['reasons']])
            # A separate English-origin passage proves French 'six' is not an English residue.
            (root / 'quotes.es-ES.csv').unlink()
            for locale, phrase in [('en-GB', 'six'), ('fr-FR', 'six heures')]:
                (root / f'quotes.{locale}.csv').write_text(header + f'06:00|0600-000|{phrase}|{phrase}|T|A|true|en\n')
            report = audit(root)
            self.assertNotIn('untranslated_time', report['categories'])


if __name__ == '__main__':
    unittest.main()
