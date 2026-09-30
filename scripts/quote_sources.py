"""Resolve each quote's reference by ID, independently of the English catalogue."""
import re
from pathlib import Path

from validate_translation import is_draft, read_catalogue

DEFAULT_CATALOGUES = {
    'en': 'en-GB', 'es': 'es-ES', 'pt': 'pt-PT', 'fr': 'fr-FR',
    'it': 'it-IT', 'de': 'de-DE',
}


def source_language(locale):
    if not isinstance(locale, str) or not re.fullmatch(r'[a-z]{2,3}(?:-[A-Z]{2})?', locale):
        raise ValueError(f'Invalid Source locale: {locale!r}; use en or es-AR, for example.')
    return locale.split('-')[0]


def resolve_locale(locale, available):
    language = source_language(locale)
    if locale in available:
        return locale
    default = DEFAULT_CATALOGUES.get(language)
    if default in available:
        return default
    if language in available:
        return language
    candidates = sorted(value for value in available if value.split('-')[0] == language)
    if len(candidates) == 1:
        return candidates[0]
    raise ValueError(f'No unambiguous source catalogue for {locale}; configure its language default.')


def source_catalogue(directory):
    """Union of catalogue IDs; translations may be absent, references may not.

    Same-language versions can differ in punctuation and time notation. Only
    their origin declaration must agree. Legacy external CSVs remain readable.
    """
    catalogues = {}
    declarations = {}
    for path in sorted(Path(directory).glob('quotes.*.csv')):
        locale = path.name[len('quotes.'):-len('.csv')]
        if locale.endswith('.draft'):
            continue
        indexed = {}
        for row in read_catalogue(path, require_source=True):
            identifier = row['Id']
            if identifier in indexed:
                raise ValueError(f'{path.name}: duplicate ID {identifier}')
            indexed[identifier] = row
            origin = row.get('Source locale', 'en')
            if identifier in declarations and declarations[identifier] != origin:
                raise ValueError(f'{identifier}: conflicting Source locale declarations')
            declarations[identifier] = origin
        catalogues[locale] = indexed
    result = []
    for identifier, origin in declarations.items():
        locale = resolve_locale(origin, catalogues)
        row = catalogues[locale].get(identifier)
        if row is None or is_draft(row):
            raise ValueError(f'{identifier}: missing published source in quotes.{locale}.csv ({origin})')
        result.append({key: value for key, value in row.items() if key != 'Draft'})
    return sorted(result, key=lambda row: (row['Time'], row['Id']))


def read_source(path):
    """Repository catalogues use the shared resolver; standalone legacy files work too."""
    path = Path(path)
    if path.parent.name == 'quotes' and path.name.startswith('quotes.') and path.name.endswith('.csv'):
        return source_catalogue(path.parent)
    return read_catalogue(path)


if __name__ == '__main__':
    from validate_translation import ROOT
    import argparse
    import csv
    from validate_translation import FIELDS
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, help='Export resolved passages to a new pipe-delimited CSV')
    args = parser.parse_args()
    rows = source_catalogue(ROOT / 'quotes')
    if args.output:
        with args.output.open('x', encoding='utf-8', newline='') as stream:
            writer = csv.DictWriter(stream, fieldnames=FIELDS, delimiter='|')
            writer.writeheader()
            writer.writerows(rows)
    print(f'{len(rows)} quote sources resolved; origin declarations agree across catalogues.')
