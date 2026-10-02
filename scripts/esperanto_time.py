"""Conservative Esperanto clock parsing for editorial triage.

See https://bertilow.com/pmeg/gramatiko/nombroj/horoj.html .
Return minutes on a twelve-hour dial, never infer a day period or clock slot.
Approximation, ambiguous 'duono de', ranges and narrative arithmetic stay unparsed.
"""
import re

UNITS = dict(zip('nul unu du tri kvar kvin ses sep ok naŭ'.split(), range(10)))
NUMBERS = {**UNITS, 'dek': 10}
for tens in range(10, 60, 10):
    word = 'dek' if tens == 10 else next(k for k, v in UNITS.items() if v == tens // 10) + 'dek'
    NUMBERS[word] = tens
    for unit_word, unit in UNITS.items():
        if unit:
            NUMBERS[f'{word} {unit_word}'] = tens + unit
NUMBERS.update({'dekdu': 12, 'duono': 30, 'duonhoro': 30,
                'duona horo': 30, 'kvarono': 15, 'kvaronhoro': 15,
                'kvarona horo': 15, 'tri kvaronoj': 45})
PERIOD = r'(?:matene|antaŭtagmeze|posttagmeze|vespere|nokte|a\.?\s*t\.?\s*m\.?|p\.?\s*t\.?\s*m\.?|a\.?\s*m\.?|p\.?\s*m\.?)'


def number(text):
    text = re.sub(r'^la ', '', text)
    text = re.sub(r'^dek(unu|du|tri|kvar|kvin|ses|sep|ok|naŭ)(a?n?)$', r'dek \1\2', text)
    if text in NUMBERS:
        return NUMBERS[text]
    if text.endswith('n'):
        text = text[:-1]
    if re.fullmatch(r'\d+a?', text):
        return int(text.rstrip('a'))
    # Ordinal clock hours (tria, dek-dua) and accusative forms.
    if text.endswith('a'):
        text = text[:-1]
    return NUMBERS.get(text)


def result(hour, minute=0, sign=1):
    if hour is not None and minute is not None and 0 <= hour < 24 and 0 <= minute < 60:
        return (hour * 60 + sign * minute) % 720
    return None


def clock_phrase(phrase):
    text = phrase.casefold().strip(' .!?,«»“”')
    text = re.sub(r'^(?:je )?(?:la )?', '', text)
    text = re.sub(r' ' + PERIOD + r'$', '', text)
    numeric = re.fullmatch(r'(\d{1,2})[:.](\d{2})(?:-a)?(?: horoj)?', text)
    if numeric:
        return result(*map(int, numeric.groups()))
    military = re.fullmatch(r'(\d{2})(\d{2})(?:h)?', text)
    if military:
        return result(*map(int, military.groups()))
    text = re.sub(r'(\d)-a', r'\1a', text).replace('-', ' ')
    text = re.sub(r'\s+', ' ', text)
    specials = {'noktomezo': 0, 'noktomezon': 0, 'noktomeze': 0,
                'noktomeza': 0, 'noktomezan': 0, 'tagmezo': 0,
                'tagmezon': 0, 'tagmeze': 0}
    if text in specials:
        return 0

    def hour(value):
        value = re.sub(r'^la ', '', value)
        value = re.sub(r' hor(?:o|on)$', '', value)
        return specials.get(value, number(value))

    relative = re.fullmatch(r'(.+?)(?: minut(?:o|oj|on|ojn))? (post|antaŭ) (.+)', text)
    if relative:
        return result(hour(relative[3]), number(relative[1]), 1 if relative[2] == 'post' else -1)
    combined = re.fullmatch(r'(.+?) kaj (.+)', text)
    if combined:
        return result(hour(combined[1]), number(re.sub(r' minut(?:o|oj|on|ojn)$', '', combined[2])))
    whole_hour = result(hour(text))
    if whole_hour is not None:
        return whole_hour
    # A spoken digital reading must have exactly one interpretation.
    words = text.split()
    candidates = set()
    for split in range(1, len(words)):
        parsed = result(hour(' '.join(words[:split])), number(' '.join(words[split:])))
        if parsed is not None:
            candidates.add(parsed)
    if len(candidates) == 1:
        return candidates.pop()
    return result(hour(text))
