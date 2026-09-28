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
| `npm run generate-times` | Generate quote JSON files and catalogue statistics from the CSV files |
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

The source catalogues live in `quotes/` as pipe-delimited CSV files. The generator writes one JSON file per available minute and locale under `public/times/`, along with catalogue statistics. Regenerate these files after changing quotes. To generate a single locale, run:

```sh
npm run generate-times -- en-US
```

## Translation administrator

Run `npm run admin` and open **http://127.0.0.1:5174** to create catalogues, translate batches, compare passages with the original, and edit or approve translations. This local application writes to the catalogue CSV files and is separate from the deployed clock.

Complete translations from Calibre or other tools can be imported with `scripts/import_translation.py` and reviewed without running translation batches. `npm run translate` provides a terminal alternative.

New languages start from `quotes.en-GB.csv` with `Draft=true` and stay out of the language selector until explicitly enabled. After generating the quote data, a URL such as `?locale=el-GR-draft` previews pending quotes without enabling the language. Draft URLs are unlisted, not private.

See the [translation workflow](../scripts/TRANSLATING.md) for requirements, importing, review, backups and language publication, and the [deployment guide](DEPLOYMENT.md) for hosting and search visibility.
