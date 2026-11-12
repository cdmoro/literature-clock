"""Fill missing attribution catalogue forms from reviewed translation drafts.

Google is used only by this maintenance command. Generated JSON and runtime
consumers use the checked-in static catalogue and never call a translation API.
"""
import argparse
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from attribution_localizations import read_attribution_localizations
from quote_sources import source_catalogue
from validate_translation import ROOT

TARGETS = {
    'ar-AE': 'ar', 'de-DE': 'de', 'el-GR': 'el', 'eo': 'eo',
    'es-ES': 'es', 'fr-FR': 'fr', 'it-IT': 'it', 'ja-JP': 'ja',
    'pt-PT': 'pt', 'ru-RU': 'ru', 'zh-CN': 'zh-CN',
}


def translate_batch(texts, target):
    markers = [f'<<<LCQ{i:05}>>>' for i in range(len(texts))]
    joined = ''.join(marker + text for marker, text in zip(markers, texts))
    query = urllib.parse.urlencode({'client': 'gtx', 'sl': 'en', 'tl': target, 'dt': 't', 'q': joined})
    request = urllib.request.Request('https://translate.googleapis.com/translate_a/single?' + query)
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.load(response)
    result = ''.join(segment[0] for segment in payload[0] if segment[0])
    outputs = []
    positions = [(result.find(marker), marker) for marker in markers]
    if any(position < 0 for position, _ in positions) or len({position for position, _ in positions}) != len(markers):
        raise ValueError('Translation lost or duplicated one or more markers.')
    positions.sort()
    for index, (position, marker) in enumerate(positions):
        start = position + len(marker)
        end = positions[index + 1][0] if index + 1 < len(positions) else len(result)
        value = result[start:end].strip(' \n:;,.—-')
        if not value:
            raise ValueError(f'Empty translation for marker {marker} to {target}')
        outputs.append(value)
    return outputs


def localize(quotes, catalog_path, locales=None, delay=0.15, checkpoint_every=100):
    quotes, catalog_path = Path(quotes), Path(catalog_path)
    catalog = read_attribution_localizations(catalog_path)
    source_rows = source_catalogue(quotes)
    authors = sorted({row['Author'] for row in source_rows})
    works = sorted({(row['Author'], row['Title']) for row in source_rows})
    selected = [locale for locale in TARGETS if locales is None or locale in locales]
    done = 0
    for locale in selected:
        target = TARGETS[locale]
        author_forms = catalog['authors']
        work_forms = catalog['works']
        missing = []
        for author in authors:
            if locale not in author_forms.get(author, {}):
                missing.append(('author', author, None))
        for author, title in works:
            if locale not in work_forms.get(author, {}).get(title, {}):
                missing.append(('work', author, title))
        # Source forms in related Latin-script locales are retained unchanged;
        # all remaining gaps are translated in chunks with checked markers.
        pending = []
        for kind, author, title in missing:
            text = author if kind == 'author' else title
            if locale in {'de-DE', 'el-GR', 'es-ES', 'fr-FR', 'it-IT', 'pt-PT'} and all(ord(c) < 128 for c in text):
                value = text
                if kind == 'author':
                    author_forms.setdefault(author, {})[locale] = value
                else:
                    work_forms.setdefault(author, {}).setdefault(title, {})[locale] = value
                done += 1
            else:
                pending.append((kind, author, title, text))
        offset = 0
        batch_size = 40
        while offset < len(pending):
            batch = pending[offset:offset + batch_size]
            try:
                values = translate_batch([entry[3] for entry in batch], target)
            except ValueError as error:
                if batch_size > 1:
                    batch_size = max(1, batch_size // 2)
                    print(f'{locale}: reducing batch size to {batch_size} after marker validation: {error}', flush=True)
                    continue
                kind, author, title, source = batch[0]
                fallback = author if kind == 'author' else title
                if locale in {'de-DE', 'el-GR', 'es-ES', 'fr-FR', 'it-IT', 'pt-PT'} and all(ord(c) < 128 for c in source):
                    value = fallback
                else:
                    try:
                        value = translate_batch([source], target)[0]
                    except (ValueError, OSError, urllib.error.URLError):
                        with (catalog_path.parent / 'attribution-localization-pending.jsonl').open('a', encoding='utf-8') as stream:
                            stream.write(json.dumps({'locale': locale, 'kind': kind, 'author': author,
                                                     'title': title, 'source': source}, ensure_ascii=False) + '\n')
                        value = fallback
                values = [value]
            for (kind, author, title, _), value in zip(batch, values):
                if kind == 'author':
                    author_forms.setdefault(author, {})[locale] = value
                else:
                    work_forms.setdefault(author, {}).setdefault(title, {})[locale] = value
                done += 1
            catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            print(f'{locale}: translated {offset + len(batch)}/{len(pending)} missing forms', flush=True)
            if delay:
                time.sleep(delay)
            offset += len(batch)
        catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'{locale}: completed; {done} forms added so far', flush=True)
    return done


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--locale', action='append', choices=TARGETS)
    parser.add_argument('--delay', type=float, default=0.2)
    parser.add_argument('--quotes', type=Path, default=ROOT / 'quotes')
    parser.add_argument('--catalog', type=Path, default=ROOT / 'quotes/attribution-localizations.json')
    args = parser.parse_args()
    try:
        count = localize(args.quotes, args.catalog, set(args.locale) if args.locale else None, args.delay)
        print(f'Added {count} static attribution forms.')
    except (OSError, ValueError, urllib.error.URLError) as error:
        parser.exit(1, f'{error}\n')


if __name__ == '__main__':
    main()
