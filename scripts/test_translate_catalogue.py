import copy
import json
import subprocess
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path

from translate_catalogue import (PacedTranslator, TranslationStopped, export_review,
                                 load_state, pilot_rows, progress, run_batches, translate_rows)


class BatchTranslationTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / 'state.json'
        self.rows = [{'Time': '07:30', 'Id': '0730-000', 'Quote time': 'half past seven',
                      'Quote': 'It was half past seven.', 'Title': 'Book',
                      'Author': 'Author', 'SFW': 'sfw'}]
        self.state = load_state(self.path, self.rows, 'el')
        self.now = 10000
        self.calls = []

    def sleep(self, duration):
        self.now += duration

    def translator(self, request):
        return PacedTranslator(self.state, self.path, 'el', 4, request,
                               lambda: self.now, self.sleep)

    def request(self, text, target):
        self.calls.append((text, self.now))
        return {'It was half past seven.': 'Ήταν επτά και μισή.',
                'Book': 'Βιβλίο', 'half past seven': 'επτά και μισή'}[text]

    def test_paces_successful_requests_and_reuses_cached_title(self):
        translator = self.translator(self.request)
        translator.translate('Book')
        translator.translate('half past seven')
        translator.translate('Book')
        self.assertEqual(len(self.calls), 2)
        self.assertGreaterEqual(self.calls[1][1] - self.calls[0][1], 4)
        resumed = load_state(self.path, self.rows, 'el')
        self.assertEqual(resumed['cache']['Book'], 'Βιβλίο')

    def test_delay_also_applies_after_a_slow_successful_response(self):
        def slow(text, target):
            result = self.request(text, target)
            self.now += 10
            return result
        translator = self.translator(slow)
        translator.translate('Book')
        translator.translate('half past seven')
        self.assertEqual(self.calls[1][1] - self.calls[0][1], 14)

    def test_status_cli_is_read_only_and_makes_no_requests(self):
        checkpoint = self.path.with_name('unused.json')
        script = Path(__file__).with_name('translate_catalogue.py')
        result = subprocess.run([sys.executable, str(script), '--target', 'ja',
                                 '--state', str(checkpoint), '--status'],
                                capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('ja: 0/', result.stdout)
        self.assertFalse(checkpoint.exists())
        self.assertFalse(checkpoint.with_name('draft-review.json').exists())

    def test_stops_on_429_without_retry_and_persists_cooldown(self):
        def blocked(text, target):
            self.calls.append(text)
            raise urllib.error.HTTPError('test', 429, 'Limited', {'Retry-After': '7200'}, None)
        translator = self.translator(blocked)
        with self.assertRaises(TranslationStopped):
            translator.translate('Book')
        with self.assertRaises(TranslationStopped):
            translator.translate('Book')
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(load_state(self.path, self.rows, 'el')['blocked_until'], 17200)
        self.assertEqual(self.state['cache'], {})

    def test_retries_transient_errors_but_never_stores_failure_text(self):
        def failing(text, target):
            self.calls.append(text)
            raise urllib.error.URLError('timeout')
        with self.assertRaises(TranslationStopped):
            self.translator(failing).translate('Book')
        self.assertEqual(len(self.calls), 3)
        self.assertEqual(self.state['cache'], {})

    def test_resume_skips_complete_rows(self):
        translator = self.translator(self.request)
        self.assertEqual(translate_rows(self.rows, self.state, self.path, translator, 25), 1)
        self.assertFalse(self.state['rows']['0730-000']['approved'])
        self.assertEqual(self.state['rows']['0730-000']['issues'], [])
        self.assertEqual(translate_rows(self.rows, self.state, self.path, translator, 25), 0)
        self.assertEqual(len(self.calls), 3)

    def test_missing_time_is_pending_not_inserted_into_quote(self):
        def request(text, target):
            return '7:30' if text == 'half past seven' else self.request(text, target)
        translate_rows(self.rows, self.state, self.path, self.translator(request), 1)
        row = self.state['rows']['0730-000']
        self.assertEqual(row['translation']['Quote'], 'Ήταν επτά και μισή.')
        self.assertEqual(row['translation']['Quote time'], '')
        self.assertTrue(row['issues'])

    def test_resume_recovers_requests_from_an_interrupted_row(self):
        def interrupted(text, target):
            if text == 'half past seven':
                raise TranslationStopped('Interrupted')
            return self.request(text, target)
        with self.assertRaises(TranslationStopped):
            translate_rows(self.rows, self.state, self.path, self.translator(interrupted), 1)
        self.assertEqual(self.state['rows'], {})
        self.state = load_state(self.path, self.rows, 'el')
        translate_rows(self.rows, self.state, self.path, self.translator(self.request), 1)
        self.assertEqual([text for text, _ in self.calls],
                         ['It was half past seven.', 'Book', 'half past seven'])

    def test_changed_source_only_invalidates_affected_ids(self):
        translate_rows(self.rows, self.state, self.path, self.translator(self.request), 1)
        changed = copy.deepcopy(self.rows)
        changed[0]['Quote'] += ' Changed.'
        reconciled = load_state(self.path, changed, 'el')
        self.assertEqual(reconciled['rows'], {})
        self.assertEqual(len(reconciled['obsolete_rows']), 1)
        self.assertIn('Book', reconciled['cache'])
        self.assertEqual(progress(changed, reconciled)['pending_ids'], ['0730-000'])
        with self.assertRaises(ValueError):
            load_state(self.path, self.rows, 'ja')

    def test_added_source_id_keeps_existing_translations(self):
        translate_rows(self.rows, self.state, self.path, self.translator(self.request), 1)
        extended = self.rows + [{**self.rows[0], 'Id': '0730-001'}]
        reconciled = load_state(self.path, extended, 'el')
        self.assertEqual(list(reconciled['rows']), ['0730-000'])
        self.assertEqual(progress(extended, reconciled)['pending_ids'], ['0730-001'])

    def test_all_batches_complete_then_resume_without_requests(self):
        rows = [{**self.rows[0], 'Id': f'0730-{index:03}'} for index in range(5)]
        pauses = []
        translator = self.translator(self.request)
        self.assertEqual(run_batches(rows, self.state, self.path, translator,
                                     batch_size=2, until_complete=True, batch_pause=15,
                                     sleep=pauses.append), 5)
        self.assertEqual(pauses, [15, 15])
        self.assertEqual(len(self.calls), 3)
        self.assertTrue(progress(rows, self.state)['translation_complete'])
        self.assertEqual(run_batches(rows, self.state, self.path, translator,
                                     until_complete=True, sleep=pauses.append), 0)
        self.assertEqual(len(self.calls), 3)
        saved = json.loads(self.path.with_name('progress.json').read_text())
        self.assertEqual(saved['pending_ids'], [])
        self.assertTrue(saved['review_required'])

    def test_blocked_run_saves_partial_progress_and_missing_ids(self):
        def blocked(text, target):
            if text == 'Book':
                raise urllib.error.HTTPError('test', 429, 'Limited', {}, None)
            return self.request(text, target)
        with self.assertRaises(TranslationStopped):
            run_batches(self.rows, self.state, self.path, self.translator(blocked),
                        until_complete=True)
        saved = json.loads(self.path.with_name('progress.json').read_text())
        self.assertEqual(saved['pending_ids'], ['0730-000'])
        self.assertEqual(saved['partial_ids'], ['0730-000'])
        self.assertFalse(saved['translation_complete'])

    def test_translated_draft_can_still_need_time_review(self):
        def request(text, target):
            return '7:30' if text == 'half past seven' else self.request(text, target)
        translate_rows(self.rows, self.state, self.path, self.translator(request), 1)
        report = progress(self.rows, self.state)
        self.assertTrue(report['translation_complete'])
        self.assertEqual(report['pending_ids'], [])
        self.assertEqual(report['unresolved_time_ids'], ['0730-000'])
        self.assertTrue(report['review_required'])

    def test_incomplete_row_id_is_not_mistaken_for_finished_translation(self):
        self.state['rows']['0730-000'] = {'source': self.rows[0], 'translation': {}}
        self.assertEqual(progress(self.rows, self.state)['pending'], 1)
        translate_rows(self.rows, self.state, self.path, self.translator(self.request), 1)
        self.assertTrue(progress(self.rows, self.state)['translation_complete'])

    def test_export_requires_review_and_preserves_pipe_csv(self):
        translate_rows(self.rows, self.state, self.path, self.translator(self.request), 1)
        entries = list(self.state['rows'].values())
        review = self.path.with_name('review.json')
        output = self.path.with_name('greek.csv')
        review.write_text(json.dumps(entries, ensure_ascii=False))
        with self.assertRaises(ValueError):
            export_review(review, self.rows, output)
        entries[0]['approved'] = True
        review.write_text(json.dumps(entries, ensure_ascii=False))
        export_review(review, self.rows, output)
        self.assertIn('Time|Id|Quote time|Quote|Title|Author|SFW', output.read_text())
        self.assertIn('07:30|0730-000|επτά και μισή', output.read_text())
        with self.assertRaises(ValueError):
            export_review(review, self.rows, output)

    def test_pilot_selects_unique_rows(self):
        self.assertEqual(pilot_rows(self.rows, 25), self.rows)


if __name__ == '__main__':
    unittest.main()
