"""Conservative Modern Greek time parsing for editorial triage.

Returns minutes on a twelve-hour dial; never interprets approximate, ranged,
or narrative times. A parsed value does not constitute translation approval.
"""
import re
import unicodedata


def normalize(text):
    return ''.join(c for c in unicodedata.normalize('NFD', text.casefold())
                   if not unicodedata.combining(c)).replace('ς', 'σ')


NUMBERS = {normalize(word): value for value, word in enumerate(
    'μηδέν ένα δύο τρία τέσσερα πέντε έξι επτά οκτώ εννέα δέκα έντεκα δώδεκα δεκατρία δεκατέσσερα δεκαπέντε δεκαέξι δεκαεπτά δεκαοκτώ δεκαεννέα'.split())}
NUMBERS.update({normalize(word): value for word, value in {
    'μία': 1, 'μια': 1, 'τρεις': 3, 'τέσσερις': 4, 'εφτά': 7, 'οχτώ': 8,
    'εννιά': 9, 'δεκατέσσερις': 14, 'δεκατρείς': 13, 'είκοσι': 20,
    'τριάντα': 30, 'σαράντα': 40, 'πενήντα': 50, 'τέταρτο': 15,
    'ένα τέταρτο': 15, 'τρία τέταρτα': 45, 'μισή': 30,
}.items()})


def number(text):
    if text.isdigit():
        return int(text)
    if text in NUMBERS:
        return NUMBERS[text]
    parts = text.split()
    if (len(parts) == 2 and NUMBERS.get(parts[0]) in (20, 30, 40, 50)
            and 0 < NUMBERS.get(parts[1], 100) < 10):
        return NUMBERS[parts[0]] + NUMBERS[parts[1]]
    return None


def result(hour, minute, sign=1):
    if hour is not None and minute is not None and 0 <= hour < 24 and 0 <= minute < 60:
        return (hour * 60 + sign * minute) % 720
    return None


def clock_phrase(phrase):
    text = normalize(phrase).strip(' .!?,«»“”')
    text = re.sub(r'^(?:στισ |στη |στα |στην |ωρα )', '', text)
    text = re.sub(r' (?:το πρωι|τα ξημερωματα|το απογευμα|το βραδυ|τη νυχτα|π\.μ\.?|μ\.μ\.?|πμ|μμ)$', '', text)
    text = re.sub(r' (?:η ωρα|ωρεσ)$', '', text)
    specials = {'μεσανυχτα': 0, 'μεσονυχτα': 0, 'μεσονυχτιου': 0, 'μεσημερι': 0}
    if text in specials:
        return 0
    numeric = re.fullmatch(r'(\d{1,2})[:.](\d{2})(?:h)?', text)
    if numeric:
        return result(*map(int, numeric.groups()))
    if re.fullmatch(r'\d{4}(?:h)?', text):
        return result(int(text[:2]), int(text[2:4]))
    text = re.sub(r' λεπτ[αο]$', '', text)
    match = re.fullmatch(r'(.+?) (και|παρα) (.+)', text)
    if match:
        hour = specials.get(match[1], number(match[1]))
        return result(hour, number(match[3]), 1 if match[2] == 'και' else -1)
    match = re.fullmatch(r'(.+?)(?: λεπτ[αο])? (μετα|πριν)(?: απο)? (?:τισ |τη |τα |το )?(.+)', text)
    if match:
        hour = specials.get(match[3], number(match[3]))
        return result(hour, number(match[1]), 1 if match[2] == 'μετα' else -1)
    # Digital-style spoken readings, including a pause or hyphen.
    text = re.sub(r'[—–…-]+', ' ', text)
    words = text.split()
    for split in range(1, len(words)):
        parsed = result(number(' '.join(words[:split])), number(' '.join(words[split:])))
        if parsed is not None:
            return parsed
    return result(number(text), 0)
