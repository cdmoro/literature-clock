"""Rank quote attribution work by how many published quotes it affects."""
import argparse
from collections import Counter

from attribution_localizations import read_attribution_localizations, attribution_entry
from quote_sources import source_catalogue
from validate_translation import ROOT


def priorities(rows, localizations, locale=None):
    works = Counter((row['Author'], row['Title']) for row in rows)
    authors = Counter(row['Author'] for row in rows)
    if locale:
        authors = Counter({author: count for author, count in authors.items()
                           if attribution_entry(localizations['authors'].get(author, {}), locale) is None})
        works = Counter({work: count for work, count in works.items()
                         if attribution_entry(localizations['works'].get(work[0], {}).get(work[1], {}), locale) is None})
    return authors.most_common(), works.most_common()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--locale', help='Only show entities without a reviewed form for this locale')
    parser.add_argument('--limit', type=int, default=20, help='Maximum number of authors and works (default: 20)')
    args = parser.parse_args()
    if args.limit < 1:
        parser.error('--limit must be positive')
    localizations = read_attribution_localizations(ROOT / 'quotes/attribution-localizations.json')
    rows = source_catalogue(ROOT / 'quotes')
    authors, works = priorities(rows, localizations, args.locale)
    suffix = f' without {args.locale} forms' if args.locale else ''
    print(f'Top authors{suffix} (quote count):')
    for (author, count) in authors[:args.limit]:
        print(f'{count}\t{author}')
    print(f'\nTop works{suffix} (quote count):')
    for ((author, title), count) in works[:args.limit]:
        print(f'{count}\t{author}\t{title}')


if __name__ == '__main__':
    main()
