# Simplified Chinese catalogue review

Integrated locale: `zh-CN` (中文（简体）). Of 3,640 received rows, 3,639 are eligible for publication and one remains a draft. Eligibility is not certification of literary quality.

The received CSV is preserved verbatim in `chinese-received.csv`. Restored 3,564 author names from the declared sources by ID; supplied Chinese transliterations remain in the archive. Canonical author names are retained for consistent attribution across languages.

## Repairs

Corrected 908 rows. `chinese-corrections.json` records field values before and after each repair, reasons, and draft-status changes. Original import problems are recorded in `chinese-import-findings.json`.

Repairs include missing or mismatched highlights, misplaced CSV content, empty/truncated passages, missing titles, source HTML emphasis and line breaks, dialogue formatting, and mistranslated clock expressions. Lost passages were translated from their declared source. Shared source passages were made consistent while retaining their individual highlighted times. IDs, source locales, authors and SFW metadata were retained. The jointly approved Casino Royale correction moves ID 1500-038 from 15:00 to 03:00 in all nine catalogues.

Subtraction errors such as “seven minutes to three” becoming 03:57, “quarter of one” becoming 01:15, and “ten to ten” becoming 10:10 were corrected. Precision and multiple times within passages were checked where identified, including seconds and several times in the same scene. Clear day-period mistakes and several non-time errors were also repaired.

Strict validation, including drafts, now reports zero structural errors, compared with 836 initial issues after author normalization. The original five context/source cases were resolved with user approval. A later screening found a new explicit pm/midnight-slot conflict in 0000-032, which is held as a draft; decisions and source references are recorded in `CHINESE_PENDING_REVIEW.md`. Both English catalogues also correct Bligh’s source typo charge → change.

## Remaining review limits

The conservative parser compares 2,696 source/Chinese time pairs on a 12-hour dial, with no remaining detected mismatches. Explicit day periods are checked separately. The other 944 pairs include approximate expressions, bare numbers and narrative arithmetic that the parser cannot establish; absence of a warning does not certify them.

The second pass screened all 305 initial numeric alerts, the one length alert, and all 946 previously unparsed highlighted time pairs. It corrected 73 additional rows and checked five new formatting alerts created by repairs. The 311 numeric/length decisions comprise 274 retained localizations, 35 corrected passages, one retained compact translation and one source-context hold. All current numeric/length candidates have a recorded, current decision.

The expanded, Chinese-specific source parser matches 3,369 time pairs without mismatches. Another 271 pairs remain contextual or outside its exact whole-phrase grammar. Their highlights were screened; this is not a full literary review of all 946 passages. Approximations, ranges, sub-minute precision and narrative arithmetic are retained rather than forced to the assigned minute.

Raw numeric/length alerts remain visible in `chinese-review.json`, annotated with the second-pass decision instead of being silently suppressed. The reproducible manifest `chinese-second-pass.json` fingerprints source and target passage/time fields so subsequent changes invalidate old decisions. Details and limitations are in `CHINESE_SECOND_PASS.md`.

## Typography and integration

The interface, About panel, reading controls, settings, colour controls, fallback passages and language selectors include Chinese. Chinese theme defaults load Google Fonts: Noto Sans SC for base and otherwise unassigned themes, ZCOOL QingKe HuangYou for retro/terminal, ZCOOL XiaoWei for elegant, Long Cang for handwriting, ZCOOL KuaiLe for photo, and Liu Jian Mao Cao for poster. The font selector labels the actual default for the displayed passage language and current theme. Bilingual passages choose their font independently; custom user fonts retain their priority.

## Reproduce

```sh
python3 scripts/validate_translation.py quotes/quotes.zh-CN.csv
python3 scripts/review_chinese.py --output docs/chinese-review.json
python3 scripts/generate_times.py zh-CN
python3 -m unittest discover -s scripts -p 'test_*.py'
npm run test:ci
npm run build
```

Public catalogues include 3,639 Chinese rows. The draft preview includes the unresolved source-slot case.
