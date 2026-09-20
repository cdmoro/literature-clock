# Translating a catalogue in batches

`translate_catalogue.py` reads the British English catalogue and uses Google's
unofficial public translation endpoint. It needs Python 3.9+ and no additional
packages. The service may reject requests even when they are spaced out.

This is a **new catalogue tool**. `add_quote.py` remains the
interactive tool for adding a single quote. Adding the new language to the
website is a separate, explicit step after the language is complete and reviewed.
Unlisted draft URLs are available earlier for previewing work in progress.

## Local web administrator (recommended)

```sh
npm ci
npm run admin
```

Open `http://127.0.0.1:5174`. This is a separate Vite application, backed by a
loopback-only Python API. It is never included in the clock's production build.
Python 3.9+ and Node 22 are supported; the administrator needs no Python packages.

The dashboard lists every target catalogue and separates approval progress from
whether a language is enabled in the clock. Create a locale, translate a batch,
search/filter its quotes, compare with the original, edit and approve from the
browser. Each completed Google translation is written immediately to its CSV
with `Draft=true`, including completed rows before an interruption. Human edits
are preserved on resume. Approving writes `Draft=false`; saving as draft revokes
approval. Backups live in `.translation-work/<locale>/backups/`.

A newly created locale stays out of the normal clock and selector, even after all
its quotes are approved. Enabling a language still requires a separate, explicit
change to the interface strings, fallback messages, locale mapping and selector.
Approval is not language publication.

**Create catalogue PR** shows a confirmation before preparing an isolated checkout,
committing only the selected CSV, pushing a new branch and opening a GitHub PR.
It requires authenticated Git and `gh`, leaves your working branch alone, and does
not merge or enable a new language. Draft rows remain drafts in that PR. Network
or validation failures are shown in the dashboard. A failure after push can leave
the new branch on the remote for inspection; the current checkout is not changed.

Only one translation/publication job runs at a time. The API blocks concurrent
edits during that job and rejects stale edit forms; use Reload if a CSV changed
outside the administrator. Do not run the CLI as another writer at the same time.

### Clock previews through a draft URL

Use **Generate clock preview**, then open your separate clock development server
(`npm run dev`) with `?locale=el-GR-draft&time=07:30`, for example. Normal generation
(`npm run generate-times`) also produces `<locale>-draft` data for each catalogue.
Draft URLs work before the language is registered, display a draft notice, and use
English interface/fallback strings until the language has its own strings.
They do not add options to the selector or random-language pool.

The draft view includes approved and pending CSV rows. Newly copied source text
is still English until translated. A draft with an unresolved time highlight is
skipped by the clock, but remains editable in the administrator. A normal locale
only gets generated data when registered, and its drafts remain excluded.
Legacy `.draft.csv` files remain supported when no full catalogue exists.

Draft clock URLs are unlisted previews, **not private URLs**: once their catalogue
is committed and deployed, anyone with the draft URL can view it. The administrator
and its editing API remain local-only. Preview generation does not change approval
or registration, and never makes `locale=el-GR` work for an unpublished language.

## Interactive menu (legacy alternative)

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
The separate clock view `?locale=<locale>-draft` now includes pending CSV rows
after time-data generation; it also works for unregistered languages.

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

Once a language is complete and reviewed, explicitly add its interface strings,
color-control strings, fallback quotes, selector option and locale mapping.
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

Normal CSVs generate a separate `<locale>-draft` preview containing pending and
approved quotes with valid time highlights. See the clock preview instructions
above. A legacy `quotes.<locale>.draft.csv` is only used if there is no full CSV
for that locale. Preview-only locales are never added to the selector or random pool.

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
