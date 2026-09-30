"""Read-only editorial triage, always against the declared Source locale.

Run: python3 scripts/audit_translation_quality.py --output /tmp/quote-audit.json
Findings are candidates, not automatic corrections or a linguistic certificate.
Time parsing deliberately accepts only a small set of unambiguous whole phrases.
"""
import argparse
from collections import Counter, defaultdict
import json
from pathlib import Path
import re

from quote_sources import source_catalogue, source_language
from validate_translation import ROOT, read_catalogue, validate


WORDS = {
    'en': 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen',
    'es': 'cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciséis diecisiete dieciocho diecinueve',
    'fr': 'zéro un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize dix-sept dix-huit dix-neuf',
    'de': 'null eins zwei drei vier fünf sechs sieben acht neun zehn elf zwölf dreizehn vierzehn fünfzehn sechzehn siebzehn achtzehn neunzehn',
    'it': 'zero uno due tre quattro cinque sei sette otto nove dieci undici dodici tredici quattordici quindici sedici diciassette diciotto diciannove',
    'pt': 'zero um dois três quatro cinco seis sete oito nove dez onze doze treze catorze quinze dezasseis dezassete dezoito dezanove',
}
NUMBERS = {lang: {word: n for n, word in enumerate(words.split())} for lang, words in WORDS.items()}
for lang, tens in {
    'en': ['twenty', 'thirty', 'forty', 'fifty'],
    'es': ['veinte', 'treinta', 'cuarenta', 'cincuenta'],
    'fr': ['vingt', 'trente', 'quarante', 'cinquante'],
    'de': ['zwanzig', 'dreißig', 'vierzig', 'fünfzig'],
    'it': ['venti', 'trenta', 'quaranta', 'cinquanta'],
    'pt': ['vinte', 'trinta', 'quarenta', 'cinquenta'],
}.items():
    for tens_value, tens_word in enumerate(tens, 2):
        NUMBERS[lang][tens_word] = tens_value * 10
        for unit in range(1, 10):
            word = WORDS[lang].split()[unit]
            if lang == 'en':
                compound = tens_word + '-' + word
            elif lang == 'es':
                compound = tens_word + ' y ' + word
            elif lang == 'fr':
                compound = tens_word + (' et ' if unit == 1 else '-') + word
            elif lang == 'de':
                compound = ('ein' if unit == 1 else word) + 'und' + tens_word
            elif lang == 'it':
                compound = (tens_word[:-1] if unit in (1, 8) else tens_word) + word
            else:
                compound = tens_word + ' e ' + word
            NUMBERS[lang][compound] = tens_value * 10 + unit
NUMBERS['en'].update({'a': 1, 'an': 1, 'quarter': 15})
NUMBERS['es'].update({'una': 1, 'un': 1, 'cuarto': 15})
NUMBERS['fr'].update({'une': 1, 'quart': 15, 'le quart': 15})
NUMBERS['de'].update({'ein': 1, 'eine': 1, 'viertel': 15})
NUMBERS['it'].update({'una': 1, 'un': 1, 'un quarto': 15})
NUMBERS['pt'].update({'uma': 1, 'duas': 2, 'um quarto': 15, 'quarto': 15})


def number(value, lang):
    if value.isdigit():
        return int(value)
    return NUMBERS[lang].get(value)


