# Greek catalogue review

The catalogue was migrated against main `6edca359dd1db208f1701834bf56f95adcaba10a`. Each original is resolved through `source_catalogue` using its ID and declared `Source locale`, including the regional Spanish sources. All 3,640 IDs are preserved; source time, author, boolean SFW and provenance match current originals.

The review repaired incorrect hours and minute order, subtraction versus addition, quarter-hour expressions, omitted precision, AM/PM errors, missing highlights, HTML formatting, truncated passages and conspicuous mistranslations. Repeated passages were reconciled while retaining their individual time highlights. See `greek-review.json` for change counts and the remaining automated candidates.

After reviewing all 82 numeric candidates, all 3,640 quotes are Draft=false; the three context-dependent passages were subsequently resolved. See GREEK_PENDING_REVIEW.md for the exact IDs, originals, translations and reasons. Other unparsed expressions are not automatically marked as errors. This pass is not literary certification of every passage or translated book title. The conservative parser compares 2,776 source/Greek time pairs on a 12-hour dial; contextual expressions, approximations, narrative arithmetic and other unparsed phrases still need editorial review. The remaining numeric candidates may reflect legitimate number spelling or time formatting; absence of a finding does not imply approval.

Strict structural validation is also run with Draft=false in memory, so draft exemptions cannot conceal missing highlights or metadata drift. Reproduce the triage with `python3 scripts/audit_translation_quality.py --output /tmp/quote-audit.json` and filter `locale == "el-GR"`.

## Greek typography

`src/modules/locale-fonts.ts` defines alternatives by passage language and theme family, in both light and dark modes:

| Theme | Greek font |
| --- | --- |
| Base and its color variants | Moderustic |
| Handwriting | Mansalva |
| Terminal | Iosevka Charon Mono |
| Bohemian | M PLUS Rounded 1c |

These families were selected by the user. An explicit user font takes precedence. Primary and bilingual quotes resolve their language independently, and changing theme refreshes both. Fonts use the existing Google Fonts loader.
