"""Conservative Arabic clock expressions for translation triage.

Only complete expressions are accepted. Clock values use a 12-hour dial;
period, approximation, ranges and full-passage fidelity require separate review.
No assigned catalogue time is consulted.
"""
import re
import unicodedata


def normalize(text):
    text = ''.join(c for c in text if c != 'ـ' and not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', text).strip(' .،؛!?؟"«»')


HOURS = {
    'الواحدة': 1, 'الثانية': 2, 'الثالثة': 3, 'الرابعة': 4,
    'الخامسة': 5, 'السادسة': 6, 'السابعة': 7, 'الثامنة': 8,
    'التاسعة': 9, 'العاشرة': 10, 'الحادية عشرة': 11, 'الثانية عشرة': 12,
    'واحدة': 1, 'اثنتان': 2, 'اثنتين': 2, 'ثلاث': 3, 'أربع': 4,
    'خمس': 5, 'ست': 6, 'سبع': 7, 'ثمان': 8, 'تسع': 9, 'عشر': 10,
    'إحدى عشرة': 11, 'اثنتا عشرة': 12, 'اثنتي عشرة': 12,
    'منتصف الليل': 0, 'منتصف ليل': 0, 'منتصف ليلة': 0,
    'الظهر': 0, 'الظهيرة': 0, 'منتصف النهار': 0,
}
UNITS = {'واحدة':1,'واحد':1,'إحدى':1,'اثنتان':2,'اثنتين':2,'اثنان':2,'اثنين':2,
         'ثلاث':3,'ثلاثة':3,'أربع':4,'أربعة':4,'خمس':5,'خمسة':5,'ست':6,'ستة':6,
         'سبع':7,'سبعة':7,'ثمان':8,'ثماني':8,'ثمانية':8,'تسع':9,'تسعة':9,'عشر':10,'عشرة':10}
NUMBERS = dict(UNITS)
NUMBERS.update({'إحدى عشرة':11,'أحد عشر':11,'اثنتا عشرة':12,'اثنتي عشرة':12,'اثنا عشر':12,'اثني عشر':12})
for value,word in [(20,'عشر'),(30,'ثلاث'),(40,'أربع'),(50,'خمس')]:
    for ending in ('ون','ين'):
        tens = word+ending
        NUMBERS[tens]=value
        for unit,n in UNITS.items():
            if n<10: NUMBERS[unit+' و'+tens]=value+n
for unit,n in UNITS.items():
    if 3<=n<=9:
        NUMBERS[unit+' عشرة']=10+n
        NUMBERS[unit+' عشر']=10+n
NUMBERS = {normalize(k):v for k,v in NUMBERS.items()}
HOURS = {normalize(k):v for k,v in HOURS.items()}


def number(text):
    text = normalize(text)
    if text.isdigit(): return int(text)
    return NUMBERS.get(text)


def hour(text):
    text = re.sub(r'^(?:الساعة|ساعة) ', '', normalize(text))
    if text.isdigit():
        value=int(text)
        return value if value<24 else None
    return HOURS.get(text)


def minutes(text):
    text=normalize(text)
    if text in ('الربع','ربع'): return 15
    if text in ('النصف','نصف'): return 30
    if text in ('دقيقة','دقيقة واحدة'): return 1
    if text in ('دقيقتان','دقيقتين'): return 2
    if text.startswith('الدقيقة '):
        ordinal = HOURS.get(text[len('الدقيقة '):])
        if ordinal is not None and 0 < ordinal < 60: return ordinal
    text=re.sub(r'^(?:الدقائق|الدقيقة) ', '',text)
    text=re.sub(r' (?:دقائق|دقيقة)$','',text)
    value=number(text)
    return value if value is not None and 0<value<60 else None


def clock_phrase(phrase):
    text=normalize(phrase)
    # Reject approximations rather than silently certifying their precision.
    if re.search(r'تقريبا|حوالي|تقارب|نحو|قرابة|أو|بين|قبل|بليل|أقل|أكثر',text): return None
    text=re.sub(r'^(?:في |عند )','',text)
    text=re.sub(r' (?:صباحا|مساء|مساءا|ظهرا|بعد الظهر|بعد ظهر اليوم|من صباح اليوم|في الصباح)$','',text)
    text=re.sub(r'^(?:الساعة|ساعة) ', '',text)
    numeric=re.fullmatch(r'(\d{1,2})[:.](\d{2})(?:h)?',text)
    if numeric:
        h,m=map(int,numeric.groups())
        return h%12*60+m if h<24 and m<60 else None
    for pattern in (r'(.+?) بعد (.+)',r'بعد (.+?) ب(.+)'):
        match=re.fullmatch(pattern,text)
        if match:
            if pattern.startswith('بعد'): h,m=hour(match[1]),minutes(match[2])
            else: h,m=hour(match[2]),minutes(match[1])
            return (h*60+m)%720 if h is not None and m is not None else None
    match=re.fullmatch(r'(.+?) إلا (.+)',text)
    if match:
        h,m=hour(match[1]),minutes(match[2])
        return (h*60-m)%720 if h is not None and m is not None else None
    match=re.fullmatch(r'(.+?) و(.+)',text)
    if match:
        h,m=hour(match[1]),minutes(match[2])
        return (h*60+m)%720 if h is not None and m is not None else None
    h=hour(text)
    return h%12*60 if h is not None else None
