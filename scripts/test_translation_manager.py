import copy
import csv
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from translate_catalogue import load_state, save
from translation_manager import Project, main
from translation_preview import render
from validate_translation import FIELDS, is_draft, read_catalogue


class TranslationManagerTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'quotes').mkdir()
        self.rows = [dict(Time='07:30', Id='0730-000', Quote='At seven thirty.',
                          Title='Book', Author='Writer', SFW='sfw', **{'Quote time': 'seven thirty'}),
                     dict(Time='08:00', Id='0800-000', Quote='At eight.',
                          Title='Book', Author='Writer', SFW='sfw', **{'Quote time': 'eight'})]
        with (self.root / 'quotes/quotes.en-GB.csv').open('w') as stream:
            writer = csv.DictWriter(stream, fieldnames=FIELDS, delimiter='|')
            writer.writeheader()
            writer.writerows(self.rows)
        self.project = Project(self.root, 'fr-FR', 'fr')
        self.project.create()
        self.entries = [dict(source=row.copy(), approved=False,
                             translation={**row, 'Quote': row['Quote'].replace('At', 'Vers')})
                        for row in self.rows]

    def test_create_protects_existing_project_and_catalogue(self):
        before = self.project.catalogue.read_bytes()
        with self.assertRaises(ValueError):
            self.project.create()
        self.assertEqual(before, self.project.catalogue.read_bytes())
        with self.assertRaises(ValueError):
            Project(self.root, '../escape', 'fr')
        with self.assertRaises(ValueError):
            Project(self.root, 'en-GB', 'en')

    def test_create_adopts_legacy_checkpoint_without_modifying_it(self):
        project = Project(self.root, 'fr-CA', 'fr')
        legacy = self.root / '.translation-work/fr/state.json'
        state = load_state(legacy, self.rows, 'fr')
        state['rows'] = {entry['source']['Id']: {**entry, 'time_candidate': entry['source']['Quote time']}
                         for entry in self.entries}
        save(legacy, state)
        before = legacy.read_bytes()
        project.create()
        self.assertEqual(len(project.reviews()), 2)
        self.assertEqual(legacy.read_bytes(), before)
        self.assertTrue(project.state_path.exists())

    def test_sync_does_not_replace_human_corrections_or_approval(self):
        edited = copy.deepcopy(self.entries[0])
        edited['translation']['Title'] = 'Corrected book title'
        edited['approved'] = True
        save(self.project.review_path, [edited])
        synced = self.project.sync_reviews({'rows': {entry['source']['Id']: entry for entry in self.entries}})
        self.assertEqual(synced[0], edited)
        self.assertEqual(len(synced), 2)

    def test_import_partial_review_preserves_other_entries_and_backs_up(self):
        save(self.project.review_path, self.entries)
        incoming = copy.deepcopy(self.entries[:1])
        incoming[0]['approved'] = True
        path = self.root / 'external.json'
        save(path, incoming)
        self.project.import_reviews(path)
        self.assertEqual([row['approved'] for row in self.project.reviews()], [True, False])
        self.assertEqual(len(list((self.project.folder / 'backups').iterdir())), 1)

    def test_import_rejects_bad_approval_and_stale_sources_without_writing(self):
        save(self.project.review_path, self.entries)
        before = self.project.review_path.read_bytes()
        for change in ('time', 'source', 'duplicate', 'approved'):
            incoming = copy.deepcopy(self.entries)
            incoming[0]['approved'] = True
            if change == 'time':
                incoming[0]['translation']['Quote time'] = 'missing'
            elif change == 'source':
                incoming[0]['source']['Title'] = 'Outdated'
            elif change == 'duplicate':
                incoming.append(incoming[0])
            else:
                incoming[0]['approved'] = 'true'
            path = self.root / 'external.json'
            save(path, incoming)
            with self.assertRaises(ValueError):
                self.project.import_reviews(path)
            self.assertEqual(before, self.project.review_path.read_bytes())

    def test_apply_only_approved_and_keep_csv_backup(self):
        self.entries[0]['approved'] = True
        save(self.project.review_path, self.entries)
        original = self.project.catalogue.read_bytes()
        self.project.apply_approved()
        rows = read_catalogue(self.project.catalogue)
        self.assertFalse(is_draft(rows[0]))
        self.assertEqual(rows[0]['Quote'], 'Vers seven thirty.')
        self.assertTrue(is_draft(rows[1]))
        backup = next((self.project.folder / 'backups').iterdir())
        self.assertEqual(backup.read_bytes(), original)

    def test_export_is_separate_and_refuses_overwrite(self):
        save(self.project.review_path, self.entries)
        path = self.root / 'external.json'
        self.assertEqual(self.project.export_reviews(path), 2)
        with self.assertRaises(FileExistsError):
            self.project.export_reviews(path)
        self.assertEqual(json.loads(path.read_text()), self.entries)

    def test_translation_resumes_and_saves_drafts_directly_to_catalogue(self):
        before = self.project.catalogue.read_bytes()
        with patch('translation_manager.PacedTranslator') as factory:
            factory.return_value.translate.side_effect = lambda text: 'Vers ' + text
            self.project.translate(1)
            self.assertEqual(len(self.project.reviews()), 1)
            self.project.translate(1)
            self.assertEqual(len(self.project.reviews()), 2)
            self.project.translate(1)
            self.assertEqual(factory.return_value.translate.call_count, 6)
        self.assertNotEqual(self.project.catalogue.read_bytes(), before)
        self.assertTrue(all(is_draft(row) for row in read_catalogue(self.project.catalogue)))

    def test_each_translation_is_in_csv_before_progress_is_reported(self):
        saved = []
        def progress(identifier):
            row = next(row for row in read_catalogue(self.project.catalogue) if row['Id'] == identifier)
            self.assertTrue(row['Quote'].startswith('Translated '))
            self.assertTrue(is_draft(row))
            saved.append(identifier)
        with patch('translation_manager.PacedTranslator') as factory:
            factory.return_value.translate.side_effect = lambda text: 'Translated ' + text
            self.project.translate(2, on_progress=progress)
        self.assertEqual(saved, [row['Id'] for row in self.rows])

    def test_direct_csv_edits_are_preserved_when_translating_next_batch(self):
        rows = read_catalogue(self.project.catalogue)
        rows[0]['Title'] = 'Manually corrected title'
        self.project.write_catalogue(rows)
        with patch('translation_manager.PacedTranslator') as factory:
            factory.return_value.translate.side_effect = lambda text: 'Translated ' + text
            self.project.translate(2)
            self.assertEqual(factory.return_value.translate.call_count, 3)
        self.assertEqual(read_catalogue(self.project.catalogue)[0]['Title'], 'Manually corrected title')

    def test_interruption_keeps_completed_translations_for_review(self):
        with patch('translation_manager.PacedTranslator') as factory:
            factory.return_value.translate.side_effect = ['At seven thirty.', 'Livre', 'seven thirty', KeyboardInterrupt()]
            with self.assertRaises(KeyboardInterrupt):
                self.project.translate(2)
        self.assertEqual(len(self.project.reviews()), 1)
        self.assertTrue(self.project.state_path.exists())

    def test_preview_shows_drafts_safely_without_generating_public_data(self):
        self.entries[0]['translation']['Quote'] += '<script>alert(1)</script><em>Wait.</em>'
        save(self.project.review_path, self.entries)
        page = render(self.project, 'q=0730-000')
        self.assertIn('Draft · pending review', page)
        self.assertIn('<mark>seven thirty</mark>', page)
        self.assertNotIn('<script>', page)
        self.assertIn('<em>Wait.</em>', page)
        self.assertIn('1 translation ·', page)
        self.assertNotIn('0800-000', page)
        self.assertFalse((self.root / 'public').exists())
        self.assertIn('No translated drafts', render(self.project, 'q=nothing&page=oops'))

    def test_menu_review_and_apply_publish_only_the_approved_quote(self):
        save(self.project.review_path, self.entries)
        with patch('builtins.input', side_effect=['2', '1', '2', '1', '0', '6', '0', '0']), patch('builtins.print'):
            main(self.root)
        self.assertEqual([is_draft(row) for row in read_catalogue(self.project.catalogue)], [False, True])
        self.assertEqual([entry['approved'] for entry in self.project.reviews()], [True, False])

    def test_menu_lists_saved_projects_and_exits_without_network(self):
        with patch('builtins.input', side_effect=['2', '1', '0', '0']), patch('builtins.print') as output:
            main(self.root)
        self.assertTrue(any('fr-FR' in str(call) for call in output.call_args_list))


if __name__ == '__main__':
    unittest.main()
