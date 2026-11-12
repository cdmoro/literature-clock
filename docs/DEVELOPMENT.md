# Development

[← Back to the README](../README.md)

Local setup, quote data and translation tools for contributors. Run the commands below from the repository root.

## Run locally

Install Node.js and npm, plus Python 3.9+ for the quote tools. Node 22 is supported by the translation administrator.

```sh
git clone https://github.com/cdmoro/literature-clock.git
cd literature-clock
npm ci
npm run generate-times
npm run dev
```

The development server opens the clock in your browser.

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run generate-times` | Generate quote JSON files from the CSV files |
| `npm run validate-attributions` | Check localized author and work names against the source catalogues |
| `npm run complete-attributions` | Require explicit attribution forms for every entity in every supported locale |
| `npm run attribution-priorities` | Rank authors and works by the number of quotes they affect |
| `npm run dev` | Start the local clock development server |
| `npm run typecheck` | Check TypeScript types |
| `npm run lint` | Run ESLint |
| `npm run test:ci` | Run the frontend tests once |
| `npm run build` | Build the clock into `dist/` using existing generated quote data |
| `npm run deploy` | Generate quote data and build the clock; does not publish it by itself |
| `npm run preview` | Preview the production build locally |
| `npm run admin` | Start the local translation administrator |
| `npm run translate` | Open the terminal translation manager |

For Python tooling tests, run `python3 -m unittest discover -s scripts -p 'test_*.py'`.

## Quote data

The source catalogues live in `quotes/` as pipe-delimited CSV files. The generator writes one JSON file per available minute and locale under `public/times/`. Regenerate these files after changing quotes. To generate a single locale, run:

```sh
npm run generate-times -- en-US
```

Every quote CSV stores the source author's and book's canonical values in `Author` and `Title`, repeated consistently across locales. Translation tools preserve these columns. Display forms are maintained separately in `quotes/attribution-localizations.json`, independently by author, work, and locale; use conventional author transcriptions and natural book-title translations, and review them before adding. Generated JSON keeps `title` and `author` as localized display forms and adds `title_original` and `author_original` from the canonical source. The “Show original author and title” preference switches to those source values with per-field fallback. Web, macOS and Windows consume the same build-time resolver and native payload builder. Missing catalogue entries deterministically fall back to source values. New quotes reuse existing mappings when their canonical author/work already exist; new entities need reviewed forms for each supported language. Run `npm run validate-attributions` to check references and coverage, or `npm run validate-attributions -- --locale es-MX --show-missing` to list gaps. Use `npm run attribution-priorities -- --locale es-ES --limit 20` to rank unresolved names by quote impact.

## Translation administrator

To contribute a new language, start with the [language incubator guide](LANGUAGE_INCUBATOR.md).

Run `npm run admin` and open **http://127.0.0.1:5174** to create catalogues, translate batches, compare passages with the original, and edit or approve translations. This local application writes to the catalogue CSV files and is separate from the deployed clock.

Complete translations from Calibre or other tools can be imported with `scripts/import_translation.py` and reviewed without running translation batches. `npm run translate` provides a terminal alternative.

New languages start from the union of quote IDs and their declared sources with `Draft=true` and stay out of the language selector until explicitly enabled. After generating the quote data, a URL such as `?locale=el-GR-draft` previews pending quotes without enabling the language. Draft URLs are unlisted, not private.

See the [translation workflow](../scripts/TRANSLATING.md) for requirements, importing, review, backups and language publication.

### UI translation ownership

UI strings are organized by artifact first and feature second: `src/strings/web/<feature>.json`, `src/strings/screensaver/<feature>.json`, and `src/strings/common/<feature>.json`. Web-only strings do not require screensaver version bumps; common strings are versioned for Web and both screensavers, while screensaver strings affect both native savers. The Web and common settings are split by key, and the Web runtime combines them without duplicating keys. Quote catalogues are shared by Web and both screensavers. Check `scripts/component_ownership.py` before adding or moving a translation resource. Unknown translation paths fail validation until their ownership is declared.

The macOS app currently duplicates `common/settings.json` key `settings_attribution_position` in `apple/Shared/App/ClockHomeView.swift` (`WidgetQuoteDetail.detailTitle`); its 12 locale values match. This key has an additional `macOS app` ownership override until the app reads a shared catalogue directly.
