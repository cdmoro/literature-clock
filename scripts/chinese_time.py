"""Conservative Chinese clock parsing for editorial triage, on a 12-hour dial.

Whole phrases only. Approximations and narrative arithmetic remain unparsed.
"""
import re
import unicodedata


def number(text):
    if text.isascii() and text.isdigit():
        return int(text)
    digits = dict(zip('零〇一二两三四五六七八九', [0, 0, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9]))
    if text in digits:
        return digits[text]
    if text.startswith(('零', '〇')) and len(text) > 1:
        return number(text[1:])
    if re.fullmatch('[一二三四五六七八九]?十[一二三四五六七八九]?', text):
        tens, units = text.split('十')
        return digits.get(tens, 1) * 10 + digits.get(units, 0)
    if re.fullmatch('[零〇一二三四五六七八九]{2}', text):
        return digits[text[0]] * 10 + digits[text[1]]
    return None


def clock_phrase(phrase):
    text = re.sub(r'\s+', '', unicodedata.normalize('NFKC', phrase)).strip(' 。！？，、.!?,“”')
    if text in ('中午', '正午', '午夜', '子夜', '半夜'):
        return 0
    text = re.sub(r'^(?:在)?(?:凌晨|清晨|早晨|早上|上午|中午|下午|傍晚|晚上)?', '', text)
    text = re.sub(r'^(?:在)', '', text)
    if text in ('午夜', '子夜', '半夜', '正午'):
        return 0
    numeric = re.fullmatch(r'(\d{1,2})[:.](\d{2})(?:分)?', text)
    if numeric:
        h, m = map(int, numeric.groups())
        return h % 12 * 60 + m if h < 24 and m < 60 else None
    token = r'[0-9零〇一二两三四五六七八九十]+'
    # Subtraction phrases refer to the following hour.
    periodless = re.sub(r'^(?:凌晨|早上|上午|下午|晚上)', '', text)
    plus = re.fullmatch(rf'({token})点过({token})分(?:钟)?', periodless)
    if plus:
        hour, minute = (number(value) for value in plus.groups())
        return hour % 12 * 60 + minute if hour is not None and 0 <= hour < 24 and minute is not None and 0 <= minute < 60 else None
    for pattern, reverse in [
        (rf'({token})点差({token})分(?:钟)?', False),
        (rf'差({token})分(?:钟)?(?:到)?({token})点', True),
        (rf'还有({token})分钟就到({token})点', True),
        (rf'({token})点前({token})分(?:钟)?', False),
        (rf'(?:离|距离)({token})点(?:还有|只剩|还差)({token})分(?:钟)?', False),
    ]:
        relative = re.fullmatch(pattern, periodless)
        if relative:
            values = [number(value) for value in relative.groups()]
            hour, minute = values[::-1] if reverse else values
            return (hour * 60 - minute) % 720 if hour is not None and 0 < hour < 24 and minute is not None and 0 < minute < 60 else None
    quarter = re.fullmatch(rf'差一刻({token})点|({token})点差一刻', periodless)
    if quarter:
        hour = number(next(value for value in quarter.groups() if value))
        return (hour * 60 - 15) % 720 if hour is not None and 0 < hour < 24 else None
    midnight = re.fullmatch(rf'(?:离|距离)?(午夜|中午|正午)(?:还有|前|差)({token})分钟?|还有({token})分钟就到(午夜|中午|正午)', text)
    if midnight:
        minute = number(midnight[2] or midnight[3])
        return (-minute) % 720 if minute is not None and 0 < minute < 60 else None
    match = re.fullmatch(rf'({token})[点时](?:钟|整|正)?(?:({token})分?|(半|一刻|三刻))?', text)
    if not match:
        match = re.fullmatch(rf'(午夜|子夜|正午)(?:过|过后)({token})分钟?', text)
        if match:
            minute = number(match[2])
            return minute if minute is not None and minute < 60 else None
        return None
    hour = number(match[1])
    minute = number(match[2]) if match[2] else {'半': 30, '一刻': 15, '三刻': 45}.get(match[3], 0)
    return hour % 12 * 60 + minute if hour is not None and 0 <= hour < 24 and minute is not None and 0 <= minute < 60 else None
