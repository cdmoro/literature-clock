# Language incubator

[← Back to the README](../README.md#language-incubator)

## Bring your language to Literature Clock

A literary clock feels different when it speaks your language. If you can translate from English or help make a translation sound natural, you can help build a new catalogue for Literature Clock.

You can start a language, review a handful of passages, improve book titles or check that the highlighted words tell the right time. You don't need to commit to translating the whole collection. Small batches make it easier to contribute and easier for another reader to review.

The incubator is the project's draft-and-review workflow. It gives new languages room to develop before they appear in the public language selector. Its browser-based administrator runs locally on your computer; there isn't a shared online translation dashboard.

## Find a way to help

| If you'd like to… | Start here |
| --- | --- |
| Bring a missing language to the clock | Propose the language and regional variant in an issue, then create or join its catalogue |
| Translate a few passages | Pick a small batch and compare your translation with the English source |
| Review an existing draft | Check natural wording, meaning, book titles and time expressions |
| Help without installing tools | Open an issue describing your language skills and offer to review passages with other contributors |
| Improve a language already available | Use **Report error** on a quote, or propose a correction in an issue or pull request |

Start by [checking existing issues](https://github.com/cdmoro/literature-clock/issues) and the [catalogues in the repository](../quotes) for work on your language. Then [open an issue](https://github.com/cdmoro/literature-clock/issues/new) or join the existing discussion. Mention:

- The language and regional variant you want to work on.
- Whether you'd like to translate, review or help with the technical setup.
- Any existing work you'd like to build on, and the batch you plan to tackle.

Knowing the language is the most valuable part. Git experience helps with submitting changes, but you can begin by discussing a contribution in an issue. Coordination happens through issues and pull requests; edits in your local administrator are not automatically shared with other contributors.

## From an idea to a published language

### 1. Set up your local workspace

Follow the [development guide](DEVELOPMENT.md#run-locally) to clone the repository and install the prerequisites. From the repository root, start the translation administrator:

```sh
npm run admin
```

Open [the local administrator](http://127.0.0.1:5174). Its dashboard lists catalogues and tracks review progress separately from whether a language is enabled in the clock.

### 2. Create or resume a catalogue

Create the target language in the administrator, or open its existing catalogue. A new language starts with a copy of the British English source and marks its entries as drafts. The copied English text is a starting point, not a completed translation.

Use the language and region agreed for the contribution—for example, `el-GR` for Greek in Greece. Creating a catalogue does not add it to the public language selector.

### 3. Prepare a small batch

Choose the approach that suits you:

- **Translate manually:** edit draft passages in the administrator using the English source for comparison.
- **Start with machine drafts:** use **Translate batch** to request translations from Google, then correct them. Successful translations are saved as drafts, and interrupted work can be resumed.
- **Import a complete translation:** if you've already translated the full catalogue with Calibre or another tool, use the [import instructions](../scripts/TRANSLATING.md#import-a-complete-translation-from-calibre-or-another-tool), then review it in the administrator. This importer expects a complete catalogue with preserved source IDs; it is not a partial-batch importer.

Machine translation is optional. The batch tool sends text to Google's unofficial public endpoint, which may temporarily reject requests. Saved work can be resumed later; see the [technical workflow](../scripts/TRANSLATING.md) for details.

### 4. Review for meaning, language and time

For each passage, compare the draft with its English source and check:

- **Meaning and voice:** preserve the passage's meaning and tone, without omissions or added details. Read it as prose, not just as a translated sentence.
- **The time expression:** the highlighted words must appear exactly in the translated passage and mean the same time as the source. Watch for AM/PM, “quarter to”, “half past” and approximate times. Do not make an approximate source more precise.
- **Book titles and names:** check the title and preserve the author. A machine-translated title is not evidence of a published edition's title.
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
