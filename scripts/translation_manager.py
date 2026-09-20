"""Interactive, local catalogue translation and review. Run: npm run translate."""
import copy
import json
import re
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from translate_catalogue import (PacedTranslator, TranslationStopped, atomic_write,
                                 export_review, initialize_catalogue, load_state,
                                 run_batches, save)
from validate_translation import ROOT, catalogue_progress, is_draft, read_catalogue, validate


class Project:
    def __init__(self, root, locale, target):
        if not re.fullmatch(r'[a-z]{2,3}-[A-Z]{2}', locale):
            raise ValueError('Use a full locale such as el-GR, ja-JP or pt-BR.')
        if not re.fullmatch(r'[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*', target):
            raise ValueError('Use a Google language code such as el, ja or zh-CN.')
        if locale == 'en-GB':
            raise ValueError('en-GB is the source catalogue. Choose a target language.')
        self.root, self.locale, self.target = Path(root), locale, target
        self.folder = self.root / '.translation-work' / locale
        self.catalogue = self.root / 'quotes' / f'quotes.{locale}.csv'
        self.state_path = self.folder / 'state.json'
        self.review_path = self.folder / 'review.json'

    def source(self):
        return read_catalogue(self.root / 'quotes' / 'quotes.en-GB.csv')

    def create(self):
        config = self.folder / 'project.json'
        if config.exists():
            raise ValueError('This language already exists in the menu. Choose Resume language.')
        if not self.catalogue.exists():
            initialize_catalogue(self.source(), self.catalogue)
        errors = validate(self.source(), read_catalogue(self.catalogue))
        if errors:
            raise ValueError('\n'.join(errors))
        legacy_state = self.root / '.translation-work' / self.target / 'state.json'
        if not self.state_path.exists() and legacy_state.exists() and legacy_state != self.state_path:
            state = load_state(legacy_state, self.source(), self.target)
            save(self.state_path, state)
            print(f'Copied existing Google translation progress from {legacy_state}.')
        if self.state_path.exists():
            self.sync_reviews(load_state(self.state_path, self.source(), self.target))
        save(config, {'locale': self.locale, 'target': self.target})

    def reviews(self):
        if not self.review_path.exists():
            return []
        return self.check_reviews(json.loads(self.review_path.read_text(encoding='utf-8')))

    def check_reviews(self, reviews):
        if not isinstance(reviews, list):
            raise ValueError('Review file must contain a list of entries.')
        originals = {row['Id']: row for row in self.source()}
        seen = set()
        for entry in reviews:
            if not isinstance(entry, dict) or not isinstance(entry.get('translation'), dict):
                raise ValueError('Malformed review entry.')
            row = entry['translation']
            identifier = row.get('Id')
            if identifier not in originals or identifier in seen or entry.get('source') != originals[identifier]:
                raise ValueError('Unknown, duplicate or outdated review. Check the source before continuing.')
            if type(entry.get('approved')) is not bool:
                raise ValueError('Every review needs a boolean approved field.')
            if any(not isinstance(row.get(field), str) for field in originals[identifier]):
                raise ValueError(f'{identifier}: missing or invalid translation fields.')
            errors = validate([originals[identifier]], [{**row, 'Draft': 'true'}])
            if entry['approved']:
                errors += validate([originals[identifier]], [{**row, 'Draft': 'false'}])
            if errors:
                raise ValueError('\n'.join(errors))
            seen.add(identifier)
        return reviews

    def sync_reviews(self, state):
        # Corrections and approvals live separately from regenerated machine drafts.
        reviews = self.reviews()
        seen = {entry['translation']['Id'] for entry in reviews}
        reviews += [copy.deepcopy(entry) for identifier, entry in state['rows'].items()
                    if identifier not in seen]
        self.check_reviews(reviews)
        save(self.review_path, reviews)
        return reviews

    def translate(self, count=25, request=None):
        rows = self.source()
        catalogue = read_catalogue(self.catalogue)
        errors = validate(rows, catalogue)
        if errors:
            raise ValueError('\n'.join(errors))
        pending = {row['Id'] for row in catalogue if is_draft(row)}
        reviewed = {entry['translation']['Id'] for entry in self.reviews()}
        state = load_state(self.state_path, rows, self.target)
        translator = PacedTranslator(state, self.state_path, self.target,
                                     **({'request': request} if request else {}))
        selection = [row for row in rows if row['Id'] in pending and row['Id'] not in reviewed]
        try:
            run_batches(selection, state, self.state_path, translator,
                        batch_size=count, catalogue_rows=rows)
        finally:
            # Also retain successful rows when interrupted or rate limited.
            self.sync_reviews(state)

    def summary(self):
        report = catalogue_progress(read_catalogue(self.catalogue))
        reviews = self.reviews()
        report['translated'] = len(reviews)
        report['approved'] = sum(entry['approved'] for entry in reviews)
        return report

    def export_reviews(self, path):
        reviews = self.reviews()
        if not reviews:
            raise ValueError('No translations yet. Translate a batch first.')
        with Path(path).open('x', encoding='utf-8') as stream:
            json.dump(reviews, stream, ensure_ascii=False, indent=2)
        return len(reviews)

    def import_reviews(self, path):
        incoming = self.check_reviews(json.loads(Path(path).read_text(encoding='utf-8')))
        current = {entry['translation']['Id']: entry for entry in self.reviews()}
        current.update({entry['translation']['Id']: entry for entry in incoming})
        self.backup(self.review_path)
        save(self.review_path, list(current.values()))
        return len(incoming)

    def backup(self, path):
        if path.exists():
            folder = self.folder / 'backups'
            folder.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')
            shutil.copy2(path, folder / f'{stamp}-{path.name}')

    def apply_approved(self):
        approved = [entry for entry in self.reviews() if entry['approved']]
        if not approved:
            raise ValueError('No approved translations yet.')
        with tempfile.TemporaryDirectory() as directory:
            review = Path(directory) / 'approved.json'
            output = Path(directory) / 'catalogue.csv'
            save(review, approved)
            export_review(review, self.source(), output, self.catalogue)
            self.backup(self.catalogue)
            atomic_write(self.catalogue, output.read_text(encoding='utf-8'))
        return len(approved)


