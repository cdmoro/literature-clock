import csv
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from add_quote import add_quote_to_csv
from quote_sources import resolve_locale, source_catalogue, source_language
from translate_catalogue import PacedTranslator, load_state, translate_rows
from translation_manager import Project
from validate_translation import FIELDS, read_catalogue, validate


class QuoteSourcesTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.directory = self.root / 'quotes'
        self.directory.mkdir()
        self.spanish = {'Id': '0730-000', 'Time': '07:30', 'Quote': 'Eran las siete y media.',
                        'Quote time': 'siete y media', 'Title': 'Libro', 'Author': 'Autor',
                        'SFW': 'true', 'Source locale': 'es-AR'}

    def write(self, locale, rows):
        path = self.directory / f'quotes.{locale}.csv'
        with path.open('w', newline='') as stream:
            writer = csv.DictWriter(stream, fieldnames=FIELDS + ['Draft'], delimiter='|')
            writer.writeheader()
            writer.writerows({**row, 'Draft': row.get('Draft', 'false')} for row in rows)
        return path

    def test_general_regional_exact_and_ambiguous_locales(self):
        self.assertEqual(resolve_locale('es-AR', ['es-ES', 'en-GB']), 'es-ES')
        self.assertEqual(resolve_locale('es', ['es-ES']), 'es-ES')
        self.assertEqual(resolve_locale('en-US', ['en-US', 'en-GB']), 'en-US')
        self.assertEqual(resolve_locale('en-CA', ['en-US', 'en-GB']), 'en-GB')
        self.assertEqual(resolve_locale('ja', ['ja-JP']), 'ja-JP')
        for locale in ('', '../es', 'es-ar', 'es_AR'):
            with self.assertRaises(ValueError):
                source_language(locale)
        with self.assertRaises(ValueError):
            resolve_locale('zh', ['zh-CN', 'zh-TW'])

    def test_native_spanish_quote_does_not_require_an_english_row(self):
        self.write('es-ES', [self.spanish])
        self.write('en-GB', [])
        self.assertEqual(source_catalogue(self.directory), [self.spanish])
        project = Project(self.root, 'fr-FR', 'fr')
        project.create()
        self.assertEqual(read_catalogue(project.catalogue)[0]['Quote'], self.spanish['Quote'])
        self.assertEqual(project.source(), [self.spanish])

    def test_reference_changes_only_to_existing_published_exact_catalogue(self):
        self.write('es-ES', [self.spanish])
        self.write('es-AR', [])
        with self.assertRaisesRegex(ValueError, 'missing published source'):
            source_catalogue(self.directory)
        self.write('es-AR', [{**self.spanish, 'Draft': 'true'}])
        with self.assertRaisesRegex(ValueError, 'missing published source'):
            source_catalogue(self.directory)
        self.write('es-AR', [{**self.spanish, 'Quote': 'Son las siete y media.'}])
        self.assertEqual(source_catalogue(self.directory)[0]['Quote'], 'Son las siete y media.')

    def test_conflicting_origins_duplicate_ids_and_translation_metadata(self):
        self.write('es-ES', [self.spanish])
        self.write('en-GB', [{**self.spanish, 'Source locale': 'en'}])
        with self.assertRaisesRegex(ValueError, 'conflicting Source locale'):
            source_catalogue(self.directory)
        self.write('en-GB', [self.spanish, self.spanish])
        with self.assertRaisesRegex(ValueError, 'duplicate ID'):
            source_catalogue(self.directory)
        self.assertIn('0730-000: Source locale differs from the source',
                      validate([self.spanish], [{**self.spanish, 'Source locale': 'en'}]))

    def test_provider_receives_source_language_and_cache_is_separated(self):
        path = self.root / 'state.json'
        state = load_state(path, [self.spanish], 'fr')
        calls = []
        def request(text, target, source='en'):
            calls.append((text, target, source))
            return source + ':' + text
        translator = PacedTranslator(state, path, 'fr', delay=0, request=request)
        translator.translate('Libro')
        translate_rows([self.spanish], state, path, translator, 1)
        self.assertEqual([call[2] for call in calls], ['en', 'es', 'es', 'es'])
        self.assertEqual(state['rows']['0730-000']['source'], self.spanish)
        translator.translate('Libro')
        self.assertEqual(len(calls), 4)
        changed = [{**self.spanish, 'Source locale': 'es-CL'}]
        self.assertEqual(load_state(path, changed, 'fr')['rows'], {})

    def test_same_language_keeps_passage_without_provider_calls(self):
        path = self.root / 'state.json'
        state = load_state(path, [self.spanish], 'es')
        with patch('translate_catalogue.google_translate') as request:
            translator = PacedTranslator(state, path, 'es', request=request)
            translate_rows([self.spanish], state, path, translator, 1)
            request.assert_not_called()
        self.assertEqual(state['rows']['0730-000']['translation'], self.spanish)

    def test_reference_edit_remains_reviewable_and_cannot_unpublish_source(self):
        self.write('es-ES', [self.spanish])
        project = Project(self.root, 'es-ES', 'es')
        fields = {'Quote': 'Son las siete y media.', 'Quote time': 'siete y media', 'Title': 'Libro'}
        with self.assertRaisesRegex(ValueError, 'must stay published'):
            project.edit_quote('0730-000', fields, False)
        project.edit_quote('0730-000', fields, True)
        self.assertEqual(project.reviews()[0]['source']['Quote'], fields['Quote'])

    def test_addition_uses_one_unused_id_across_incomplete_catalogues(self):
        self.write('es-ES', [self.spanish])
        self.write('es-AR', [{**self.spanish, 'Id': '0730-003'}])
        identifier = add_quote_to_csv('07:30', self.spanish['Quote'], 'Libro', 'Autor', 'es-AR',
                                      'true', self.spanish['Quote time'], self.directory)
        self.assertEqual(identifier, '0730-004')
        for path in self.directory.glob('*.csv'):
            row = read_catalogue(path)[-1]
            self.assertEqual(row['Id'], identifier)
            self.assertEqual(row['Source locale'], 'es-AR')
            self.assertEqual(row['Quote'], self.spanish['Quote'])


if __name__ == '__main__':
    unittest.main()
