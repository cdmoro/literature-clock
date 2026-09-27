"""Translate resumable drafts with Google Translate; export only reviewed rows.

Uses Google's unofficial public endpoint, as an alternative to googletrans's
legacy client. Availability and request limits are not guaranteed.
All generated rows require language review, including the meaning of the time.
"""
import argparse
import csv
import hashlib
import io
import json
import re
from datetime import datetime, timezone
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from email.utils import parsedate_to_datetime

from validate_translation import FIELDS, ROOT, read_catalogue, validate


class TranslationStopped(Exception):
    pass


def atomic_write(path, text):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + '.tmp')
    temporary.write_text(text, encoding='utf-8')
    temporary.replace(path)


def save(path, state):
    atomic_write(path, json.dumps(state, ensure_ascii=False, indent=2) + '\n')


def source_hash(rows):
    return hashlib.sha256(json.dumps(rows, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def entry_complete(entry, original):
    """A complete draft has all provider responses, not necessarily a valid time."""
    if not isinstance(entry, dict) or entry.get('source') != original:
        return False
    translated = entry.get('translation', {})
    if not isinstance(translated, dict):
        return False
    required = (translated.get('Quote'), translated.get('Title'), entry.get('time_candidate'))
    return (all(isinstance(value, str) and value.strip() and value != 'NO TRANSLATED'
                for value in required)
            and all(isinstance(translated.get(field), str) for field in FIELDS)
            and all(translated[field] == original[field] for field in ('Id', 'Time', 'Author', 'SFW')))


def load_state(path, rows, target):
    expected = {'version': 1, 'source_hash': source_hash(rows), 'target': target}
    if not Path(path).exists():
        return {**expected, 'cache': {}, 'rows': {}, 'last_request': 0, 'blocked_until': 0}
    state = json.loads(Path(path).read_text(encoding='utf-8'))
    if state.get('version') != 1 or state.get('target') != target:
        raise ValueError('State belongs to a different format or target; use a new state file.')
    if not isinstance(state.get('rows'), dict) or not isinstance(state.get('cache'), dict):
        raise ValueError('Invalid state: rows and cache must be objects.')
    originals = {row['Id']: row for row in rows}
    # Reconcile by ID and full source row, not the last processed line number.
    # Keep old drafts as history when a source quote changes or disappears.
    for identifier, entry in list(state['rows'].items()):
        if identifier not in originals or not entry_complete(entry, originals[identifier]):
            state.setdefault('obsolete_rows', []).append({'id': identifier, 'entry': entry})
            del state['rows'][identifier]
    state['source_hash'] = expected['source_hash']
    return state


def progress(rows, state):
    translated = [row for row in rows if entry_complete(state['rows'].get(row['Id']), row)]
    done = {row['Id'] for row in translated}
    pending = [row for row in rows if row['Id'] not in done]
    partial = [row['Id'] for row in pending if any(
        row[field] in state['cache'] for field in ('Quote', 'Title', 'Quote time'))]
    unresolved = [row['Id'] for row in translated
                  if not state['rows'][row['Id']]['translation']['Quote time']]
    structural = [row['Id'] for row in translated if validate(
        [row], [state['rows'][row['Id']]['translation']])]
    return {
        'target': state['target'], 'source_hash': state['source_hash'],
        'total': len(rows), 'translated': len(translated), 'pending': len(pending),
        'translation_complete': not pending,
        'translated_ids': [row['Id'] for row in translated],
        'pending_ids': [row['Id'] for row in pending], 'partial_ids': partial,
        'unresolved_time_ids': unresolved, 'structural_review_ids': structural,
        'blocked_until': state['blocked_until'],
        'review_required': True,
    }


def print_progress(report):
    print(f"{report['target']}: {report['translated']}/{report['total']} drafts translated; "
          f"{report['pending']} pending ({len(report['partial_ids'])} with cached responses).", flush=True)
    print(f"Time highlight unresolved: {len(report['unresolved_time_ids'])}. "
          'All drafts still require language and time review.', flush=True)
    if report['pending_ids']:
        print('Next pending IDs: ' + ', '.join(report['pending_ids'][:10]), flush=True)
    if report['blocked_until'] > time.time():
        until = datetime.fromtimestamp(report['blocked_until'], timezone.utc).isoformat()
        print(f'Google cooldown until {until}.', flush=True)
    if report['translation_complete']:
        print('Draft catalogue complete: no missing source IDs. Review is a separate step.', flush=True)


def write_progress(rows, state, path):
    write_review(state, path.with_name('draft-review.json'))
    report = progress(rows, state)
    atomic_write(path.with_name('progress.json'), json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    return report


def run_batches(rows, state, path, translator, batch_size=25, until_complete=False,
                batch_pause=60, sleep=time.sleep, catalogue_rows=None, on_saved=None):
    completed = 0
    report_rows = rows if catalogue_rows is None else catalogue_rows
    try:
        while progress(rows, state)['pending']:
            count = translate_rows(rows, state, path, translator, batch_size, on_saved=on_saved)
            completed += count
            report = write_progress(report_rows, state, path)
            print_progress(report)
            if not until_complete or not progress(rows, state)['pending']:
                break
            if not count:
                raise TranslationStopped('No progress in this batch; stopped to avoid an endless loop.')
            print(f'Pausing {batch_pause:g} seconds before the next batch.', flush=True)
            remaining = batch_pause
            while remaining > 0:
                duration = min(60, remaining)
                sleep(duration)
                remaining -= duration
    finally:
        write_progress(report_rows, state, path)
    return completed


def google_translate(text, target):
    query = urllib.parse.urlencode({'client': 'gtx', 'sl': 'en', 'tl': target, 'dt': 't', 'q': text})
    request = urllib.request.Request('https://translate.googleapis.com/translate_a/single?' + query)
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.load(response)
    try:
        translated = ''.join(segment[0] for segment in payload[0] if segment[0])
    except (IndexError, TypeError):
        raise TranslationStopped('Google returned an unexpected response.')
    if not translated.strip() or translated == 'NO TRANSLATED':
        raise TranslationStopped('Google returned an empty or invalid translation.')
    return translated


class PacedTranslator:
    def __init__(self, state, path, target, delay=4, request=google_translate,
                 clock=time.time, sleep=time.sleep):
        self.state, self.path, self.target = state, path, target
        self.delay, self.request, self.clock, self.sleep = delay, request, clock, sleep

    def translate(self, text):
        cached = self.state['cache'].get(text)
        if isinstance(cached, str) and cached.strip() and cached != 'NO TRANSLATED':
            return cached
        for attempt in range(3):
            if self.clock() < self.state['blocked_until']:
                raise TranslationStopped('Google cooldown is active; progress has been saved.')
            remaining = self.state['last_request'] + self.delay - self.clock()
            if remaining > 0:
                self.sleep(remaining)
            self.state['last_request'] = self.clock()
            save(self.path, self.state)
            try:
                result = self.request(text, self.target)
            except urllib.error.HTTPError as error:
                if error.code in (403, 429):
                    retry = error.headers.get('Retry-After', '') if error.headers else ''
                    try:
                        seconds = float(retry)
                    except ValueError:
                        try:
                            seconds = parsedate_to_datetime(retry).timestamp() - self.clock()
                        except (ValueError, TypeError, OverflowError):
                            seconds = 3600
                    self.state['blocked_until'] = self.clock() + max(3600, seconds)
                    save(self.path, self.state)
                    raise TranslationStopped(f'Google returned HTTP {error.code}; stopped without retrying. Resume after the cooldown.') from error
                if error.code < 500:
                    raise TranslationStopped(f'Google returned HTTP {error.code}; stopped.') from error
                failure = f'HTTP {error.code}'
            except (urllib.error.URLError, TimeoutError, OSError) as error:
                failure = type(error).__name__
            else:
                self.state['last_request'] = self.clock()
                self.state['cache'][text] = result
                save(self.path, self.state)
                return result
            if attempt < 2:
                self.sleep(5 * (2 ** attempt))
        raise TranslationStopped(f'Translation failed after three attempts ({failure}); progress saved.')


def pilot_rows(rows, count):
    """Choose quotes spread over the day, preferring varied time phrases."""
    chosen, used, phrases = [], set(), set()
    for index in range(min(count, len(rows))):
        minute = index * 1440 // count
        ranked = sorted(rows, key=lambda row: (
            abs(int(row['Time'][:2]) * 60 + int(row['Time'][3:]) - minute),
            row['Quote time'] in phrases,
            -len(row['Quote']),
        ))
        row = next(row for row in ranked if row['Id'] not in used)
        chosen.append(row)
        used.add(row['Id'])
        phrases.add(row['Quote time'])
    return chosen


def translate_rows(rows, state, path, translator, limit, on_saved=None):
    completed = 0
    for original in rows:
        if entry_complete(state['rows'].get(original['Id']), original):
            continue
        if completed >= limit:
            break
        # Translate the complete quote first, preserving sentence context.
        quote = translator.translate(original['Quote'])
        title = translator.translate(original['Title'])
        candidate = translator.translate(original['Quote time'])
        draft = {**original, 'Quote': quote, 'Title': title,
                 'Quote time': candidate if candidate and candidate in quote else ''}
        state['rows'][original['Id']] = {
            'source': original, 'translation': draft, 'time_candidate': candidate,
            'issues': validate([original], [draft]), 'approved': False,
        }
        save(path, state)
        if on_saved:
            on_saved(original, draft)
        completed += 1
        print(f'{original["Id"]}: saved for review ({completed}/{limit})', flush=True)
    return completed


def write_review(state, path):
    """JSON is also the editable review artifact; keep originals beside translations."""
    review = list(state['rows'].values())
    atomic_write(path, json.dumps(review, ensure_ascii=False, indent=2) + '\n')


def export_review(review_path, source, output, catalogue=None):
    reviews = json.loads(Path(review_path).read_text(encoding='utf-8'))
    originals = {row['Id']: row for row in source}
    accepted = []
    seen = set()
    for entry in reviews:
        if entry.get('approved') is not True:
            raise ValueError('Every exported row must be explicitly approved after language and time review.')
        row = {**entry['translation'], 'Draft': 'false'}
        original = originals.get(row['Id'])
        if original is None or row['Id'] in seen or entry['source'] != original:
            raise ValueError('Unknown, duplicate or outdated review row.')
        errors = validate([original], [row])
        if errors:
            raise ValueError('\n'.join(errors))
        seen.add(row['Id'])
        accepted.append(row)
    if not accepted:
        raise ValueError('There are no reviewed translations to export.')
    if Path(output).exists():
        raise ValueError('Output already exists; choose a new path to avoid overwriting a catalogue.')
    approved_count = len(accepted)
    if catalogue is not None:
        existing = read_catalogue(catalogue)
        errors = validate(source, existing)
        if errors:
            raise ValueError('\n'.join(errors))
        updates = {row['Id']: row for row in accepted}
        accepted = [updates.get(row['Id'], {**row, 'Draft': row.get('Draft', 'false')})
                    for row in existing]
    buffer = io.StringIO(newline='')
    writer = csv.DictWriter(buffer, fieldnames=FIELDS + ['Draft'], delimiter='|')
    writer.writeheader()
    writer.writerows(sorted(accepted, key=lambda row: (row['Time'], row['Id'])))
    atomic_write(output, buffer.getvalue())
    print(f'Exported {approved_count} reviewed rows in a {len(accepted)}-row catalogue to {output}')


def initialize_catalogue(source, output):
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation protects existing translations from accidental replacement.
    with output.open('x', encoding='utf-8', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=FIELDS + ['Draft'], delimiter='|')
        writer.writeheader()
        writer.writerows({**row, 'Draft': 'true'} for row in source)
    print(f'Initialized {len(source)} draft quotes in {output}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT / 'quotes/quotes.en-GB.csv')
    parser.add_argument('--target', default='el')
    parser.add_argument('--state', type=Path, help='Default: .translation-work/<target>/state.json')
    parser.add_argument('--batch-size', type=int, default=25)
    parser.add_argument('--delay', type=float, default=4)
    parser.add_argument('--pilot', action='store_true')
    parser.add_argument('--all', action='store_true', help='Continue batches until all source IDs have drafts or the service stops the run')
    parser.add_argument('--batch-pause', type=float, default=60, help='Seconds between batches in --all mode')
    parser.add_argument('--status', action='store_true', help='Show progress without making requests or writing files')
    parser.add_argument('--export-reviewed', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--catalogue', type=Path, help='Merge approved rows into this full catalogue; write to a new --output')
    parser.add_argument('--init-catalogue', type=Path, help='Copy every source row as Draft=true, without network requests')
    args = parser.parse_args()
    if args.batch_size < 1 or not 1 <= args.delay <= 60:
        parser.error('Use a positive batch size and a delay between 1 and 60 seconds.')
    if not re.fullmatch(r'[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*', args.target):
        parser.error('Use a Google language code such as el, ja, ar, nl or zh-CN.')
    if not 0 <= args.batch_pause <= 3600:
        parser.error('--batch-pause must be between 0 and 3600 seconds.')
    if args.pilot and args.all:
        parser.error('--pilot and --all cannot be combined.')
    if args.init_catalogue and (args.status or args.all or args.pilot or args.export_reviewed or args.catalogue or args.output):
        parser.error('--init-catalogue cannot be combined with other modes or output options')
    if args.status and (args.all or args.pilot or args.export_reviewed):
        parser.error('--status cannot be combined with translation or export modes.')
    args.state = args.state or ROOT / '.translation-work' / args.target / 'state.json'
    rows = read_catalogue(args.source)
    if not rows:
        parser.error('The source catalogue is empty.')
    if len({row['Id'] for row in rows}) != len(rows):
        parser.error('Source IDs must be unique.')
    try:
        if args.init_catalogue:
            initialize_catalogue(rows, args.init_catalogue)
            return
        if args.catalogue and not args.export_reviewed:
            parser.error('--catalogue requires --export-reviewed')
        if args.export_reviewed:
            if not args.output:
                parser.error('--export-reviewed requires --output')
            export_review(args.export_reviewed, rows, args.output, args.catalogue)
            return
        state = load_state(args.state, rows, args.target)
        if args.status:
            print_progress(progress(rows, state))
            return
        selection = pilot_rows(rows, args.batch_size) if args.pilot else rows
        save(args.state, state)
        translator = PacedTranslator(state, args.state, args.target, args.delay)
        try:
            count = run_batches(selection, state, args.state, translator,
                                args.batch_size, args.all, args.batch_pause, catalogue_rows=rows)
            print(f'Saved {count} new drafts.', flush=True)
        finally:
            # The final progress file always describes the whole source, even for a pilot.
            report = write_progress(rows, state, args.state)
            print_progress(report)
    except KeyboardInterrupt:
        parser.exit(130, 'Interrupted. Saved progress; run the same command to resume.\n')
    except (ValueError, TranslationStopped, OSError) as error:
        parser.exit(1, f'{error}\n')


if __name__ == '__main__':
    main()
