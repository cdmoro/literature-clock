"""Add passages from a pipe-delimited CSV using the same writer as single additions."""
import argparse
import csv

from add_quote import add_quote_to_csv
from validate_translation import parse_sfw


def process_batch_csv(file_path, language_code=None):
    with open(file_path, newline='', encoding='utf-8') as stream:
        rows = list(csv.DictReader(stream, delimiter='|'))
    from quote_sources import source_language
    for row in rows:
        source_language(row.get('Source locale') or language_code)
        parse_sfw(row['SFW'], row.get('Id', '?'))
    for row in rows:
        identifier = add_quote_to_csv(row['Time'], row['Quote'], row['Title'], row['Author'],
                                     row.get('Source locale') or language_code, row['SFW'], row['Quote time'])
        print(f'Added {identifier}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file')
    parser.add_argument('--source-locale', help='Default for rows without Source locale')
    args = parser.parse_args()
    process_batch_csv(args.file, args.source_locale)
