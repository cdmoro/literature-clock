"""Catalogue regressions for source fidelity, time highlights and dialogue.

These checks cover known regressions, not general literary translation quality.
"""
import re
import unittest

from audit_translation_quality import clock_phrase, passage_findings
from quote_sources import source_catalogue, source_language
from validate_translation import ROOT, read_catalogue, validate


class CatalogueTranslationQualityTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sources = source_catalogue(ROOT / 'quotes')
        cls.source_by_id = {row['Id']: row for row in cls.sources}
        cls.catalogues = {
            path.name.split('.')[1]: {row['Id']: row for row in read_catalogue(path)}
            for path in sorted((ROOT / 'quotes').glob('quotes.*.csv'))
            if not path.name.endswith('.draft.csv')
        }

    def test_catalogues_preserve_metadata_highlights_and_source_markup(self):
        for locale, rows in self.catalogues.items():
            with self.subTest(locale=locale):
                self.assertEqual(validate(self.sources, list(rows.values())), [])

    def test_arabic_drafts_also_keep_visible_highlights_and_source_formatting(self):
        # Draft status must not hide the import's lost highlights and HTML.
        from collections import Counter
        for identifier, row in self.catalogues['ar-AE'].items():
            with self.subTest(identifier=identifier):
                self.assertTrue(row['Quote time'])
                self.assertIn(row['Quote time'], row['Quote'])
                source = self.source_by_id[identifier]
                tags = lambda text: Counter(re.findall(r'</?[^>]+>', text))
                self.assertEqual(tags(row['Quote']), tags(source['Quote']))

    def test_known_time_regressions_match_source_meaning(self):
        examples = {
            'de-DE': ['0130-003', '0330-002', '1930-010'],
            'fr-FR': ['0404-000', '1002-001', '1301-000'],
            'es-ES': ['0753-001', '0855-002', '0955-001'],
            'it-IT': ['0030-000', '0222-000', '1230-000', '2322-002'],
            'pt-PT': ['0245-001', '0345-001', '1445-001'],
            'ar-AE': ['0033-000', '0045-000', '0321-002', '0510-001',
                      '0753-001', '0845-002', '1045-000', '1855-000',
                      '1916-001', '2242-000'],
        }
        for locale, identifiers in examples.items():
            for identifier in identifiers:
                with self.subTest(locale=locale, identifier=identifier):
                    source = self.source_by_id[identifier]
                    expected = clock_phrase(source['Quote time'], source_language(source['Source locale']))
                    actual = clock_phrase(self.catalogues[locale][identifier]['Quote time'], locale[:2])
                    self.assertIsNotNone(expected)
                    self.assertEqual(actual, expected)

    def test_arabic_word_clocks_do_not_drop_minutes_or_change_the_hour(self):
        # Values come from the source wording, never from the assigned Time slot.
        examples = {
            '0008-000': ('eight past midnight', 8),
            '0011-001': ('eleven minutes past midnight', 11),
            '0212-000': ('two twelve A.M.', 2 * 60 + 12),
            '0416-001': ('four sixteen', 4 * 60 + 16),
        }
        for identifier, (source_phrase, expected) in examples.items():
            with self.subTest(identifier=identifier):
                self.assertEqual(self.source_by_id[identifier]['Quote time'], source_phrase)
                translated = self.catalogues['ar-AE'][identifier]
                self.assertEqual(clock_phrase(translated['Quote time'], 'ar'), expected)
                if identifier == '0416-001':
                    # Both occurrences in this passage must remain 4:16.
                    self.assertEqual(translated['Quote'].count('الرابعة وست عشرة دقيقة'), 2)

    def test_arabic_uncertain_times_keep_the_source_comparison_and_range(self):
        examples = {
            '0111-000': ('nearer to one than half past',
                         'أقرب إلى الواحدة منها إلى الواحدة والنصف'),
            '0350-000': ('ten or five to four',
                         'الرابعة إلا عشر دقائق أو خمس دقائق'),
            '0202-000': ('About two. Just past.',
                         'حوالي الثانية. بعد الثانية بقليل.'),
        }
        for identifier, (source_phrase, translated_phrase) in examples.items():
            with self.subTest(identifier=identifier):
                self.assertEqual(self.source_by_id[identifier]['Quote time'], source_phrase)
                self.assertEqual(self.catalogues['ar-AE'][identifier]['Quote time'], translated_phrase)

    def test_spanish_passages_reused_at_other_times_keep_the_same_translation(self):
        for locale, rows in self.catalogues.items():
            for first, second in [('0000-057', '0900-038'), ('1800-031', '2000-029'),
                                  ('0530-008', '1800-032')]:
                with self.subTest(locale=locale, first=first, second=second):
                    self.assertEqual(rows[first]['Quote'], rows[second]['Quote'])
                    self.assertNotEqual(rows[first]['Quote time'], rows[second]['Quote time'])

    def test_character_names_are_not_translated_into_common_nouns(self):
        for locale, rows in self.catalogues.items():
            for identifier, name in [('1400-029', 'Remedios'), ('1900-026', 'Aureliano Triste'),
                                     ('0600-019', 'Tardewski'), ('1430-008', 'Traveler')]:
                with self.subTest(locale=locale, identifier=identifier):
                    if locale == 'ru-RU':
                        localized = {'1400-029': 'Ремедиос', '1900-026': 'Аурелиано Тристе',
                                     '0600-019': 'Тардевск', '1430-008': 'Травелер'}
                        self.assertIn(localized[identifier], rows[identifier]['Quote'])
                    elif locale == 'ar-AE':
                        localized = {'1400-029': 'ريميديوس', '1900-026': 'أوريليانو تريست',
                                     '0600-019': 'تاردوسكي', '1430-008': 'ترافيلر'}
                        self.assertIn(localized[identifier], rows[identifier]['Quote'])
                        if identifier == '1430-008':
                            self.assertIn('المسامير', rows[identifier]['Quote'])
                            self.assertNotIn('المسافر', rows[identifier]['Quote'])
                    elif locale == 'zh-CN':
                        # Chinese transliteration is legitimate; Traveler is retained as a name.
                        if identifier == '1430-008':
                            self.assertIn('Traveler', rows[identifier]['Quote'])
                            self.assertEqual(rows[identifier]['Draft'], 'false')
                        else:
                            localized = {'1400-029': '雷梅', '1900-026': '奥雷利亚诺', '0600-019': '塔德夫斯基'}
                            self.assertIn(localized[identifier], rows[identifier]['Quote'])
                    else:
                        self.assertIn(name, rows[identifier]['Quote'])

    def test_repaired_dialogues_keep_speech_boundaries(self):
        examples = {'de-DE': ['0203-001', '0217-000', '0359-001', '0639-001',
                              '1400-017', '2131-001', '2250-001'],
                    'fr-FR': ['0618-000'], 'en-GB': ['0500-022'], 'en-US': ['0500-022']}
        for locale, identifiers in examples.items():
            for identifier in identifiers:
                with self.subTest(locale=locale, identifier=identifier):
                    findings = passage_findings(self.source_by_id[identifier],
                                                self.catalogues[locale][identifier], locale[:2])
                    self.assertNotIn('dialogue', [category for category, _ in findings])

    def test_german_numeric_time_highlights_use_colons(self):
        for identifier, row in self.catalogues['de-DE'].items():
            with self.subTest(identifier=identifier):
                self.assertIsNone(re.search(r'\b\d{1,2}[.,]\d{2}\b', row['Quote time']))

    def test_correcting_highlight_does_not_replace_other_words_or_other_times(self):
        spanish = self.catalogues['es-ES']['1000-010']['Quote']
        self.assertIn('tendíamos', spanish)
        self.assertIn('tenía', spanish)
        self.assertNotIn('diezdíamos', spanish)
        for identifier in ['0030-000', '1230-000']:
            italian = self.catalogues['it-IT'][identifier]
            self.assertIn('mela di mezzogiorno', italian['Quote'])
            self.assertNotEqual(italian['Quote time'], 'mezzogiorno')


if __name__ == '__main__':
    unittest.main()
