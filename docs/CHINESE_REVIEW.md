# Simplified Chinese catalogue review

Integrated locale: `zh-CN` (中文（简体）). Of 3,640 received rows, 3,635 are eligible for publication and five remain drafts. Eligibility is not certification of literary quality.

The received CSV is preserved verbatim in `chinese-received.csv`. Restored 3,564 author names from the declared sources by ID; supplied Chinese transliterations remain in the archive. Canonical author names are retained for consistent attribution across languages.

## Repairs

Corrected 846 rows. `chinese-corrections.json` records field values before and after each repair, reasons, and draft-status changes. Original import problems are recorded in `chinese-import-findings.json`.

Repairs include missing or mismatched highlights, misplaced CSV content, empty/truncated passages, missing titles, source HTML emphasis and line breaks, dialogue formatting, and mistranslated clock expressions. Lost passages were translated from their declared source. Shared source passages were made consistent while retaining their individual highlighted times. IDs, source locales, clock slots, authors and SFW metadata were retained.

Subtraction errors such as “seven minutes to three” becoming 03:57, “quarter of one” becoming 01:15, and “ten to ten” becoming 10:10 were corrected. Precision and multiple times within passages were checked where identified, including seconds and several times in the same scene. Clear day-period mistakes and several non-time errors were also repaired.

Strict validation, including drafts, now reports zero structural errors, compared with 836 initial issues after author normalization. Five context/source cases are held for joint review in `CHINESE_PENDING_REVIEW.md`; their highlights and structure are valid, but they are excluded from public clock data.

## Remaining review limits

The conservative parser compares 2,694 source/Chinese time pairs on a 12-hour dial, with no remaining detected mismatches. Explicit day periods are checked separately. The other 946 pairs include approximate expressions, bare numbers and narrative arithmetic that the parser cannot establish; absence of a warning does not certify them.

The detailed report contains 311 candidate rows: 305 numeric-token differences, one length candidate, and five documented context/source findings (categories may overlap). Numeric differences can be legitimate Chinese numeral formatting or dates. These signals are review candidates, not confirmed mistranslations. The length candidate also needs human judgement; compact Chinese text is not inherently an omission.

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

Public catalogues omit drafts. The URL-only draft preview includes the five pending passages so they can be reviewed in the clock.
