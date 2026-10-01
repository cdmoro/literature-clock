"""Additional whole-phrase checks for Russian editorial review.

No hour is inferred from the catalogue slot. Contextual excerpts remain manual.
"""
import re
from chinese_review_time import review_clock as source_clock
from russian_time import clock_phrase, number


def review_clock(phrase, language):
    if language != 'ru':
        return source_clock(phrase, language)
    text = re.sub(r'<[^>]+>', '', phrase).casefold().replace('ё', 'е').strip(' .,;!?”»«“')
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\s+(?:gmt|cet|часов|часа|ч|hrs)$', '', text)
    parsed = clock_phrase(text)
    if parsed is not None:
        return parsed
    m = re.fullmatch(r'(\d{2})(\d{2})h?', text)
    if not m:
        m = re.fullmatch(r'(\d{1,2})[ :.]([0-5]\d)', text)
    if m:
        h, minute = map(int, m.groups())
        return h % 12 * 60 + minute if h < 24 else None
    text = re.sub(r'\s+(?:утра|ночи|дня|вечера)$', '', text)
    text = re.sub(r'^(?:за|ровно в|ровно)\s+', '', text)
    m = re.fullmatch(r'без\s+(.+?)\s+минут[уы]?\s+до\s+(.+?)(?:\s+час(?:ов|а)?)?', text)
    if m:
        minute, h = number(m[1]), number(m[2])
        return (h * 60 - minute) % 720 if h is not None and minute is not None else None
    m = re.fullmatch(r'(.+?)\s+минут[ауы]?\s+до\s+(.+?)(?:\s+час(?:ов|а)?)?', text)
    if m:
        minute, h = number(m[1]), number(m[2])
        return (h * 60 - minute) % 720 if h is not None and minute is not None else None
    # Spoken digital clocks, including zero minutes and declined forms.
    text = text.replace('…', ' ').replace('-', ' ')
    text = re.sub(r'\s+', ' ', text).strip()
    text = re.sub(r'\s+(?:минут[аы]?|час(?:а|ов)?)$', '', text)
    text = re.sub(r'^(час)\s+', 'один ', text)
    text = re.sub(r'\s+ноль\s+', ' ', text)
    words = text.split()
    for split in (1, 2):
        h, minute = number(' '.join(words[:split])), number(' '.join(words[split:]))
        if h is not None and 0 < h < 24 and minute is not None and 0 <= minute < 60:
            return h % 12 * 60 + minute
    return None
