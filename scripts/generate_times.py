"""Generate enabled clock catalogues and URL-only previews with pending rows."""
import json
import shutil
import sys
from collections import Counter, defaultdict
from pathlib import Path

from validate_translation import read_catalogue, is_draft, catalogue_progress


def generate_catalogue(path, output, include_drafts=False):
    rows = read_catalogue(path)
    locale = path.name.split('.')[1]
    include_drafts = include_drafts or path.name.endswith('.draft.csv')
    if include_drafts:
        locale += '-draft'
    folder = output / locale
    if folder.exists():
        shutil.rmtree(folder)
    folder.mkdir(parents=True)
    grouped = defaultdict(list)
    published = []
    for row in rows:
        if (is_draft(row) and not include_drafts) or row['Quote time'].startswith('*'):
            continue
        phrase = row['Quote time']
        if not phrase or phrase not in row['Quote']:
            if include_drafts:
                print(f"Warning: {path}: {row['Id']}: time phrase is missing from quote; "
                      "skipping draft preview row", file=sys.stderr)
                continue
            raise ValueError(f"{path}: {row['Id']}: published time phrase is missing from quote")
        first, last = row['Quote'].split(phrase, 1)
        grouped[row['Time']].append({
            **({'draft': is_draft(row)} if include_drafts else {}),
            'id': row['Id'], 'quote_time_case': phrase, 'quote_first': first,
            'quote_last': last, 'title': row['Title'], 'author': row['Author'], 'sfw': row['SFW'],
        })
        published.append(row)
    for minute, quotes in grouped.items():
        (folder / f"{minute.replace(':', '_')}.json").write_text(
            json.dumps(quotes, indent=4, ensure_ascii=False), encoding='utf-8')
    counts = Counter({minute: len(quotes) for minute, quotes in grouped.items()})
    authors = Counter(row['Author'] for row in published)
    stats = {
        **catalogue_progress(rows), 'times_with_quotes': len(grouped),
        'times_without_quotes': 1440 - len(grouped), 'total': 1440,
        'progress': round(len(grouped) * 100 / 1440, 2),
        'authors': sum(len({q['author'] for q in quotes}) for quotes in grouped.values()),
        'books': sum(len({q['title'] for q in quotes}) for quotes in grouped.values()),
        'top_author_quotes': dict(sorted(authors.items(), key=lambda item: (-item[1], item[0]))[:5]),
        'bottom_time_quotes': dict(sorted(counts.items(), key=lambda item: (item[1], item[0]))[:5]),
        'top_time_quotes': dict(sorted(counts.items(), key=lambda item: (-item[1], item[0]))[:5]),
    }
    (folder / '.statistics.json').write_text(json.dumps(stats, indent=4), encoding='utf-8')
    print(f'{path.name}: {stats["quotes_published"]}/{len(rows)} published, {len(grouped)} minutes')


def main():
    output = Path('public/times')
    suffix = f'.{sys.argv[1]}.csv' if len(sys.argv) == 2 else '.csv'
    if len(sys.argv) == 1 and output.exists():
        shutil.rmtree(output)
    generate_catalogues(Path('quotes'), output,
                        Path('src/strings/translations.json'), suffix)


def generate_catalogues(quotes, output, translations, suffix='.csv'):
    enabled = json.loads(translations.read_text(encoding='utf-8'))
    for path in sorted(quotes.glob(f'*{suffix}')):
        locale = path.name.split('.')[1]
        if path.name.endswith('.draft.csv'):
            # A full catalogue takes precedence over legacy preview-only files.
            if not (quotes / f'quotes.{locale}.csv').exists():
                generate_catalogue(path, output, include_drafts=True)
            continue
        if locale in enabled:
            generate_catalogue(path, output)
        elif (output / locale).exists():
            shutil.rmtree(output / locale)
        if any(is_draft(row) for row in read_catalogue(path)):
            generate_catalogue(path, output, include_drafts=True)
        elif (output / f'{locale}-draft').exists():
            shutil.rmtree(output / f'{locale}-draft')


if __name__ == '__main__':
    main()
