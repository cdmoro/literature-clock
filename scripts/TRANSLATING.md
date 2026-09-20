# Translating a catalogue in batches

`translate_catalogue.py` reads the British English catalogue and uses Google's
unofficial public translation endpoint. It needs Python 3.9+ and no additional
packages. The service may reject requests even when they are spaced out.

This is a **new catalogue tool**. `add_quote.py` remains the
interactive tool for adding a single quote. Adding the new language to the
website can happen as soon as its interface and fallback messages are ready;
only reviewed quotes are published.

## Interactive menu (recommended)

Start with one command from the repository root:

```sh
npm run translate
```

Only Python 3.9+ is needed for the manager; no Python packages, frontend build or
Google credentials are required. Alternatively run `python3 scripts/translation_manager.py`.
Choose numbered options to create a language or resume a saved workspace. Creating
a language asks for its locale (for example `el-GR`) and Google code (`el`); it
initializes the full draft CSV or adopts an existing full catalogue without rewriting it.

Inside a language, the menu offers:

1. Translate the next batch with Google (25 quotes by default).
2. Review/edit pending translations: compare the original, correct quote/title/time,
   then explicitly approve or skip each quote. Structural errors block approval.
3. Open a local browser preview with original and translation side by side,
   highlighted time, review status, search and pagination.
4. Export a separate JSON review file for a person or AI.
5. Import that reviewed file, checking source identity, metadata and approved rows.
6. Apply approved translations to the local catalogue, retaining pending drafts
   and backing up the previous CSV. Commit the updated CSV in a PR to publish it.

Translation sends texts to Google, but checkpoints, reviews and backups stay in
`.translation-work/<locale>/`, ignored by Git. Corrections and approvals are saved
in `review.json`, separate from regenerated machine drafts. Interrupted batches
keep successful translations. Existing workspaces made with this menu resume from
the language list. Adding a language also copies compatible progress from the
older `.translation-work/<google-code>/state.json` location when present; the
original checkpoint is left intact. Custom checkpoint paths are not auto-discovered.
Import separately edited review files with option 5.

For AI review, export with option 4, have the reviewer correct `translation` and
set `approved: true` only after checking language and the meaning of the time,
then import with option 5. Preserve each `source`, ID and metadata. Import accepts
partial reviews and retains other entries; existing reviews are backed up. The
manager does not call an AI provider itself or consider a structural pass proof
of translation quality.

### Seeing pending drafts in the browser

Choose option 3 inside the language workspace. It opens an address such as
`http://127.0.0.1:49152/` and prints the link if the browser does not open.
Keep the language menu running; returning to the language list closes its server.
Refresh the page after saving corrections. Drafts appear before approval, and a
new locale works without registering interface strings in the clock.

This is a **local review page**, separate from the clock and its skins. It does
not write files to `public/` or expose unapproved quotes on the deployed site.
The older `?locale=<supported-locale>-draft` clock view only reads generated
`.draft.csv` preview catalogues and still excludes rows marked `Draft=true`.
Use the menu preview to inspect actual unapproved machine translations.

## Start a language and publish gradually

The canonical British English catalogue is `quotes/quotes.en-GB.csv`.
Create a full copy with every quote marked as a draft (no network requests):

```sh
python3 scripts/translate_catalogue.py --init-catalogue quotes/quotes.el-GR.csv
```

This preserves all source IDs, text and metadata and adds an eighth column,
`Draft`, set to `true`. Existing files are never overwritten. Translate and review
rows gradually, then set `Draft=false` for each approved quote. Machine translation
alone does not approve a quote. The copied English text stays hidden until approved.
Legacy seven-column CSVs remain supported and are treated as published. If the
`Draft` column exists, every value must be `true` or `false` (case-insensitive);
blank or misspelled values fail validation and generation.

To incorporate a reviewed batch into the full catalogue:

```sh
python3 scripts/translate_catalogue.py \
  --export-reviewed translations/el-GR/batch.review.json \
  --catalogue quotes/quotes.el-GR.csv \
  --output translations/el-GR/next.csv
python3 scripts/validate_translation.py translations/el-GR/next.csv
```

Inspect `next.csv`, then replace `quotes/quotes.el-GR.csv` with it. Approved rows
are merged by ID with `Draft=false`; other rows retain their text and draft status.
Output must be a new path, protecting the current catalogue. For manual translation,
edit the catalogue directly and run the same validator.

Validation requires every source ID exactly once and preserved metadata even for
drafts, but permits unfinished text in draft rows. It reports published/total quotes
and the draft count. The time generator excludes drafts and removes stale generated
files; minutes with no published quotes use the existing localized fallback.
Generated `.statistics.json` files distinguish `publication_progress` (quotes)
from `progress` (minutes covered), and include published, draft and total counts.

A language can be enabled below 100%: add its interface strings, color-control
strings, fallback quotes, language selector option and locale mapping as usual.
The CSV alone does not register a new language. No new language is enabled by
these commands.

## Translate a complete language

```sh
python3 scripts/translate_catalogue.py --target el --all --batch-size 25 --delay 4 --batch-pause 60
```

