"""Add one passage with a shared ID and its actual source locale."""
import csv
from pathlib import Path

from quote_sources import resolve_locale, source_language
from translate_catalogue import atomic_write
from validate_translation import FIELDS, ROOT, read_catalogue, parse_sfw
import io

folder_path = ROOT / 'quotes'


def generate_id(time, directory=None):
    prefix = time.replace(':', '') + '-'
    used = {row['Id'] for path in Path(directory or folder_path).glob('quotes.*.csv')
            for row in read_catalogue(path)}
    number = max((int(value[len(prefix):]) for value in used if value.startswith(prefix)), default=-1) + 1
    return f'{prefix}{number:03}'


def add_quote_to_csv(time, quote, title, author, language_code, sfw, quote_time='*',
                     directory=None, translator=None):
    parse_sfw(sfw)
    directory = Path(directory or folder_path)
    paths = {path.name[len('quotes.'):-4]: path for path in directory.glob('quotes.*.csv')
             if not path.name.endswith('.draft.csv')}
    source_language(language_code)
    resolve_locale(language_code, paths)  # Fail before translation or writes.
    identifier = generate_id(time, directory)
    pending = []
    for locale, path in sorted(paths.items()):
        values = [quote, title, quote_time]
        if source_language(locale) != source_language(language_code):
            if translator is None:
                from googletrans import Translator
                translator = Translator()
            values = [translator.translate(value, src=source_language(language_code),
                       dest=source_language(locale)).text if value != '*' else value for value in values]
        rows = read_catalogue(path)
        row = dict(zip(['Quote', 'Title', 'Quote time'], values))
        row.update({'Time': time, 'Id': identifier, 'Author': author, 'SFW': sfw,
                    'Source locale': language_code})
        fields = FIELDS + (['Draft'] if any('Draft' in item for item in rows) else [])
        if 'Draft' in fields:
            row['Draft'] = 'false' if source_language(locale) == source_language(language_code) else 'true'
        rows.append(row)
        output = io.StringIO(newline='')
        writer = csv.DictWriter(output, fieldnames=fields, delimiter='|')
        writer.writeheader()
        writer.writerows(sorted(rows, key=lambda item: (item['Time'], item['Id'])))
        pending.append((path, output.getvalue()))
    for path, text in pending:
        atomic_write(path, text)
    return identifier


def input_quote():
    time = input('Time (HH:MM): ')
    quote = input('Quote: ')
    quote_time = input('Exact time phrase: ')
    title = input('Book: ')
    author = input('Author: ')
    sfw = 'true' if input('Safe for work (y/N)? ').strip().upper() == 'Y' else 'false'
    locale = input('Source locale (for example es-AR, es or en): ').strip()
    print('Added ' + add_quote_to_csv(time, quote, title, author, locale, sfw, quote_time))


if __name__ == '__main__':
    input_quote()
