"""Generate the Web and Mac quote detail index from published source rows."""
import argparse
import json
from pathlib import Path
from urllib.parse import urlsplit

from quote_sources import resolve_locale, source_catalogue, source_language

ROOT = Path(__file__).resolve().parents[1]
WEB_DIRECTORY = ROOT / 'public/quote-details'


def check_links(links, where):
    if not isinstance(links, dict):
        raise ValueError(f'{where}: expected a language-to-URL map')
    for locale, url in links.items():
        source_language(locale)
        parsed = urlsplit(url)
        if parsed.scheme != 'https' or not parsed.hostname or parsed.username is not None:
            raise ValueError(f'{where}: expected a public HTTPS URL for {locale}')


def build_index(directory, enabled_locales):
    rows = source_catalogue(directory)
    authors = {row['Author'] for row in rows}
    works = {(row['Author'], row['Title']) for row in rows}
    ids = {row['Id'] for row in rows}
    references = json.loads((directory / 'quote-details.json').read_text(encoding='utf-8'))
    for author, links in references['authors'].items():
        if author not in authors:
            raise ValueError(f'Unknown quote details author: {author}')
        check_links(links, author)
    for author, titles in references['works'].items():
        for title, links in titles.items():
            if (author, title) not in works or set(links) - {'about', 'read'}:
                raise ValueError(f'Invalid quote details work: {author} / {title}')
            for kind, urls in links.items():
                check_links(urls, f'{author} / {title} / {kind}')
    for identifier, links in references['passages'].items():
        if identifier not in ids:
            raise ValueError(f'Unknown quote details passage: {identifier}')
        check_links(links, identifier)

    catalogues = {
        path.name.split('.')[1] for path in directory.glob('quotes.*.csv')
        if not path.name.endswith('.draft.csv')
    }
    result = {}
    for row in rows:
        identifier, author, title = row['Id'], row['Author'], row['Title']
        source = resolve_locale(row['Source locale'], catalogues)
        entry = {}
        if source in enabled_locales and not row['Quote time'].startswith('*'):
            entry.update(locale=source, time=row['Time'])
        work = references['works'].get(author, {}).get(title, {})
        for kind, links in (
            ('author', references['authors'].get(author)),
            ('work', work.get('about')),
            ('read', work.get('read')),
            ('passage', references['passages'].get(identifier)),
        ):
            if links:
                entry[kind] = links
        if entry:
            result[identifier] = entry
    return result


def write_index(output, details):
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(''.join([
        '{\n', ',\n'.join(f'  {json.dumps(key)}: {json.dumps(value, ensure_ascii=False, separators=(",", ":"))}'
                         for key, value in details.items()), '\n}\n',
    ]), encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path, nargs='?', help='Write a single index for the macOS bundle')
    output = parser.parse_args().output
    enabled = json.loads((ROOT / 'src/strings/common/translations.json').read_text(encoding='utf-8'))
    details = build_index(ROOT / 'quotes', enabled)
    if output is not None:
        write_index(output, details)
        print(f'{len(details)} quote details → {output}')
        return

    by_hour = {f'{hour:02d}': {} for hour in range(24)}
    for identifier, entry in details.items():
        # Use the stable ID prefix because the catalogue time can change.
        by_hour.get(identifier[:2], by_hour['00'])[identifier] = entry
    for hour, entries in by_hour.items():
        write_index(WEB_DIRECTORY / f'{hour}.json', entries)
    (WEB_DIRECTORY / 'index.json').unlink(missing_ok=True)
    print(f'{len(details)} quote details in {len(by_hour)} files → {WEB_DIRECTORY}')


if __name__ == '__main__':
    main()