def clock_phrase(phrase, lang):
    """Return minute on a 12-hour dial, or None (including contextual phrases).

    Does not infer AM/PM, approximate times, arithmetic in narrative, or a time
    from an arbitrary number embedded in a sentence.
    """
    if lang == 'el':
        from greek_time import clock_phrase as greek_clock_phrase
        return greek_clock_phrase(phrase)
    if lang not in NUMBERS:
        return None
    text = phrase.casefold().strip(' .!?,“”«»')
    text = re.sub(r'^(?:at |las |la |le |alle |ore |às |as |à |a las |a la |l[’\'])', '', text)
    text = re.sub(r"(?: o[’']clock| in punto| en punto)$", '', text)
    suffixes = {
        'en': r' (?:in the morning|in the afternoon|in the evening|at night|a\.?m\.?|p\.?m\.?)$',
        'es': r' (?:de la mañana|de la tarde|de la noche|a\.?m\.?|p\.?m\.?)$',
        'fr': r' (?:du matin|du soir|de l’après-midi)$',
        'de': r' (?:morgens|abends|nachmittags|nachts)$',
        'it': r' (?:del mattino|di mattina|del pomeriggio|di sera)$',
        'pt': r' (?:da manhã|da tarde|da noite)$',
    }
    text = re.sub(suffixes[lang], '', text)
    if lang == 'de':
        text = re.sub(r' uhr$', '', text)
    numeric = re.fullmatch(r'(\d{1,2})[:.](\d{2})', text)
    if numeric:
        h, m = map(int, numeric.groups())
        return (h % 12) * 60 + m if h < 24 and m < 60 else None
    specials = {'en': {'midnight': 0, 'noon': 0}, 'es': {'medianoche': 0, 'mediodía': 0},
                'fr': {'minuit': 0, 'midi': 0}, 'de': {'mitternacht': 0, 'mittag': 0},
                'it': {'mezzanotte': 0, 'mezzogiorno': 0}, 'pt': {'meia-noite': 0, 'meio-dia': 0}}
    if text in specials[lang]:
        return 0

    def result(h, m, sign=1):
        return (h * 60 + sign * m) % 720 if h is not None and m is not None and 0 < h <= 24 and 0 <= m < 60 else None

    patterns = {
        'en': [(r'(.+?)(?: minutes?)? (to|before|till|past|after|of) (.+)', 'relative'),
               (r'half[- ]past (.+)', 'half')],
        'de': [(r'(.+?)(?: minuten?)? (vor|nach) (.+)', 'relative'), (r'halb (.+)', 'half')],
        'fr': [(r'(.+?)(?: heures?)? moins (.+?)(?: minutes?)?', 'minus'),
               (r'(.+?)(?: heures?)? et demie', 'half'), (r'(.+?) heures? (.+?)(?: minutes?)?', 'plus')],
        'es': [(r'(.+?) menos (.+)', 'minus'), (r'(.+?) y media', 'half'), (r'(.+?) y (.+)', 'plus')],
        'it': [(r'(.+?) meno (.+)', 'minus'), (r'(.+?) e mezz[ao]', 'half'), (r'(.+?) e (.+?)(?: minuti)?', 'plus')],
        'pt': [(r'(.+?)(?: minutos?)? (para as|para a|para o|para) (.+)', 'relative'),
               (r'(.+?) e meia', 'half'), (r'(.+?) e (.+)', 'plus')],
    }
    for pattern, kind in patterns[lang]:
        match = re.fullmatch(pattern, text)
        if not match:
            continue
        parts = match.groups()
        if kind == 'half':
            return result(number(parts[0], lang), 30, -1 if lang == 'de' else 1)
        if kind == 'relative':
            parsed = result(number(parts[2], lang), number(parts[0], lang),
                            1 if parts[1] in ('past', 'after', 'nach') else -1)
            if parsed is not None:
                return parsed
            continue
        minute_text = re.sub(r'^et ', '', parts[1]) if lang == 'fr' else parts[1]
        return result(number(parts[0], lang), number(minute_text, lang), -1 if kind == 'minus' else 1)
    hour_text = re.sub(r' (?:heures?|uhr|horas?)$', '', text)
    hour = number(hour_text, lang)
    return result(hour, 0)


def plain(text):
    return re.sub(r'<[^>]+>', ' ', text)


def explicit_period(phrase, lang):
    """Only explicit, unambiguous day periods; 'night' alone stays contextual."""
    patterns = {
        'el': (r'\b(?:μεσάνυχτα|μεσονύχτια|πρωί|ξημερώματα|π\.μ\.)', r'\b(?:μεσημέρι|απόγευμα|βράδυ|μ\.μ\.)'),
        'en': (r'\b(?:midnight|morning|a\.?m\.?)\b', r'\b(?:noon|afternoon|evening|p\.?m\.?)\b'),
        'es': (r'\b(?:medianoche|mañana|madrugada)\b', r'\b(?:mediodía|tarde)\b'),
        'fr': (r'\b(?:minuit|matin)\b', r'\b(?:midi|soir)\b'),
        'de': (r'\b(?:mitternacht|morgens)\b', r'\b(?:mittag|nachmittags|abends)\b'),
        'it': (r'\b(?:mezzanotte|mattino|mattina)\b', r'\b(?:mezzogiorno|pomeriggio|sera)\b'),
        'pt': (r'\b(?:meia-noite|manhã)\b', r'\b(?:meio-dia|tarde)\b'),
    }
    periods = [i for i, pattern in enumerate(patterns.get(lang, ())) if re.search(pattern, phrase, re.I)]
    return periods[0] if len(periods) == 1 else None


def passage_findings(original, translated, target_language):
    """Contextual review signals, never an instruction to replace punctuation.

    A source excerpt can intentionally have unbalanced quotation marks. Only
    flag newly odd double-quote counts; dashes and balanced local conventions
    are equally acceptable. Count all common double-quote styles together so
    changing Spanish dashes to German/English quotes is not itself a finding.
    """
    findings = []
    delimiters = r'["“”„«»]'
    source_count = len(re.findall(delimiters, original['Quote']))
    target_count = len(re.findall(delimiters, translated['Quote']))
    if source_count % 2 == 0 and target_count % 2:
        findings.append(('dialogue', 'Newly odd double-quote delimiter count; inspect speech boundaries and intentional excerpts'))
    if source_language(original['Source locale']) == 'en' and target_language == 'de':
        source_halves = re.findall(r'half[- ]past ([a-z]+)', original['Quote'].casefold())
        target_halves = re.findall(r'halb ([a-zäöüß]+)', translated['Quote'].casefold())
        # Only compare single occurrences: different sentence order is legitimate.
        if len(source_halves) == len(target_halves) == 1:
            source_hour = number(source_halves[0], 'en')
            target_hour = number(target_halves[0], 'de')
            if source_hour is not None and target_hour is not None and (source_hour + 1) % 12 != target_hour % 12:
                findings.append(('german_half_hour', 'German halb refers to the following hour; full-passage reference differs from source'))
    return findings


