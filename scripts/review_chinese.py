"""Read-only Chinese triage including strict checks of pending rows.

Usage: python3 scripts/review_chinese.py --output docs/chinese-review.json
The archived received CSV is never modified. Findings are review candidates.
"""
import argparse
from collections import Counter
import json
from pathlib import Path

from audit_translation_quality import audit
from review_chinese_second_pass import second_pass_status
from quote_sources import source_catalogue
from validate_translation import ROOT, catalogue_progress, is_draft, read_catalogue, validate


def review():
    directory = ROOT / 'quotes'
    sources = source_catalogue(directory)
    originals = {row['Id']: row for row in sources}
    rows = read_catalogue(directory / 'quotes.zh-CN.csv')
    targets = {row['Id']: row for row in rows}
    received = read_catalogue(ROOT / 'docs/chinese-received.csv')
    strict_errors = validate(sources, [{**row, 'Draft': 'false'} for row in rows])
    report = audit(directory)
    findings = {row['id']: row for row in report['findings'] if row['locale'] == 'zh-CN'}

    def add(identifier, category, detail):
        row = targets[identifier]
        source = originals[identifier]
        entry = findings.setdefault(identifier, {
            'id': identifier, 'locale': 'zh-CN', 'time': row['Time'],
            'source_time': source['Quote time'], 'target_time': row['Quote time'],
            'source_quote': source['Quote'], 'target_quote': row['Quote'],
            'title': row['Title'], 'reasons': []})
        reason = {'category': category, 'detail': detail}
        if reason not in entry['reasons']:
            entry['reasons'].append(reason)

    for error in strict_errors:
        identifier, _, detail = error.partition(': ')
        if identifier in targets:
            add(identifier, 'structure', detail)
    pending = json.loads((ROOT / 'docs/chinese-pending-review.json').read_text(encoding='utf-8'))['findings']
    for entry in pending:
        if is_draft(targets[entry['id']]):
            add(entry['id'], entry['category'], entry['reason'])
    for identifier, entry in findings.items():
        entry['draft'] = is_draft(targets[identifier])
    second_pass = second_pass_status(sources, rows)
    reviewed = second_pass.pop('reviewed_candidates')
    for identifier, entry in findings.items():
        decision = reviewed.get(identifier)
        if decision:
            entry['second_pass_review'] = {'outcome': decision['outcome'], 'reason': decision['reason']}
    unreviewed = [identifier for identifier, entry in findings.items()
                  if identifier not in reviewed and any(reason['category'] in ('numbers', 'length') for reason in entry['reasons'])]
    return {
        'second_pass': second_pass, 'unreviewed_numeric_length_ids': unreviewed,
        'scope': 'Automated triage plus documented context/source findings, not full literary certification. CJK character length uses a heuristic 0.15 lower threshold; short translated passages are not inherently omissions. Conservative whole-phrase parsing; unparsed expressions and narrative arithmetic need review.',
        'received': 'docs/chinese-received.csv',
        'authors_restored': sum(row['Author'] != originals[row['Id']]['Author'] for row in received),
        'progress': catalogue_progress(rows), 'coverage': report['coverage']['zh-CN'],
        'categories': dict(Counter(reason['category'] for entry in findings.values() for reason in entry['reasons'])),
        'candidate_rows': len(findings), 'strict_structural_errors': len(strict_errors),
        'pending_context_rows': sum(is_draft(targets[entry['id']]) for entry in pending),
        'time_pairs_unparsed': len(rows) - report['coverage']['zh-CN']['time_pairs_parsed'],
        'findings': sorted(findings.values(), key=lambda entry: entry['id'])}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = review()
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: value for key, value in result.items() if key != 'findings'}, ensure_ascii=False, indent=2))