This runs batches of at most 25 new drafts with a 60-second pause between batches.
It stops when every source ID has a draft, on a service error/block, or when you
interrupt it. Run the **same command** again to resume from the missing IDs.
No review is required between batches; translation and review are separate stages.
Completeness means every ID has received quote, title and time-candidate responses,
not that those translations are correct or that every time highlight is resolved.

Without `--all`, each invocation processes at most one batch. To start with a
pilot spread across the day instead:

```sh
python3 scripts/translate_catalogue.py --target el --pilot --batch-size 25 --delay 4
```

Use Google language codes: `el` for Modern Greek, `ja` for Japanese, `ar` for
Arabic, `nl` for Dutch, or `zh-CN` for Simplified Chinese. The source is always
translated as English; by default it is the project's `quotes.en-GB.csv` (British
English, the project's original source catalogue).

## Inspect progress and resume

```sh
python3 scripts/translate_catalogue.py --target el --status
```

Status is read-only and makes no network requests. It shows translated and pending
counts, IDs to process next, unresolved time highlights and any active cooldown.
Progress files are automatically separated by target language:

- `.translation-work/<target>/state.json`: saved responses and drafts.
- `.translation-work/<target>/progress.json`: full lists of translated, pending,
  partially cached and structurally unresolved IDs, plus `translation_complete`.
- `.translation-work/<target>/draft-review.json`: the raw drafts for later review.

Successful requests are cached immediately. Quotes, titles and time candidates
share a cache, so identical text is translated only once, including when an
interruption occurs halfway through a quote. No blank or failed row counts as a
complete draft just because its ID is present. Generated files are ignored by Git.

## Live draft previews

After exporting a partial review, save it as `quotes/quotes.<locale>.draft.csv`,
for example `quotes/quotes.el-GR.draft.csv`. The time generator maps that file to
`public/times/<locale>-draft/`, which can be opened with `?locale=el-GR-draft`.
Drafts use the base locale's interface strings and fallback behavior, but remain
excluded from random language selection and supported-language lists. Keep the
`.draft.csv` suffix for optional separate previews. This is independent of the
per-row `Draft` column, which is also respected in previews; a normal catalogue
can be published with draft rows still pending.

Source IDs, clock times, authors and SFW classifications are preserved. Resuming
compares full source rows by ID: added quotes become pending, unchanged quotes are
kept, and edited or removed originals have their old drafts archived in
`obsolete_rows`. Edited quotes become pending again; cached unchanged text can
still be reused. A state file cannot be reused for another target language.
Use `--state` to choose a different checkpoint path if needed. Run only one writer
per state file at a time.

There is a configurable interval between requests (four seconds by default).
Transient network/server failures receive at most three attempts, with increasing
waits. HTTP 403 or 429 stops the run immediately, preserves progress and records a
cooldown of at least one hour, honoring longer `Retry-After` values. Wait before
resuming; no delay can guarantee access. Failed requests never become placeholder
translations in the catalogue.

## Review before export

The script writes `draft-review.json` alongside its state. **Copy this to another
file before editing**, because the draft is regenerated after each run. Each
entry includes the original, translation, time candidate and structural issues.

For every quote:

- Read the entire source and translation for omissions, unnatural language and
  changes in meaning. Check names and consistent book titles. Translated titles
  are not claims about published editions.
- Find the exact expression of time within the translated quote. Set `Quote time`
  to that exact substring. A separately translated candidate is only a suggestion;
  if it does not occur in the quote, the field is deliberately left empty.
- Check the **meaning** of that expression against the original, including AM/PM,
  “quarter to”, relative times and intentionally approximate times. Substring
  matching cannot prove that the time is correct. Do not turn an approximate
  source time into a more precise one.
- Preserve `<br>` and `<em>` formatting and set `approved` to `true` only after
  checking both language and time. Add `review_notes` to explain corrections.

Export only a reviewed file:

```sh
python3 scripts/translate_catalogue.py \
  --export-reviewed translations/el-GR/pilot.review.json \
  --output translations/el-GR/pilot.csv
```

Export checks the current originals and structural validity again, refuses
unapproved or duplicate entries and refuses to overwrite an existing file.
It writes UTF-8, pipe-delimited CSV with `Draft=false` for approved rows. Without
`--catalogue`, output contains only the reviewed batch; merge it into an initialized
full catalogue before using full-coverage validation.

Validate the full catalogue, including pending draft rows, before publishing:

```sh
python3 scripts/validate_translation.py quotes/quotes.el-GR.csv
```

Structural validation checks completeness, IDs, metadata, formatting and the
presence of the time substring. It does **not** assess translation quality or
prove the semantic correctness of the hour.

Tests (no network or dependencies required):

```sh
python3 -m unittest discover -s scripts -p 'test_*.py'
```

The older `add_quote_batch.py` is not used for this workflow: it does not pace
successful requests, writes a different column order/delimiter and substitutes
failure text. `add_quote.py` remains the interactive single-quote tool and marks new rows as
`Draft=true` when adding to a catalogue with that column.
