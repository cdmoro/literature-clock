# Language incubator

[← Back to the README](../README.md#language-incubator)

## Source language and regional variants

Every row has one `Source locale` column, shared by all versions of the same ID.
It describes the reference passage, not the author's nationality or the language
of the current translation. Both general (`en`, `es`) and regional (`es-AR`,
`es-CO`, `es-CL`, `en-US`) values are accepted. Use a general language when the
regional provenance is unknown.

The resolver first uses an exact catalogue if present, then the configured
language default: English → `en-GB`, Spanish → `es-ES`, Portuguese → `pt-PT`,
French → `fr-FR`, Italian → `it-IT`, German → `de-DE`. Other languages can use a
single unambiguous catalogue; configure a default if several variants exist.
An Argentine passage can therefore live in `quotes.es-ES.csv` without adapting
its idioms. Same-language drafts retain the source text; regional punctuation
and time notation differences are allowed during review.

The source row must exist with the same ID and be published. Adding an exact
regional catalogue requires those source rows before it can replace the fallback.
Run `python3 scripts/quote_sources.py` to check references and origin agreement.
This check runs in CI. Use `python3 scripts/quote_sources.py --output /tmp/source-passages.csv`
to export the resolved passages for an external translation tool. It does not certify linguistic accuracy or require every
translation to have identical text. The translation validator additionally checks
metadata, time highlighting and formatting against the resolved source.

The administrator shows the actual source locale, including when editing English.
Machine translation uses the source language instead of assuming English; caches
are separated by source language. Importing an external CSV restores source
metadata by ID, including `Source locale`. Legacy seven-column imports remain
accepted; committed catalogues must retain the new column.

Existing saved reviews whose source has changed are rejected as outdated, and
machine checkpoints retain outdated drafts in `obsolete_rows`. Back up old review
files and re-review affected passages against the resolved source; approvals are
not automatically transferred to a different reference.

To add quotes, use `python3 scripts/add_quote.py`, or
`python3 scripts/add_quote_batch.py passages.csv --source-locale es-AR`.
Batch rows can override that default with their own `Source locale`.

## Bring your language to Literature Clock

A literary clock feels different when it speaks your language. If you can translate from English or help make a translation sound natural, you can help build a new catalogue for Literature Clock.

You can start a language, review a handful of passages, check attribution or verify that the highlighted words tell the right time. You don't need to commit to translating the whole collection. Small batches make it easier to contribute and easier for another reader to review.

The incubator is the project's draft-and-review workflow. It gives new languages room to develop before they appear in the public language selector. Its browser-based administrator runs locally on your computer; there isn't a shared online translation dashboard.

## Find a way to help

| If you'd like to… | Start here |
| --- | --- |
| Bring a missing language to the clock | Propose the language and regional variant in an issue, then create or join its catalogue |
| Translate a few passages | Pick a small batch and compare your translation with the declared source |
| Review an existing draft | Check natural wording, meaning, book titles and time expressions |
| Help without installing tools | Open an issue describing your language skills and offer to review passages with other contributors |
| Improve a language already available | Use **Report error** on a quote, or propose a correction in an issue or pull request |

Start by [checking existing issues](https://github.com/cdmoro/literature-clock/issues) and the [catalogues in the repository](../quotes) for work on your language. Then [open an issue](https://github.com/cdmoro/literature-clock/issues/new) or join the existing discussion. Mention:

- The language and regional variant you want to work on.
- Whether you'd like to translate, review or help with the technical setup.
- Any existing work you'd like to build on, and the batch you plan to tackle.

Knowing the language is the most valuable part. Git experience helps with submitting changes, but you can begin by discussing a contribution in an issue. Coordination happens through issues and pull requests; edits in your local administrator are not automatically shared with other contributors.

## Keep the connection between languages intact

**Never change a quote's `Id`. It is the only reliable key we use to track the same passage across translations.** Matching text, book titles, row positions or clock times cannot replace it: wording changes between languages and several quotes can belong to the same minute. Bilingual mode also uses this ID to find the matching translation.

Copy each ID exactly from the declared source and keep it attached to that same passage throughout translation, conversion, review and export. Treat IDs as text: never translate, renumber, regenerate, trim or reformat them, and preserve leading zeros and punctuation. A complete catalogue must contain every source ID exactly once, with no missing, duplicate or invented IDs. Correct-looking IDs attached to the wrong passages are also an error; check the mapping as well as the list of IDs.

To keep the translation focused and simple:

- **Authors (`Author`): always keep the source name exactly as it is.** Do not translate, transliterate or normalize it.
- **Book titles (`Title`): preferably keep the source title unchanged.** Translating titles is not required to contribute a language. If you deliberately use a verified published title in the target language, flag it for review; do not invent a title through literal or machine translation.
- **Passage and time phrase (`Quote`, `Quote time`): focus your translation work here.** Keep the source `Time` and `SFW` values unchanged as well.

These rules apply whichever translation tool you choose. The built-in batch tool may produce translated title drafts; during review, prefer restoring the source title unless a deliberate, verified localized title is being used.

## From an idea to a published language

### 1. Set up your local workspace

Follow the [development guide](DEVELOPMENT.md#run-locally) to clone the repository and install the prerequisites. From the repository root, start the translation administrator:

```sh
npm run admin
```

Open [the local administrator](http://127.0.0.1:5174). Its dashboard lists catalogues and tracks review progress separately from whether a language is enabled in the clock.

### 2. Create or resume a catalogue

Create the target language in the administrator, or open its existing catalogue. A new language starts with a copy of each passage from its declared source and marks its entries as drafts. The copied source text is a starting point, not a completed translation.

Use the language and region agreed for the contribution—for example, `el-GR` for Greek in Greece. Creating a catalogue does not add it to the public language selector.

### 3. Choose how to prepare your translation

**Thousands of quotes do not have to mean thousands of translations written from scratch.** You can generate a first draft of the whole catalogue, then review it a little at a time. Or translate and review one small batch before starting the next. Both approaches fit the incubator.

Start with a pilot of 10–25 varied passages to check the language, time expressions and file format before scaling up. These are quotes, sometimes containing several sentences; a batch of 25 means 25 catalogue entries.

| Approach | A good fit when… | How it reaches the incubator |
| --- | --- | --- |
| Manual translation, optionally assisted by Google Translate | You want close control or only have time for a few passages | Edit and save drafts in the administrator |
| Built-in Google translation batches | You want the tools to manage IDs, saving and progress | Translate 25 quotes at a time in the administrator, or run resumable batches from the terminal |
| Calibre with Ebook Translator | You already use an ebook translation workflow | Convert the results back to the catalogue CSV format, then import the complete file |
| An AI assistant or agent | You want help drafting, organizing batches or checking consistency | Have it produce a complete CSV with preserved IDs, then import and review it |

#### Option A: translate manually, with help when useful

Open a draft in the administrator and translate it yourself, or paste the source passage into [Google Translate](https://translate.google.com/) to get a starting point. Read and edit the result before saving it. Keep the author unchanged, preferably keep the source book title, and choose the exact words in the translated passage that express the time.

Work passage by passage so that text stays attached to the correct ID. Avoid pasting a raw CSV into a translation website and assuming it will preserve headers, separators and metadata. This approach works well for a small contribution and for fixing difficult passages after a larger automated run.

#### Option B: use the built-in batches of 25

In the administrator, **Translate batch** requests Google translations for 25 quotes by default. Successful results are saved as drafts, and interrupted work can be resumed. You can review that batch immediately or continue generating drafts first.

To prepare the entire catalogue through repeated batches, the terminal tool offers a resumable run. For example, for Greek:

```sh
python3 scripts/translate_catalogue.py --target el --all --batch-size 25 --delay 4 --batch-pause 60
```

Replace `el` with the target's Google language code. This requests batches with pauses, saves checkpoints and stops when drafting is complete, on a service error, or when you interrupt it. Run the same command again to resume. Terminal drafts live in a separate translation workspace; follow the [terminal workflow](../scripts/TRANSLATING.md#translate-a-complete-language) for reviewing and exporting them into a catalogue.

The built-in tools use Google's unofficial public endpoint, which may temporarily reject requests. If the service blocks requests, keep the saved progress and wait before resuming. Generating every draft is a milestone; you can review the results gradually afterwards.

#### Option C: use Calibre's Ebook Translator

If you already work with Calibre, [Ebook Translator](https://github.com/bookfere/Ebook-Translator-Calibre-Plugin) is another way to prepare draft text. It translates ebooks; it is not a direct Literature Clock CSV integration.

This route needs a conversion step: prepare an ebook-compatible document containing the passages with their source IDs, translate it, then map the translated passages back into the catalogue CSV. Keep a separate copy of the original ID-to-passage mapping. Test a small sample through the entire round trip before translating everything—if IDs or passage boundaries change, the result must be repaired before importing.

Use the plugin's documentation for installation and translation-engine setup. After conversion, follow the complete-file import steps below. An EPUB or other ebook output cannot be passed directly to the catalogue importer. If you do not already have a reliable conversion workflow, the built-in batches require less preparation.

#### Option D: ask an AI assistant or agent

An AI assistant can draft translations, compare wording and flag suspicious time expressions. An agent with file access can also split the catalogue into batches, save progress and assemble the result. This is an external workflow you run with your chosen tool; the incubator does not call an AI provider itself.

Give it the declared source catalogue and a precise target language and region. Ask it to process small batches, preserve IDs, save checkpoints and report unfinished work instead of attempting thousands of quotes in one chat response. A useful starting prompt is:

```text
Prepare a draft translation of the resolved source passages into [language and region].
Read scripts/TRANSLATING.md for the catalogue format before starting.

First translate a pilot of 25 entries for me to inspect. After I approve the
approach, continue in batches, saving progress so interrupted work can resume.
Write to a new file outside quotes/; never overwrite the source catalogue.

Use UTF-8, pipe-delimited CSV with the catalogue headers. Preserve every
source Id exactly once and attached to its original passage. IDs are the only
cross-language tracking key: never translate, renumber, regenerate or reformat
them. Treat them as text and preserve leading zeros and punctuation.
Keep Time, Id, Author, SFW and Source locale exactly unchanged. Keep Title unchanged too for
this translation task. Translate only Quote and Quote time.
Preserve intentional <br> and <em> formatting and
use proper CSV quoting for embedded pipes, quotes and newlines.

Make Quote time an exact substring of the translated Quote that expresses the
same time as the source. Preserve approximate times; do not invent precision.
If unsure, leave the time highlight empty and list the ID for human review.
Do not invent published book titles or claim that wording is edition-verified.

Keep all output unapproved: set Draft=true if including a Draft column.
Do not silently skip, duplicate, summarize or truncate entries. Record completed
and pending IDs separately. Assemble the complete output only when all entries
have been processed, and check its IDs against the source before handing it over.
Do not publish, enable the language, or mark translations as human-reviewed.
```

An AI can also provide a second pass for consistency, but its confidence is not a substitute for a reader who knows the language. Keep uncertain passages in draft for review.

#### Bring an external translation into the administrator

For Calibre, an AI agent or any other external tool, the importer expects a **complete UTF-8, pipe-delimited CSV** with every source ID exactly once and the original headers:

```text
Time|Id|Quote time|Quote|Title|Author|SFW|Source locale
```

An optional `Draft` column is accepted. The importer takes the translated quote, time phrase and title, restores source metadata by ID and marks every imported row as draft. It does not approve translations.

For example, with a complete Greek translation saved outside `quotes/`:

```sh
python3 scripts/import_translation.py /path/to/greek-translation.csv --output quotes/quotes.el-GR.csv
python3 scripts/validate_translation.py quotes/quotes.el-GR.csv
npm run admin
```

The output must be a new path. If you already created that catalogue in step 2, do not overwrite it or discard reviewed work; consult the [import workflow](../scripts/TRANSLATING.md#import-a-complete-translation-from-calibre-or-another-tool) and coordinate how to incorporate the external work. This importer is for complete catalogues, not partial batches. For small contributions, editing drafts in the administrator is the simpler route.

Importing or passing structural validation does not mean the language is ready. Open it in the administrator and review the drafts below.

#### Make the review manageable

Separate **drafting progress** from **review progress**. Producing an entire first draft can remove the blank-page problem, while reviewing 10–25 passages at a time keeps each session bounded. Pick a batch, correct it, save your progress and stop whenever you need to.

If several people are helping, agree on source IDs or time ranges in the issue so work does not overlap. Share small pull requests, note uncertain passages and resume with the next batch. Nobody needs to finish the whole language in one sitting—or alone.

### 4. Review for meaning, language and time

For each passage, compare the draft with its declared source and check:

- **Meaning and voice:** preserve the passage's meaning and tone, without omissions or added details. Read it as prose, not just as a translated sentence.
- **The time expression:** the highlighted words must appear exactly in the translated passage and mean the same time as the source. Watch for AM/PM, “quarter to”, “half past” and approximate times. Do not make an approximate source more precise.
- **IDs:** verify that every ID is unchanged and still belongs to the same source passage. Never repair a mismatch by inventing or renumbering IDs.
- **Book titles and names:** preserve the author exactly and preferably retain the source title. If using a localized title, verify it against a published edition and flag the change for review. A machine-translated title is not evidence of a published edition's title.
- **Formatting:** preserve intentional emphasis and line breaks.

For example, a source phrase such as “a quarter to eight” means 7:45. A fluent translation that means 8:15 would still be wrong for the clock, even if its words are highlighted correctly.

Approve a passage only when you've checked it. Leave uncertain entries as drafts and raise questions in the contribution's issue or pull request. Automated validation checks structure and the presence of the highlighted phrase; it cannot judge literary quality or prove that the phrase means the right hour.

The administrator saves edits to the catalogue and keeps local backups. Approval marks a row as reviewed; it does not publish a language.

### 5. See it in the clock

Use **Generate clock preview** in the administrator, then start the clock in another terminal:

```sh
npm run dev
```

Open the clock's local address with a draft locale and a minute from your batch, for example `?locale=el-GR-draft&time=07:30`. This lets you check the passage, attribution and time highlight in the actual themes.

Draft previews include pending and approved entries and show a draft notice. Untranslated entries can still be in English; entries without a usable time highlight are skipped in the preview but remain editable in the administrator. The interface uses English until the new language has its own interface strings.

A local preview stays on your computer. If draft data is committed and deployed, its URL is unlisted, **not private**. Previewing never enables the language in the selector.

### 6. Share progress for review

Submit your catalogue changes in a pull request and describe what you translated, what you reviewed and what still needs attention. You can share a reviewed batch while the rest of the catalogue remains in draft.

The administrator's **Create catalogue PR** action can prepare a pull request containing the selected CSV. It requires authenticated Git and GitHub CLI access and permission to push to the configured remote; the action asks for confirmation before proceeding. You can also use the usual fork-and-pull-request workflow. See the [administrator instructions](../scripts/TRANSLATING.md#local-web-administrator-recommended) for details.

Keep pending work marked as draft. A catalogue pull request does not merge itself or enable a new language, and your local backups and review workspace are not a shared collaboration service.

### 7. Enable the completed language

Once the catalogue is complete and reviewed, coordinate a separate change to make it available in the clock. That includes translating the interface and fallback messages, registering the locale and adding it to the language selector.

These are separate milestones:

| Milestone | What it means |
| --- | --- |
| Draft created | There is a catalogue to work on |
| Passages approved | Those translations have been reviewed |
| Contribution merged | The accepted changes are in the repository |
| Language enabled | The completed, reviewed language has been registered for clock users |

Finishing the translation does not automatically perform the final registration. The [technical translation workflow](../scripts/TRANSLATING.md#start-a-language-and-publish-gradually) explains the files and publication steps.

## Ready to start?

[Propose a language or offer to review one](https://github.com/cdmoro/literature-clock/issues/new). Tell us what you speak and how you'd like to help—even if your first contribution is just a few carefully chosen passages.
