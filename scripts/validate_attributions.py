"""Validate reviewed attribution localizations against the canonical sources."""
import json
import argparse
from pathlib import Path

from quote_sources import source_catalogue
from validate_translation import ROOT


def reject_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f'duplicate JSON key: {key}')
        result[key] = value
    return result


def load_json(path):
    return json.loads(path.read_text(encoding='utf-8'), object_pairs_hook=reject_duplicate_keys)


def validate(localizations, source_rows, supported_locales):
    errors = []
    authors = {row['Author'] for row in source_rows}
    works = {(row['Author'], row['Title']) for row in source_rows}
    if not isinstance(localizations, dict) or set(localizations) != {'authors', 'works'}:
        return ['Attribution catalogue must contain exactly authors and works']
    if not isinstance(localizations['authors'], dict):
        return ['Attribution catalogue authors must be an object']
    if not isinstance(localizations['works'], dict):
        return ['Attribution catalogue works must be an object']

    def check_forms(forms, label):
        if not isinstance(forms, dict) or not forms:
            errors.append(f'{label}: expected at least one locale mapping')
            return set()
        found = set()
        for locale, entry in forms.items():
            if locale not in supported_locales:
                errors.append(f'{label}: unsupported locale {locale}')
            if isinstance(entry, str):
                if not entry.strip():
                    errors.append(f'{label} ({locale}): localized value must be non-empty')
                found.add(locale)
                continue
            if not isinstance(entry, dict) or set(entry) != {'value', 'sources'}:
                errors.append(f'{label} ({locale}): expected a string or value and sources')
                continue
            if not isinstance(entry['value'], str) or not entry['value'].strip():
                errors.append(f'{label} ({locale}): localized value must be non-empty')
            sources = entry['sources']
            if (not isinstance(sources, list) or
                    any(not isinstance(url, str) or not url.startswith('https://') for url in sources)):
                errors.append(f'{label} ({locale}): sources must be an array of HTTPS sources')
            found.add(locale)
        return found

    author_coverage = {}
    for source_name, forms in localizations['authors'].items():
        if source_name not in authors:
            errors.append(f'Unknown source author: {source_name}')
        author_coverage[source_name] = check_forms(forms, f'author {source_name}')

    work_coverage = {}
    for source_author, titles in localizations['works'].items():
        if not isinstance(titles, dict):
            errors.append(f'Works for {source_author}: expected title mappings')
            continue
        for source_title, forms in titles.items():
            label = f'work {source_author} / {source_title}'
            if (source_author, source_title) not in works:
                errors.append(f'Unknown source work: {source_author} / {source_title}')
            work_coverage[(source_author, source_title)] = check_forms(forms, label)

    return errors, author_coverage, work_coverage


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--locale', help='Show exact coverage and unresolved source entities for one locale')
    parser.add_argument('--show-missing', action='store_true', help='List source-form entities for --locale')
    parser.add_argument('--require-complete', action='store_true',
                        help='Fail if any supported locale lacks an explicit author or work form')
    args = parser.parse_args()
    path = ROOT / 'quotes/attribution-localizations.json'
    translations = load_json(ROOT / 'src/strings/common/translations.json')
    localizations = load_json(path)
    source_rows = source_catalogue(ROOT / 'quotes')
    result = validate(localizations, source_rows, set(translations))
    if isinstance(result, list):
        errors = result
        author_coverage, work_coverage = {}, {}
    else:
        errors, author_coverage, work_coverage = result
    if errors:
        raise SystemExit('\n'.join(errors))

    if args.locale and args.locale not in translations:
        raise SystemExit(f'Unsupported locale: {args.locale}')

    author_count = len({row['Author'] for row in source_rows})
    work_count = len({(row['Author'], row['Title']) for row in source_rows})
    print(f'{len(source_rows)} source quotes; {author_count} normalized authors; {work_count} normalized works.')
    locales = [args.locale] if args.locale else sorted(translations)
    for locale in locales:
        authors_done = sum(locale in values for values in author_coverage.values())
        works_done = sum(locale in values for values in work_coverage.values())
        print(f'{locale}: {authors_done}/{author_count} authors and {works_done}/{work_count} works localized; '
              f'{author_count - authors_done} authors and {work_count - works_done} works use source forms.')
        if args.require_complete:
            missing = []
            if authors_done != author_count:
                missing.append(f'{author_count - authors_done} authors')
            if works_done != work_count:
                missing.append(f'{work_count - works_done} works')
            if missing:
                raise SystemExit(f'{locale}: incomplete explicit localization: {", ".join(missing)}')
    if args.show_missing and not args.locale:
        parser.error('--show-missing requires --locale')
    if args.locale and args.show_missing:
        missing_authors = sorted({row['Author'] for row in source_rows
                                  if args.locale not in author_coverage.get(row['Author'], set())})
        missing_works = sorted({(row['Author'], row['Title']) for row in source_rows
                                if args.locale not in work_coverage.get((row['Author'], row['Title']), set())})
        if missing_authors:
            print('Authors using source form: ' + '; '.join(missing_authors))
        if missing_works:
            print('Works using source form: ' + '; '.join(f'{author} / {title}' for author, title in missing_works))


if __name__ == '__main__':
    main()
