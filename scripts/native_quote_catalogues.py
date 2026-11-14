"""Build the shared native quote payload without favoring either platform."""
import html
import json
import re
from collections import defaultdict
from pathlib import Path

from attribution_localizations import read_attribution_localizations, resolve_attribution
from quote_sources import source_catalogue
from validate_attributions import validate as validate_attribution_localizations
from validate_translation import is_draft, parse_sfw, read_catalogue


def plain(value):
    """Remove source markup before bundling plain-text native quote resources."""
    return html.unescape(re.sub(r'<[^>]+>', '', re.sub(r'<br\s*/?>', '\n', value, flags=re.I)))


def build_native_catalogues(root):
    """Return minute-grouped quote data shared by macOS and Windows builds."""
    root = Path(root)
    enabled = json.loads((root / 'src/strings/common/translations.json').read_text(encoding='utf-8'))
    source_rows = {row['Id']: row for row in source_catalogue(root / 'quotes')}
    localizations = read_attribution_localizations(root / 'quotes/attribution-localizations.json')
    validation = validate_attribution_localizations(localizations, list(source_rows.values()), set(enabled))
    errors = validation if isinstance(validation, list) else validation[0]
    if errors:
        raise ValueError('Invalid attribution localizations:\n' + '\n'.join(errors))

    result = {}
    for locale in enabled:
        grouped = defaultdict(list)
        path = root / f'quotes/quotes.{locale}.csv'
        for row in read_catalogue(path):
            phrase = row['Quote time']
            if is_draft(row) or phrase.startswith('*'):
                continue
            if row['Id'] not in source_rows:
                raise ValueError(f'{locale}: no canonical source attribution for {row["Id"]}')
            if not phrase or phrase not in row['Quote']:
                raise ValueError(f'{locale}: missing highlighted phrase in {row["Id"]}')
            first, last = row['Quote'].split(phrase, 1)
            title, author, original_title, original_author = resolve_attribution(
                row, locale, source_rows, localizations)
            grouped[row['Time']].append(dict(
                id=row['Id'], first=plain(first), time=plain(phrase), last=plain(last),
                title=plain(title), author=plain(author),
                title_original=plain(original_title), author_original=plain(original_author),
                sfw=parse_sfw(row['SFW'], row['Id']),
            ))
        result[locale] = grouped
    return result