def choose(prompt, options):
    print('\n' + prompt)
    for number, label in enumerate(options, 1):
        print(f'  {number}. {label}')
    print('  0. Back / exit')
    while True:
        value = input('Choose a number: ').strip()
        if value.isdigit() and 0 <= int(value) <= len(options):
            return int(value)
        print('Choose one of the displayed numbers.')


def review_drafts(project):
    entries = project.reviews()
    pending = [entry for entry in entries if not entry['approved']]
    if not pending:
        print('No pending translations. Translate a batch or import a review first.')
        return
    for entry in pending:
        row = entry['translation']
        while True:
            print(f"\n{row['Id']} · {row['Time']}\nOriginal: {entry['source']['Quote']}\n"
                  f"Translation: {row['Quote']}\nTitle: {row['Title']}\nHighlighted time: {row['Quote time']}\n"
                  f"Suggested time: {entry.get('time_candidate', '')}")
            errors = validate([entry['source']], [{**row, 'Draft': 'false'}])
            if errors:
                print('Needs correction: ' + '; '.join(errors))
            choice = choose('Check language, meaning of the time and formatting.',
                            ['Approve after review', 'Edit translation', 'Skip to next quote'])
            if choice == 0:
                return
            if choice == 1:
                if errors:
                    print('Correct the issues before approving.')
                    continue
                entry['approved'] = True
                save(project.review_path, entries)
                break
            if choice == 2:
                project.backup(project.review_path)
                for field in ('Quote', 'Title', 'Quote time'):
                    value = input(f'{field} (Enter keeps current; use <br> for line breaks): ')
                    if value:
                        row[field] = value
                save(project.review_path, entries)
            if choice == 3:
                break


def project_menu(project):
    from translation_preview import Preview
    preview = None
    try:
        while True:
            try:
                report = project.summary()
                print(f"\n{project.locale}: {report['quotes_published']}/{report['quotes_total']} published; "
                      f"{report['quotes_draft']} drafts. Saved translations: {report['translated']}; "
                      f"approved locally: {report['approved']}.")
                choice = choose('Translation workspace', [
                    'Translate the next batch with Google', 'Review / edit draft translations',
                    'Open draft preview in browser (local only)', 'Export review for AI / external editing',
                    'Import reviewed file', 'Apply approved translations to the local CSV'])
                if choice == 0:
                    return
                if choice == 1:
                    count = input('How many quotes? [25]: ').strip() or '25'
                    if not count.isdigit() or not 1 <= int(count) <= 500:
                        raise ValueError('Choose between 1 and 500 quotes.')
                    print('Sending pending text to Google Translate. Ctrl+C stops and saves progress.')
                    project.translate(int(count))
                elif choice == 2:
                    review_drafts(project)
                elif choice == 3:
                    if preview is None:
                        preview = Preview(project)
                    preview.open()
                elif choice == 4:
                    default = project.folder / 'external-review.json'
                    path = Path(input(f'New review file [{default}]: ').strip() or default).expanduser()
                    print(f'Exported {project.export_reviews(path)} entries to {path}.')
                    print('Review the language, time meaning and formatting; edit translation fields and approved.\n'
                          'Keep source, IDs and metadata unchanged. Import this file using option 5.')
                elif choice == 5:
                    path = Path(input('Reviewed JSON file: ').strip()).expanduser()
                    print(f'Imported {project.import_reviews(path)} entries. Previous review backed up.')
                elif choice == 6:
                    print(f'Applied {project.apply_approved()} approved quotes to {project.catalogue}.\n'
                          'Previous CSV backed up. Commit this CSV in a PR to publish; no remote changes made.')
            except KeyboardInterrupt:
                print('\nStopped. Saved progress is available on the next run.')
            except (OSError, ValueError, TranslationStopped) as error:
                print(f'Could not complete this action: {error}')
    finally:
        if preview:
            preview.close()


def main(root=ROOT):
    print('Literature Clock · Translation manager')
    print('Translation, review and preview stay separate from publication.')
    try:
        while True:
            choice = choose('Languages', ['Create / add a language', 'Resume a language'])
            if choice == 0:
                return
            try:
                if choice == 1:
                    locale = input('Language locale (for example el-GR): ').strip()
                    default = locale.split('-')[0]
                    target = input(f'Google language code [{default}]: ').strip() or default
                    project = Project(root, locale, target)
                    project.create()
                else:
                    configs = sorted((Path(root) / '.translation-work').glob('*/project.json'))
                    if not configs:
                        print('No saved language workspaces. Choose Create / add a language.')
                        continue
                    selection = choose('Saved languages', [path.parent.name for path in configs])
                    if not selection:
                        continue
                    config = json.loads(configs[selection - 1].read_text(encoding='utf-8'))
                    project = Project(root, config['locale'], config['target'])
                project_menu(project)
            except (OSError, ValueError, KeyError) as error:
                print(f'Could not open this language: {error}')
    except (EOFError, KeyboardInterrupt):
        print('\nGoodbye. Saved progress is kept.')


if __name__ == '__main__':
    main()
