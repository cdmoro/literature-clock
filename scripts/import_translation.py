"""Import a complete external translation as an unapproved catalogue."""
import argparse
import csv
from collections import Counter
from pathlib import Path

from validate_translation import FIELDS, ROOT, read_catalogue, validate


def import_translation(source_path, translated_path, output):
    source = read_catalogue(source_path)
    translated = read_catalogue(translated_path)
    source_ids = Counter(row['Id'] for row in source)
    if any(count != 1 for count in source_ids.values()) or source_ids != Counter(
            row['Id'] for row in translated):
        raise ValueError('Translation must contain every source ID exactly once.')
    by_id = {row['Id']: row for row in translated}
    rows = [{**original,
             **{field: by_id[original['Id']][field] for field in ('Quote', 'Quote time', 'Title')},
             'Draft': 'true'} for original in source]
    errors = validate(source, rows)
    if errors:
        raise ValueError('\n'.join(errors))
    with Path(output).open('x', encoding='utf-8', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=FIELDS + ['Draft'], delimiter='|')
        writer.writeheader()
        writer.writerows(rows)
    unresolved = sum(not row['Quote time'] or row['Quote time'].startswith('*')
                     or row['Quote time'] not in row['Quote'] for row in rows)
    return len(rows), unresolved


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('translation', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--source', type=Path, default=ROOT / 'quotes/quotes.en-GB.csv')
    args = parser.parse_args()
    try:
        total, unresolved = import_translation(args.source, args.translation, args.output)
    except (OSError, ValueError) as error:
        parser.exit(1, f'{error}\n')
    print(f'Imported {total} pending quotes; {unresolved} time highlights need correction. '
          'All quotes still require language and time review.')


if __name__ == '__main__':
    main()
