import json
import csv
import io
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path

from generate_times import generate_catalogue, generate_catalogues
from translate_catalogue import initialize_catalogue, export_review
from validate_translation import FIELDS, read_catalogue, validate, is_draft
from import_translation import import_translation


class DraftCatalogueTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = [dict(Time='07:30', Id='1', Quote='At seven thirty.',
                            Title='Book', Author='Author', SFW='sfw', **{'Quote time': 'seven thirty'}),
                       dict(Time='08:00', Id='2', Quote='At eight.',
                            Title='Book', Author='Author', SFW='sfw', **{'Quote time': 'eight'})]
        self.catalogue = self.root / 'quotes.el-GR.csv'
        initialize_catalogue(self.source, self.catalogue)

    def test_initialization_preserves_every_original_and_refuses_overwrite(self):
        rows = read_catalogue(self.catalogue)
        self.assertEqual(rows, [{**row, 'Draft': 'true'} for row in self.source])
        with self.assertRaises(FileExistsError):
            initialize_catalogue(self.source, self.catalogue)

    def test_partial_review_merge_and_generation_remove_stale_public_quotes(self):
        review = self.root / 'review.json'
        review.write_text(json.dumps([{'source': self.source[0], 'translation': self.source[0], 'approved': True}]))
        merged = self.root / 'merged' / 'quotes.el-GR.csv'
        export_review(review, self.source, merged, self.catalogue)
        rows = read_catalogue(merged)
        self.assertEqual(validate(self.source, rows), [])
        self.assertEqual([is_draft(row) for row in rows], [False, True])
        output = self.root / 'times'
        generate_catalogue(merged, output)
        folder = output / 'el-GR'
        self.assertTrue((folder / '07_30.json').exists())
        self.assertFalse((folder / '08_00.json').exists())
        stats = json.loads((folder / '.statistics.json').read_text())
        self.assertEqual(stats['publication_progress'], 50)
        self.assertEqual(stats['times_with_quotes'], 1)
        generate_catalogue(self.catalogue, output)
        self.assertFalse((folder / '07_30.json').exists())
        self.assertEqual(json.loads((folder / '.statistics.json').read_text())['progress'], 0)

    def test_drafts_allow_unfinished_text_but_require_ids_and_metadata(self):
        rows = [{**row, 'Draft': 'true', 'Quote time': ''} for row in self.source]
        self.assertEqual(validate(self.source, rows), [])
        self.assertTrue(validate(self.source, rows[:1]))
        rows[0]['Author'] = 'Changed'
        self.assertTrue(validate(self.source, rows))

    def test_invalid_draft_values_fail_closed_and_legacy_rows_are_published(self):
        self.assertFalse(is_draft(self.source[0]))
        for value in ['', 'yes', 'nan']:
            with self.assertRaises(ValueError):
                is_draft({**self.source[0], 'Draft': value})

    def test_export_cannot_hide_invalid_approved_translation_as_draft(self):
        review = self.root / 'review.json'
        review.write_text(json.dumps([{'source': self.source[0], 'approved': True,
            'translation': {**self.source[0], 'Draft': 'true', 'Quote time': 'missing'}}]))
        with self.assertRaises(ValueError):
            export_review(review, self.source, self.root / 'bad.csv', self.catalogue)

    def test_second_batch_preserves_previously_published_rows(self):
        current = self.catalogue
        for index, row in enumerate(self.source):
            review = self.root / f'review-{index}.json'
            review.write_text(json.dumps([{'source': row, 'translation': row, 'approved': True}]))
            next_path = self.root / f'batch-{index}.csv'
            export_review(review, self.source, next_path, current)
            current = next_path
        self.assertEqual([is_draft(row) for row in read_catalogue(current)], [False, False])

    def test_draft_preview_includes_unapproved_rows(self):
        preview = self.root / 'quotes.el-GR.draft.csv'
        initialize_catalogue(self.source, preview)
        generate_catalogue(preview, self.root / 'times')
        folder = self.root / 'times' / 'el-GR-draft'
        self.assertTrue(folder.is_dir())
        self.assertEqual(len(list(folder.glob('[0-9]*.json'))), 2)
        self.assertTrue(json.loads((folder / '07_30.json').read_text())[0]['draft'])

    def test_unregistered_language_is_generated_only_as_draft(self):
        translations = self.root / 'translations.json'
        translations.write_text('{"en-GB": {}}')
        output = self.root / 'times'
        (output / 'el-GR').mkdir(parents=True)
        (output / 'el-GR' / 'stale.json').write_text('[]')
        generate_catalogues(self.root, output, translations)
        self.assertFalse((output / 'el-GR').exists())
        self.assertTrue((output / 'el-GR-draft' / '07_30.json').exists())

    def test_invalid_draft_time_is_skipped_without_breaking_preview(self):
        self.source[0]['Quote time'] = ''
        other = self.root / 'quotes.fr-FR.csv'
        initialize_catalogue(self.source, other)
        output = self.root / 'times'
        generate_catalogue(other, output, include_drafts=True)
        self.assertFalse((output / 'fr-FR-draft' / '07_30.json').exists())
        self.assertTrue((output / 'fr-FR-draft' / '08_00.json').exists())

    def test_approved_catalogue_removes_stale_preview(self):
        translations = self.root / 'translations.json'
        translations.write_text('{"el-GR": {}}')
        output = self.root / 'times'
        generate_catalogues(self.root, output, translations)
        self.assertTrue((output / 'el-GR-draft').exists())
        self.catalogue.write_text(self.catalogue.read_text().replace('|true', '|false'))
        generate_catalogues(self.root, output, translations)
        self.assertTrue((output / 'el-GR' / '07_30.json').exists())
        self.assertFalse((output / 'el-GR-draft').exists())

    def test_invalid_preview_phrases_warn_even_without_draft_column(self):
        for legacy in (True, False):
            for phrase in ('', 'missing'):
                with self.subTest(legacy=legacy, phrase=phrase):
                    path = self.root / ('quotes.fr-FR.draft.csv' if legacy else 'quotes.fr-FR.csv')
                    rows = [{**row, 'Quote time': phrase if index == 0 else row['Quote time']}
                            for index, row in enumerate(self.source)]
                    with path.open('w', newline='') as stream:
                        writer = csv.DictWriter(stream, fieldnames=FIELDS, delimiter='|')
                        writer.writeheader()
                        writer.writerows(rows)
                    warnings = io.StringIO()
                    with redirect_stderr(warnings):
                        generate_catalogue(path, self.root / 'times', include_drafts=not legacy)
                    self.assertIn(f'{path}: 1:', warnings.getvalue())
                    folder = self.root / 'times/fr-FR-draft'
                    self.assertFalse((folder / '07_30.json').exists())
                    self.assertEqual(json.loads((folder / '08_00.json').read_text())[0]['quote_last'], '.')

    def test_published_invalid_phrase_fails_and_asterisk_still_skips(self):
        for phrase in ('missing', '', '*unresolved'):
            with self.subTest(phrase=phrase):
                rows = [{**row, 'Quote time': phrase if index == 0 else row['Quote time']}
                        for index, row in enumerate(self.source)]
                with self.catalogue.open('w', newline='') as stream:
                    writer = csv.DictWriter(stream, fieldnames=FIELDS, delimiter='|')
                    writer.writeheader()
                    writer.writerows(rows)
                if phrase.startswith('*'):
                    generate_catalogue(self.catalogue, self.root / 'times')
                    folder = self.root / 'times/el-GR'
                    self.assertFalse((folder / '07_30.json').exists())
                    self.assertTrue((folder / '08_00.json').exists())
                else:
                    with self.assertRaisesRegex(ValueError, 'published time phrase'):
                        generate_catalogue(self.catalogue, self.root / 'times')

    def test_time_phrase_at_end_produces_empty_string_suffix(self):
        self.catalogue.write_text(self.catalogue.read_text().replace('At seven thirty.', 'At seven thirty'))
        generate_catalogue(self.catalogue, self.root / 'times', include_drafts=True)
        row = json.loads((self.root / 'times/el-GR-draft/07_30.json').read_text())[0]
        self.assertEqual(row['quote_first'], 'At ')
        self.assertEqual(row['quote_last'], '')

    def test_external_import_preserves_text_restores_metadata_and_revokes_approval(self):
        external = self.root / 'external.csv'
        external.write_text(self.catalogue.read_text().replace('Author|sfw|true', 'Translated author|sfw|false')
                            .replace('At seven thirty.', 'Translated quote.'))
        output = self.root / 'imported.csv'
        self.assertEqual(import_translation(self.catalogue, external, output), (2, 1))
        rows = read_catalogue(output)
        self.assertEqual(rows[0]['Quote'], 'Translated quote.')
        self.assertEqual(rows[0]['Author'], 'Author')
        self.assertTrue(all(is_draft(row) for row in rows))
        self.assertEqual(validate(self.source, rows), [])
        with self.assertRaises(FileExistsError):
            import_translation(self.catalogue, external, output)

    def test_external_import_rejects_missing_duplicate_and_unknown_ids(self):
        content = self.catalogue.read_text().splitlines(keepends=True)
        for records in (content[:2], content + [content[1]],
                        [line.replace('|2|', '|999|') for line in content]):
            external = self.root / 'external.csv'
            external.write_text(''.join(records))
            output = self.root / 'invalid.csv'
            with self.assertRaises(ValueError):
                import_translation(self.catalogue, external, output)
            self.assertFalse(output.exists())