def audit(directory):
    sources = source_catalogue(directory)
    indexed = {row['Id']: row for row in sources}
    findings = []
    source_slot_candidates = []
    for row in sources:
        parsed = clock_phrase(row['Quote time'], source_language(row['Source locale']))
        hour, minute = map(int, row['Time'].split(':'))
        if parsed is not None and parsed != (hour % 12) * 60 + minute:
            source_slot_candidates.append({'id': row['Id'], 'time': row['Time'],
                                           'source_locale': row['Source locale'],
                                           'source_time': row['Quote time'], 'source_quote': row['Quote']})
    coverage = {}
    for path in sorted(Path(directory).glob('quotes.*.csv')):
        if path.name.endswith('.draft.csv'):
            continue
        locale = path.name.split('.')[1]
        lang = source_language(locale)
        rows = read_catalogue(path)
        structural = defaultdict(list)
        for error in validate(sources, rows):
            identifier, _, message = error.partition(': ')
            structural[identifier].append(message or error)
        parsed = 0
        for line, row in enumerate(rows, 2):
            original = indexed[row['Id']]
            reasons = []
            for error in structural.get(row['Id'], []):
                reasons.append(('structure', error))
            source_lang = source_language(original['Source locale'])
            source_time = clock_phrase(original['Quote time'], source_lang)
            target_time = clock_phrase(row['Quote time'], lang)
            if source_time is not None and target_time is not None:
                parsed += 1
                if source_time != target_time:
                    reasons.append(('time', f'Parsed source {source_time // 60:02}:{source_time % 60:02}; target {target_time // 60:02}:{target_time % 60:02} (12-hour dial)'))
            if lang != source_lang:
                reasons.extend(passage_findings(original, row, lang))
                source_period = explicit_period(original['Quote time'], source_lang)
                target_period = explicit_period(row['Quote time'], lang)
                if source_period is not None and target_period is not None and source_period != target_period:
                    reasons.append(('day_period', 'Explicit day periods differ; review before/after-midnight context'))
                if lang == 'fr' and re.search(r'minutes? moins|septembre', row['Quote time'], re.I):
                    reasons.append(('time_expression', 'Malformed French time expression; check minutes/heures or sept/septembre'))
                if lang == 'it' and re.search(r'minuti meno', row['Quote time'], re.I):
                    reasons.append(('time_expression', 'Check minuti versus ore in a subtraction expression'))
                english_words = set('one two three four five six seven eight nine ten eleven twelve o’clock midnight'.split()) - NUMBERS.get(lang, {}).keys()
                if source_lang == 'en' and re.search(r'\b(?:' + '|'.join(sorted(english_words)) + r')\b', row['Quote time'], re.I):
                    reasons.append(('untranslated_time', 'English word remains in the highlighted time; inspect context'))
                if row['Quote'] == original['Quote']:
                    reasons.append(('unchanged', 'Full passage identical across different languages'))
                ratio = len(plain(row['Quote'])) / max(1, len(plain(original['Quote'])))
                if ratio < .60 or ratio > 1.75:
                    reasons.append(('length', f'Target/source character ratio {ratio:.2f}; possible omission or addition'))
                source_digits = Counter(re.findall(r'\b\d+\b', plain(original['Quote'])))
                target_digits = Counter(re.findall(r'\b\d+\b', plain(row['Quote'])))
                # Reformatting numbers as words is legitimate: this only queues review.
                if source_digits and target_digits and source_digits != target_digits:
                    reasons.append(('numbers', 'Digit tokens differ; may be legitimate spelling or time-format localization'))
            if reasons:
                findings.append({'id': row['Id'], 'locale': locale, 'line': line, 'source_locale': original['Source locale'],
                                 'time': row['Time'], 'reasons': [{'category': cat, 'detail': detail} for cat, detail in reasons],
                                 'source_time': original['Quote time'], 'target_time': row['Quote time'],
                                 'source_quote': original['Quote'], 'target_quote': row['Quote'],
                                 'source_author': original['Author'], 'target_author': row['Author'],
                                 'title': row['Title']})
        coverage[locale] = {'rows': len(rows), 'time_pairs_parsed': parsed,
                            'structural_findings': sum(map(len, structural.values()))}
    return {'scope': 'Automated triage only; absence of a finding does not certify a translation. AM/PM and narrative arithmetic require human review.',
            'sources': len(sources), 'source_locales': dict(Counter(row['Source locale'] for row in sources)),
            'coverage': coverage, 'candidate_rows': len(findings),
            'categories': dict(Counter(reason['category'] for row in findings for reason in row['reasons'])),
            'source_slot_candidates': source_slot_candidates, 'findings': findings}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--quotes', type=Path, default=ROOT / 'quotes')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    report = audit(args.quotes)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: value for key, value in report.items() if key not in ('findings', 'source_slot_candidates')}, ensure_ascii=False, indent=2))
