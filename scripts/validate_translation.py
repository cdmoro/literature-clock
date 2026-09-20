"""Read-only structural checks for a catalogue translated from British English.

These checks do not evaluate linguistic quality or the meaning of a time phrase.
Usage: python3 scripts/validate_translation.py quotes/quotes.el-GR.csv
"""
import argparse
import csv
import re
from collections import Counter
from pathlib import Path

FIELDS = ['Time', 'Id', 'Quote time', 'Quote', 'Title', 'Author', 'SFW']
ROOT = Path(__file__).resolve().parents[1]


def is_draft(row):
    """Legacy catalogues are published; an explicit Draft must be true or false."""
    value = str(row.get('Draft', 'false')).strip().lower()
    if value not in ('true', 'false'):
        raise ValueError(f"{row.get('Id', '?')}: Draft must be true or false")
    return value == 'true'


def catalogue_progress(rows):
    published = [row for row in rows if not is_draft(row)]
    return {'quotes_total': len(rows), 'quotes_published': len(published),
            'quotes_draft': len(rows) - len(published),
            'publication_progress': round(100 * len(published) / len(rows), 2) if rows else 0}


def read_catalogue(path):
    with Path(path).open(encoding='utf-8', newline='') as stream:
        reader = csv.DictReader(stream, delimiter='|')
        if reader.fieldnames not in (FIELDS, FIELDS + ['Draft']):
            raise ValueError(f'{path}: unexpected CSV columns')
        rows = list(reader)
    if any(None in row or any(value is None for value in row.values()) for row in rows):
        raise ValueError(f'{path}: malformed CSV row')
    for row in rows:
        is_draft(row)
    return rows


def validate(source, translated):
    errors = []
    source_ids = Counter(row['Id'] for row in source)
    target_ids = Counter(row['Id'] for row in translated)
    if any(count != 1 for count in source_ids.values()):
        errors.append('Source contains duplicate IDs')
    if source_ids != target_ids:
        errors.append('Translated IDs must match the source exactly, with no missing or duplicate rows')
    originals = {row['Id']: row for row in source}
    for row in translated:
        label = row['Id']
        original = originals.get(label)
        if original is None:
            continue
        for field in ('Time', 'Author', 'SFW'):
            if row[field] != original[field]:
                errors.append(f'{label}: {field} differs from the source')
        if is_draft(row):
            continue
        for field in ('Quote', 'Title', 'Quote time'):
            if not row[field].strip():
                errors.append(f'{label}: empty {field}')
        phrase = row['Quote time']
        if phrase.startswith('*') or not phrase or phrase not in row['Quote']:
            errors.append(f'{label}: time phrase is missing from the translated quote')
        if any(marker in row['Quote'] for marker in ('<time>', '</time>', '⟦', '⟧', 'NO TRANSLATED', '\ufffd')):
            errors.append(f'{label}: unresolved translation marker')
        # Preserve the source formatting rather than silently discarding paragraphs/emphasis.
        tags = lambda text: Counter(re.findall(r'</?[^>]+>', text))
        if tags(row['Quote']) != tags(original['Quote']):
            errors.append(f'{label}: HTML formatting differs from the source')
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('target', type=Path)
    parser.add_argument('--source', type=Path, default=ROOT / 'quotes/quotes.en-GB.csv')
    args = parser.parse_args()
    try:
        source = read_catalogue(args.source)
        target = read_catalogue(args.target)
        errors = validate(source, target)
    except (OSError, ValueError) as error:
        parser.exit(1, f'{error}\n')
    if errors:
        parser.exit(1, '\n'.join(errors) + '\n')
    report = catalogue_progress(target)
    print(f"{report['quotes_published']}/{report['quotes_total']} published; "
          f"{report['quotes_draft']} drafts ({report['publication_progress']}%).")


if __name__ == '__main__':
    main()
