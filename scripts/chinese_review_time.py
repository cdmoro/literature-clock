"""Additional whole-phrase clock checks used only in the Chinese second pass.

No inference from the catalogue slot, arbitrary passage numbers or narrative
arithmetic. Bare Chinese hours require a parsed source hour at :00.
"""
import re
import unicodedata
from audit_translation_quality import clock_phrase, NUMBERS
from chinese_time import number


def review_clock(phrase, language):
    parsed = clock_phrase(phrase, language)
    if parsed is not None:
        return parsed
    text = unicodedata.normalize('NFKC', re.sub(r'<[^>]+>', '', phrase)).lower().strip(' .!?,“”')
    text = re.sub(r'\s+', ' ', text)
    if language == 'zh':
        text = re.sub(r'\s+', '', text)
        match = re.fullmatch(r'(?:午夜|子夜|正午|中午)过(?:后)?([0-9零〇一二两三四五六七八九十]+)分(?:钟)?', text)
        if match:
            minute = number(match[1])
            return minute if minute is not None and 0 <= minute < 60 else None
        if text in ('午夜过后半小时', '午夜过半小时'):
            return 30
        return None
    if language == 'es' and text == 'media noche':
        return 0
    if language != 'en':
        return None
    text = re.sub(r'^(?:at |it[’\']s )', '', text)
    text = re.sub(r' (?:in the morning|in the morn|on the morning|in the afternoon|on the afternoon|in the evening|at night|a\.?m\.?|p\.?m\.?|hours?|hrs|gmt|cet|western time)$', '', text)
    text = re.sub(r' (?:o[’\']clock|sharp|precisely|exactly)$', '', text)
    numeric = re.fullmatch(r'(\d{1,2})[:. ](\d{2})', text)
    military = re.fullmatch(r'(\d{2})(\d{2})h?', text)
    if numeric or military:
        hour, minute = map(int, (numeric or military).groups())
        return hour % 12 * 60 + minute if 0 <= hour < 24 and 0 <= minute < 60 else None
    text = re.sub(r'\bo[’\']clock\b', '', text).strip()
    text = re.sub(r'\s+', ' ', text)
    text = text.replace('quarter-past', 'quarter past').replace('ten-past', 'ten past').replace('five-past', 'five past')
    units = {**NUMBERS['en'], 'midnight': 12, 'midday': 12, 'noon': 12, 'half': 30, 'a quarter': 15, 'three quarters': 45}
    def n(value):
        value = re.sub(r'(twenty|thirty|forty|fifty) (one|two|three|four|five|six|seven|eight|nine)$', r'\1-\2', value)
        value = re.sub(r'([a-z]+)[ -]and[ -]twenty', r'twenty-\1', value)
        return int(value) if value.isdigit() else units.get(value)
    relative = re.fullmatch(r'(.+?)(?: minutes?)? (past|after|to|before) (.+)', text)
    if relative:
        minute, direction, hour = relative.groups(); hour, minute = n(hour), n(minute)
        if hour is not None and minute is not None and 0 < hour <= 24 and 0 <= minute < 60:
            return (hour * 60 + (minute if direction in ('past','after') else -minute)) % 720
    paired = re.fullmatch(r'(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|seventeen|nineteen)[ -](.+)', text)
    if paired:
        hour, minute = paired.groups(); minute = re.sub(r'^(?:oh|o)[ -]', '', minute)
        hour, minute = n(hour), n(minute)
        if minute is not None and 0 <= minute < 60:
            return hour % 12 * 60 + minute
    return clock_phrase(text, language)


def compare_times(source, target, language):
    expected = review_clock(source, language)
    actual = review_clock(target, 'zh')
    if actual is None and expected is not None and expected % 60 == 0:
        bare = number(target)
        if bare is not None and 0 < bare <= 24:
            actual = bare % 12 * 60
    return expected, actual
