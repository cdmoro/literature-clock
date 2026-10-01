# Simplified Chinese catalogue review

Integrated locale: `zh-CN` (中文（简体）). Of 3,640 received rows, all 3,640 are eligible for publication and none remain drafts. Eligibility is not certification of literary quality.

The received CSV is preserved verbatim in `chinese-received.csv`. Restored 3,564 author names from the declared sources by ID; supplied Chinese transliterations remain in the archive. Canonical author names are retained for consistent attribution across languages.

## Repairs

Corrected 847 rows. `chinese-corrections.json` records field values before and after each repair, reasons, and draft-status changes. Original import problems are recorded in `chinese-import-findings.json`.

Repairs include missing or mismatched highlights, misplaced CSV content, empty/truncated passages, missing titles, source HTML emphasis and line breaks, dialogue formatting, and mistranslated clock expressions. Lost passages were translated from their declared source. Shared source passages were made consistent while retaining their individual highlighted times. IDs, source locales, authors and SFW metadata were retained. The jointly approved Casino Royale correction moves ID 1500-038 from 15:00 to 03:00 in all nine catalogues.

Subtraction errors such as “seven minutes to three” becoming 03:57, “quarter of one” becoming 01:15, and “ten to ten” becoming 10:10 were corrected. Precision and multiple times within passages were checked where identified, including seconds and several times in the same scene. Clear day-period mistakes and several non-time errors were also repaired.

Strict validation, including drafts, now reports zero structural errors, compared with 836 initial issues after author normalization. All five context/source cases were resolved with user approval; decisions and source references are recorded in `CHINESE_PENDING_REVIEW.md`. Both English catalogues also correct Bligh’s source typo charge → change.

## Remaining review limits

The conservative parser compares 2,694 source/Chinese time pairs on a 12-hour dial, with no remaining detected mismatches. Explicit day periods are checked separately. The other 946 pairs include approximate expressions, bare numbers and narrative arithmetic that the parser cannot establish; absence of a warning does not certify them.

The detailed report contains 306 candidate rows: 305 numeric-token differences and one length candidate. Numeric differences can be legitimate Chinese numeral formatting or dates. These signals are review candidates, not confirmed mistranslations. The length candidate also needs human judgement; compact Chinese text is not inherently an omission.

## Typography and integration

The interface, About panel, reading controls, settings, colour controls, fallback passages and language selectors include Chinese. Theme quotes use local CJK serif families (Songti SC, SimSun, Noto Serif CJK SC) with a generic serif fallback. Bilingual passages choose their font independently; custom user fonts retain their priority.

## Reproduce

```sh
python3 scripts/validate_translation.py quotes/quotes.zh-CN.csv
python3 scripts/review_chinese.py --output docs/chinese-review.json
python3 scripts/generate_times.py zh-CN
python3 -m unittest discover -s scripts -p 'test_*.py'
npm run test:ci
npm run build
```

Public catalogues include all 3,640 Chinese rows. No Chinese draft preview is needed; regeneration removes the obsolete preview.
