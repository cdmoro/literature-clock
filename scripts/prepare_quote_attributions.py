"""Harvest existing CSV title translations, then normalize quote CSV attributions."""
import argparse
import csv
import json
import os
import tempfile
from collections import Counter, defaultdict
from pathlib import Path

from attribution_localizations import read_attribution_localizations
from quote_sources import source_catalogue
from validate_translation import ROOT, read_catalogue


def harvest_csv_titles(quotes, catalog_path, supported_locales):
    """Move the most common existing localized title into the shared registry."""
    quotes = Path(quotes)
    sources = {row['Id']: row for row in source_catalogue(quotes)}
    catalog = read_attribution_localizations(Path(catalog_path))
    observed = defaultdict(Counter)
    for path in sorted(quotes.glob('quotes.*.csv')):
        locale = path.name[len('quotes.'):-len('.csv')]
        if locale.endswith('.draft') or locale in ('en-GB', 'en-US'):
            continue
        if locale not in supported_locales:
            continue
        for row in read_catalogue(path):
            if row.get('Draft', 'false').lower() == 'true':
                continue
            source = sources.get(row['Id'])
            if source is None:
                raise ValueError(f'{path.name}: no canonical source for {row["Id"]}')
            if row['Title'].strip() and row['Title'] != source['Title']:
                observed[(source['Author'], source['Title'], locale)][row['Title'].strip()] += 1

    added, conflicts = 0, []
    for (author, title, locale), forms in sorted(observed.items()):
        existing = catalog['works'].get(author, {}).get(title, {}).get(locale)
        if existing is not None:
            continue
        # Ties are resolved by lexical order, so repeated runs select the same form.
        selected, count = sorted(forms.items(), key=lambda pair: (-pair[1], pair[0]))[0]
        catalog['works'].setdefault(author, {}).setdefault(title, {})[locale] = selected
        added += 1
        if len(forms) > 1:
            conflicts.append((locale, author, title, selected, count, forms))

    Path(catalog_path).write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n',
                                  encoding='utf-8')
    return added, conflicts


def normalize_csvs(quotes):
    """Set every quote row's Author and Title to its canonical source values."""
    quotes = Path(quotes)
    sources = {row['Id']: row for row in source_catalogue(quotes)}
    prepared = []
    changed = Counter()
    for path in sorted(quotes.glob('quotes.*.csv')):
        rows = read_catalogue(path)
        with path.open(encoding='utf-8', newline='') as stream:
            fieldnames = next(csv.reader(stream, delimiter='|'))
        for row in rows:
            source = sources.get(row['Id'])
            if source is None:
                raise ValueError(f'{path.name}: no canonical source for {row["Id"]}')
            if row['Author'] != source['Author'] or row['Title'] != source['Title']:
                changed[path.name] += 1
            row['Author'], row['Title'] = source['Author'], source['Title']
        with tempfile.NamedTemporaryFile('w', encoding='utf-8', newline='',
                                         dir=path.parent, delete=False) as stream:
            temporary = Path(stream.name)
            writer = csv.DictWriter(stream, fieldnames=fieldnames, delimiter='|',
                                    lineterminator='\n')
            writer.writeheader()
            writer.writerows(rows)
        prepared.append((path, temporary))

    # All inputs are validated and serialized before replacing any source CSV.
    try:
        for path, temporary in prepared:
            os.replace(temporary, path)
    finally:
        for _, temporary in prepared:
            temporary.unlink(missing_ok=True)
    return changed


def testable_normalize_csvs(quotes):
    """Kept as an alias for older local maintenance notes; use normalize_csvs."""
    return normalize_csvs(quotes)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--harvest', action='store_true',
                        help='import existing non-English CSV title forms into the attribution registry')
    parser.add_argument('--normalize', action='store_true',
                        help='replace CSV Author and Title values with canonical source forms')
    parser.add_argument('--quotes', type=Path, default=ROOT / 'quotes')
    parser.add_argument('--catalog', type=Path, default=ROOT / 'quotes/attribution-localizations.json')
    args = parser.parse_args()
    if not args.harvest and not args.normalize:
        parser.error('choose --harvest, --normalize, or both')
    if args.harvest:
        locales = set(json.loads((ROOT / 'src/strings/common/translations.json').read_text(encoding='utf-8')))
        added, conflicts = harvest_csv_titles(args.quotes, args.catalog, locales)
        print(f'Added {added} localized title forms from the quote CSVs.')
        print(f'{len(conflicts)} locale/work pairs had inconsistent CSV variants; selected the majority form.')
        for locale, author, title, selected, count, forms in conflicts:
            print(f'{locale}: {author} / {title}: {selected!r} ({count}/{sum(forms.values())})')
    if args.normalize:
        changed = normalize_csvs(args.quotes)
        print('Canonicalized attribution columns in quote CSVs:')
        for name, count in sorted(changed.items()):
            print(f'  {name}: {count} rows')


if __name__ == '__main__':
    main()
