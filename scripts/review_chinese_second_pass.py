"""Verify second-pass decisions against current data and expand time checks.

The manifest documents a human screening of 305 numeric candidates, one length
candidate and 946 previously unparsed highlighted time pairs. Screening does
not certify the full literary translation of all passages.
"""
from hashlib import sha256
import json
from chinese_review_time import compare_times
from quote_sources import source_catalogue, source_language
from validate_translation import ROOT, read_catalogue


def fingerprint(source, target):
    fields = ('Id', 'Time', 'Quote time', 'Quote', 'Source locale')
    values = [[row[field] for field in fields] for row in (source, target)]
    return sha256(json.dumps(values, ensure_ascii=False).encode('utf-8')).hexdigest()


def second_pass_status(sources, rows):
    path = ROOT / 'docs/chinese-second-pass.json'
    manifest = json.loads(path.read_text(encoding='utf-8'))
    source = {row['Id']: row for row in sources}
    target = {row['Id']: row for row in rows}
    valid = {}
    stale = []
    for entry in manifest['numeric_and_length_reviews']:
        identifier = entry['id']
        if entry['fingerprint'] == fingerprint(source[identifier], target[identifier]):
            valid[identifier] = entry
        else:
            stale.append(identifier)
    mismatches = []
    parsed = []
    contextual = []
    for row in rows:
        original = source[row['Id']]
        expected, actual = compare_times(original['Quote time'], row['Quote time'],
                                         source_language(original['Source locale']))
        if expected is None or actual is None:
            contextual.append(row['Id'])
        elif expected != actual:
            mismatches.append({'id': row['Id'], 'source_minute': expected, 'target_minute': actual})
        else:
            parsed.append(row['Id'])
    stale_times = [entry['id'] for entry in manifest['time_highlight_reviews']
                   if entry['fingerprint'] != fingerprint(source[entry['id']], target[entry['id']])]
    return {
        'numeric_and_length_reviewed': len(valid), 'stale_numeric_reviews': stale,
        'stale_time_reviews': stale_times,
        'expanded_time_pairs_matching': len(parsed), 'expanded_time_mismatches': mismatches,
        'expanded_time_pairs_contextual': len(contextual),
        'contextual_ids': contextual, 'reviewed_candidates': valid,
    }


if __name__ == '__main__':
    result = second_pass_status(source_catalogue(ROOT / 'quotes'),
                                read_catalogue(ROOT / 'quotes/quotes.zh-CN.csv'))
    print(json.dumps({k: v for k, v in result.items() if k != 'reviewed_candidates'}, ensure_ascii=False, indent=2))
