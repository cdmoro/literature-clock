"""Conservative Russian clock parsing for editorial triage on a 12-hour dial.

Declined number forms are accepted; narrative arithmetic stays unparsed.
"""
import re

FORMS = [
    'ноль нуля', 'один одна одну одной первого первый час часа часу',
    'два две двух двум второго второй', 'три трех трем третьего третий',
    'четыре четырех четвертого четвертый', 'пять пяти пятого пятый',
    'шесть шести шестого шестой', 'семь семи седьмого седьмой',
    'восемь восьми восьмого восьмой', 'девять девяти девятого девятый',
    'десять десяти десятого десятый', 'одиннадцать одиннадцати одиннадцатого',
    'двенадцать двенадцати двенадцатого', 'тринадцать тринадцати',
    'четырнадцать четырнадцати', 'пятнадцать пятнадцати', 'шестнадцать шестнадцати',
    'семнадцать семнадцати', 'восемнадцать восемнадцати', 'девятнадцать девятнадцати',
]
NUMBERS = {word: n for n, forms in enumerate(FORMS) for word in forms.split()}
NUMBERS.update({word: n for n, forms in [(20,'двадцать двадцати'),(30,'тридцать тридцати'),
                                       (40,'сорок сорока'),(50,'пятьдесят пятидесяти')] for word in forms.split()})

def number(text):
    words = text.strip().split()
    if len(words) == 1:
        return int(words[0]) if words[0].isdigit() else NUMBERS.get(words[0])
    if len(words) == 2 and NUMBERS.get(words[0], 0) >= 20 and 0 < NUMBERS.get(words[1], 0) < 10:
        return NUMBERS[words[0]] + NUMBERS[words[1]]
    return None


def clock_phrase(text):
    text = text.casefold().replace('ё', 'е').strip(' .,;!?”»«“')
    text = re.sub(r'^(?:около|примерно|ровно|в|к)\s+', '', text)
    text = re.sub(r'\s+(?:утра|ночи|дня|вечера)$', '', text)
    m = re.fullmatch(r'(\d{1,2})[:.](\d{2})', text)
    if m:
        h, minute = map(int, m.groups())
        return h % 12 * 60 + minute if h <= 23 and minute < 60 else None
    if re.fullmatch(r'пол[у]?ноч[а-я]*', text): return 0
    if re.fullmatch(r'полдень|полдня|полудень|полудня|полудню|полуденном|полуденным', text): return 0
    m = re.fullmatch(r'(?:пол(?:овина|овине|овины|овину)?\s*)([а-я]+)', text)
    if m:
        h = number(m[1])
        return ((h - 1) % 12) * 60 + 30 if h is not None else None
    m = re.fullmatch(r'четверт[ьи]\s+([а-я]+)', text)
    if m:
        h = number(m[1]); return ((h - 1) % 12) * 60 + 15 if h is not None else None
    m = re.fullmatch(r'без\s+(.+?)\s+(?:минут[уы]?\s+)?([а-я]+|\d+)', text)
    if m:
        if m[2] == 'пяти' and m[1] == 'двадцати': return None
        minute = 15 if m[1] == 'четверти' else number(m[1])
        h = number(m[2]); return (h * 60 - minute) % 720 if h is not None and minute is not None else None
    m = re.fullmatch(r'(.+?)\s+минут[ауы]?\s+до\s+(.+)', text)
    if m:
        minute = number(m[1]); h = 0 if m[2] in ('полуночи','полудня') else number(m[2])
        return (h * 60 - minute) % 720 if h is not None and minute is not None else None
    m = re.fullmatch(r'(.+?)\s+минут[ауы]?\s+([а-я]+)', text)
    if m:
        minute = number(m[1]); h = number(m[2])
        return ((h - 1) % 12) * 60 + minute if h is not None and minute is not None else None
    m = re.fullmatch(r'(.+?)\s+(?:минут[ауы]?\s+)?после\s+(.+?)(?:\s+час(?:ов|а)?)?', text)
    if m:
        minute = number(m[1]); h = 0 if m[2] in ('полуночи','полудня') else number(m[2])
        return (h % 12) * 60 + minute if h is not None and minute is not None and minute < 60 else None
    text = re.sub(r'\s+час(?:ов|а|ам|ами|ах)?$', '', text)
    n = number(text)
    if n is not None and n <= 24:return n % 12 * 60
    words=text.replace('-', ' ').split()
    for split in (1,2):
        h=number(' '.join(words[:split])); minute=number(' '.join(words[split:]))
        if h is not None and h <= 24 and minute is not None and minute < 60:return h % 12 * 60 + minute
    return None
