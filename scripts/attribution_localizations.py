"""Resolve reviewed attribution forms during catalogue generation."""
import json

# Editorial parents, not an inference from BCP 47 or CLDR defaults. Never use
# these to resolve a quote's source language or to substitute passage text.
ATTRIBUTION_PARENTS = {'en-US': 'en-GB', 'pt-BR': 'pt-PT'}


def attribution_locales(supported_locales):
    """Include regional editorial catalogues whose parent is supported.

    An attribution can be reviewed before its quote/UI locale is enabled.
    """
    return set(supported_locales) | {
        locale for locale, parent in ATTRIBUTION_PARENTS.items() if parent in supported_locales
    }


def attribution_entry(forms, locale):
    """Return a regional form or its explicitly configured parent form."""
    entry = forms.get(locale)
    if entry is not None:
        return entry
    parent = ATTRIBUTION_PARENTS.get(locale)
    return forms.get(parent) if parent else None


def read_attribution_localizations(path):
    """Load the reviewed, build-time names used for quote attribution."""
    def unique_pairs(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f'{path}: duplicate JSON key {key}')
            result[key] = value
        return result

    data = json.loads(path.read_text(encoding='utf-8'), object_pairs_hook=unique_pairs)
    if set(data) != {'authors', 'works'}:
        raise ValueError(f'{path}: expected authors and works objects')
    return data


def localized_name(entry, locale):
    """Accept a simple string or a sourced editorial record."""
    if entry is None:
        return None
    if isinstance(entry, str):
        return entry
    if isinstance(entry, dict) and isinstance(entry.get('value'), str):
        return entry['value']
    raise ValueError(f'Invalid attribution localization for {locale}: {entry!r}')


def resolve_attribution(row, locale, source_rows, localizations):
    """Return localized and source forms, resolving author and work independently."""
    source = source_rows.get(row['Id'], row)
    author_source = source['Author']
    title_source = source['Title']
    author = localized_name(attribution_entry(localizations['authors'].get(author_source, {}), locale), locale)
    title = localized_name(
        attribution_entry(localizations['works'].get(author_source, {}).get(title_source, {}), locale), locale)
    return title or title_source, author or author_source, title_source, author_source
