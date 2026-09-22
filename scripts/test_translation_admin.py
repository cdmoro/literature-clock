import json
import unittest
from unittest.mock import patch

import test_translation_manager as fixtures
from translation_admin import Admin, handler_for
from translate_catalogue import save
from validate_translation import read_catalogue, is_draft


class AdminTest(unittest.TestCase):
    def setUp(self):
        fixture = fixtures.TranslationManagerTest()
        fixture.setUp()
        self.addCleanup(fixture.temp.cleanup)
        self.root, self.project, self.rows = fixture.root, fixture.project, fixture.rows
        (self.root / 'src/strings').mkdir(parents=True)
        (self.root / 'src/strings/translations.json').write_text('{"en-GB":{}}')
        self.admin = Admin(self.root)

    def test_new_language_is_hidden_and_web_approval_updates_csv(self):
        self.assertFalse(self.admin.languages()['languages'][0]['enabled'])
        result = self.admin.quotes('fr-FR')
        self.admin.mutate('edit', {'locale': 'fr-FR', 'id': self.rows[0]['Id'],
                                 'fields': {field: self.rows[0][field] for field in ('Quote', 'Title', 'Quote time')},
                                 'approved': True, 'revision': result['revision']})
        self.assertFalse(is_draft(read_catalogue(self.project.catalogue)[0]))
        self.assertEqual(self.admin.quotes('fr-FR', status='approved')['total'], 1)
        self.assertFalse(self.admin.languages()['languages'][0]['enabled'])

    def test_stale_web_form_cannot_overwrite_another_edit(self):
        data = {'locale': 'fr-FR', 'id': self.rows[0]['Id'],
                'fields': {field: self.rows[0][field] for field in ('Quote', 'Title', 'Quote time')},
                'approved': True, 'revision': self.admin.quotes('fr-FR')['revision']}
        self.admin.mutate('edit', data)
        data['fields']['Title'] = 'Stale title'
        with self.assertRaisesRegex(ValueError, 'catalogue changed'):
            self.admin.mutate('edit', data)
        self.assertEqual(read_catalogue(self.project.catalogue)[0]['Title'], 'Book')

    def test_draft_preview_generation_does_not_publish_language(self):
        self.admin.mutate('preview', {'locale': 'fr-FR'})
        path = self.root / 'public/times'
        self.assertTrue((path / 'fr-FR-draft/07_30.json').exists())
        self.assertFalse((path / 'fr-FR').exists())

    def test_quote_search_preserves_newlines_and_blocks_path_traversal(self):
        rows = read_catalogue(self.project.catalogue)
        rows[0]['Quote'] = 'Line one\nAt seven thirty.'
        self.project.write_catalogue(rows)
        self.assertEqual(self.admin.quotes('fr-FR', query='Line one')['rows'][0]['quote']['Quote'], rows[0]['Quote'])
        with self.assertRaises(ValueError):
            self.admin.project('../../outside')

    def test_job_prevents_conflicting_writes_and_can_be_stopped(self):
        self.admin.job['running'] = True
        with self.assertRaisesRegex(ValueError, 'operation is running'):
            self.admin.mutate('edit', {'locale': 'fr-FR'})
        self.admin.mutate('stop', {})
        self.assertTrue(self.admin.cancel.is_set())

    def test_api_requires_server_token(self):
        handler = handler_for(self.admin, 'test-token')
        request = object.__new__(handler)
        request.headers = {}
        self.assertFalse(request.authorized())
        request.headers = {'X-Admin-Token': 'wrong'}
        self.assertFalse(request.authorized())
        request.headers = {'X-Admin-Token': 'test-token'}
        self.assertTrue(request.authorized())

    def test_cancellation_preserves_completed_csv_rows(self):
        import threading
        event = threading.Event()
        with patch('translation_manager.PacedTranslator') as factory:
            calls = []
            def translate(text):
                calls.append(text)
                if len(calls) == 3:
                    event.set()
                return text
            factory.return_value.translate.side_effect = translate
            with self.assertRaisesRegex(Exception, 'stopped'):
                self.project.translate(2, cancel=event)
        self.assertEqual(len(self.project.reviews()), 1)
        self.assertTrue(is_draft(read_catalogue(self.project.catalogue)[0]))

    def test_approval_rejects_missing_time_and_can_be_revoked(self):
        fields = {field: self.rows[0][field] for field in ('Quote', 'Title', 'Quote time')}
        fields['Quote time'] = 'missing'
        with self.assertRaises(ValueError):
            self.project.edit_quote(self.rows[0]['Id'], fields, True)
        fields['Quote time'] = self.rows[0]['Quote time']
        self.project.edit_quote(self.rows[0]['Id'], fields, True)
        fields['Quote'] = 'Incomplete correction'
        self.project.edit_quote(self.rows[0]['Id'], fields, False)
        self.assertTrue(is_draft(read_catalogue(self.project.catalogue)[0]))

class CataloguePRTest(unittest.TestCase):
    setUp = AdminTest.setUp
    # Run the publication flow against a local bare remote; never contact GitHub.
    def test_pr_isolates_only_the_catalogue_and_leaves_checkout_untouched(self):
        import os
        import subprocess
        real_run = subprocess.run
        def run(args, cwd=self.root):
            return real_run(args, cwd=cwd, text=True, capture_output=True, check=True).stdout.strip()
        identity = {'GIT_CONFIG_COUNT': '3', 'GIT_CONFIG_KEY_0': 'user.name', 'GIT_CONFIG_VALUE_0': 'Catalogue test',
                    'GIT_CONFIG_KEY_1': 'user.email', 'GIT_CONFIG_VALUE_1': 'test@example.invalid',
                    'GIT_CONFIG_KEY_2': 'commit.gpgSign', 'GIT_CONFIG_VALUE_2': 'false'}
        with patch.dict(os.environ, identity):
            run(['git', 'init', '-b', 'main'])
            run(['git', 'add', 'quotes', 'src'])
            run(['git', 'commit', '-m', 'Base catalogues'])
            remote = self.root / 'remote.git'
            run(['git', 'clone', '--bare', str(self.root), str(remote)])
            run(['git', 'remote', 'add', 'origin', str(remote)])
            fields = {field: self.rows[0][field] for field in ('Quote', 'Title', 'Quote time')}
            fields['Title'] = 'Reviewed title'
            self.project.edit_quote(self.rows[0]['Id'], fields, True)
            before = self.project.catalogue.read_bytes()
            branch_before = run(['git', 'branch', '--show-current'])
            def local_commands(args, **kwargs):
                if args[0] == 'gh':
                    self.assertEqual(args[1:3], ['pr', 'create'])
                    return subprocess.CompletedProcess(args, 0, 'https://github.com/example/repo/pull/1\n', '')
                return real_run(args, **kwargs)
            with patch('translation_admin.subprocess.run', side_effect=local_commands):
                url = self.admin.create_pr(self.project)
            self.assertEqual(url, 'https://github.com/example/repo/pull/1')
            self.assertEqual(run(['git', 'branch', '--show-current']), branch_before)
            self.assertEqual(self.project.catalogue.read_bytes(), before)
            branch = next(name for name in run(['git', '--git-dir', str(remote), 'branch', '--format=%(refname:short)']).splitlines() if name.startswith('codex/'))
            changed = run(['git', '--git-dir', str(remote), 'diff', '--name-only', 'main', branch])
            self.assertEqual(changed, 'quotes/quotes.fr-FR.csv')


if __name__ == "__main__":
    unittest.main()
