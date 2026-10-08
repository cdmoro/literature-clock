# Literature Clock

A clock for book lovers that tells the time using quotes from literature. Support for multiple languages, themes, and more!

Based on the work of [Johannes Enevoldsen](https://twitter.com/JohsEnevoldsen) ([literature-clock](https://github.com/JohannesNE/literature-clock)) and [Jaap Meijers](http://www.eerlijkemedia.nl/) ([e-reader clock](https://www.instructables.com/id/Literary-Clock-Made-From-E-reader/)).

![Literature Clock displaying a literary quote with the time highlighted](https://github.com/user-attachments/assets/15fedb98-8d39-418a-86fa-a7fd9d0077d2)

**[Open Literature Clock](https://literatureclock.netlify.app/)** · [Themes](#themes) · [Settings](#settings) · [Screensaver](#screensaver) · [Language incubator](#language-incubator) · [Contributing](#contributing) · [Development](#development)

> **Help test the native macOS screensaver!** Read literary quotes with bundled fonts, seven themes and configurable languages, colours and motion. Experimental downloads will appear in [Releases](https://github.com/cdmoro/literature-clock/releases) under tags named `macos-native-vX.Y.Z`, independently of web releases. Download `Literature-Clock-Native-macOS.zip` when attached under **Assets**. See [installation instructions and known limitations](screensavers/macos-native/README.md), then [share feedback](https://github.com/cdmoro/literature-clock/issues/new/choose) with your macOS version, Apple Silicon/Intel model and whether you tested Preview or automatic activation. Until a build is published, you can build it from source.

## Features

- **A little literature, every minute.** Read a passage that mentions the current time, with its book and author. The layout adapts to desktop and mobile screens.
- **Make it your own.** Read on a textured **Book Page**, watch the day unfold in **Horizon**, or explore Poster, Terminal, Handwriting and more. Choose light, dark or system appearance, custom accent colours and Google Fonts.
- **Read across languages.** Choose from seven languages, including British and American English catalogues. Pick your quote languages independently of the interface, rotate between them, or enable **bilingual mode** to see a matching translation below the passage.
- **Take your time.** Pause a quote, browse other quotes for the same minute, then return to the live clock whenever you're ready.
- **Keep the passages you love.** Save favourites and revisit recently displayed quotes in **My quotes**, without an account.
- **Share the exact quote.** Send a direct link to the displayed passage, copy it when native sharing isn't available, or download an image.
- **Set the mood.** Use Zen mode, fullscreen or a gently moving screensaver. Choose fade, slide, blur or zoom transitions—or no animation—and toggle the time and progress bar.
- **Filter explicit passages.** Work mode shows only quotes whose `SFW` classification is `true`.

## Themes

![A selection of Literature Clock themes](https://github.com/user-attachments/assets/d882b15c-0947-45ed-8456-25f56fb6083c)

A few places to start:

| Theme | Look and feel | Try it |
| --- | --- | --- |
| Book Page | Paper texture, book typography and a highlighted time | [Light](https://literatureclock.netlify.app/?theme=book-light) · [Dark](https://literatureclock.netlify.app/?theme=book-dark) |
| Horizon | A sky that changes with the time of day | [Open Horizon](https://literatureclock.netlify.app/?theme=horizon-system) |
| Poster | Bold typography in a decorative frame | [Open Poster](https://literatureclock.netlify.app/?theme=poster-system) |
| Terminal | A terminal-inspired reading display | [Open Terminal](https://literatureclock.netlify.app/?theme=terminal-dark) |
| Random colours | A different colour theme each minute | [Try random colours](https://literatureclock.netlify.app/?theme=color-system) |

Explore the full selection in **Settings**: Base, colour themes, Retro, Elegant, Festive, Bohemian, Book Page, Handwriting, Anaglyph, WhatsApp, Terminal, Frame, Subtle, Poster, Horizon, Photo and Kindle. Themes offer light, dark and system variants; supported themes also let you choose an accent colour and reset it to the theme default.

## Reading and collecting quotes

**Pause and browse.** The pause button holds the current passage while the real clock continues. The circular-arrow button pauses reading and cycles through available quotes for that minute and language, visiting each before repeating. **Back to live clock** resumes the current minute, including in Zen mode. Pausing only affects the current page and is not saved as a preference.

**Read aloud.** The speaker button reads the displayed quote and switches to Stop during playback. In Settings → Behaviour → Read aloud, you can enable reading at each new minute and optionally include the visible book title and author. Automatic reading is saved in this browser, but must be activated for each visit with the speaker or Activate reading button. A manual reading finishes even if the clock advances; automatic reading replaces it with the new minute’s quote. Navigating to another quote or hiding the tab stops speech. Browser or voice errors are reported with a retry action; voices and audio availability depend on the browser and device.

**Favourites and history.** Use the heart to save a passage, then open **My quotes** to see your Favourites and Recent tabs. The browser keeps up to 500 favourites and the last 100 distinct displayed quotes. Reopen a passage, remove a favourite or clear recent history independently. These collections stay in this browser; clearing its data removes them. Work mode hides explicit entries without deleting them.

**Sharing and reporting.** Shared links identify the quote by language, minute and stable ID, and include its theme, font and colour. Opening one starts paused so the recipient can read it. Content filters still apply; unavailable or filtered quotes show a notice and an available alternative. The **Report error** link also includes a direct quote link to help locate the passage that needs correcting.

## Languages and bilingual mode

| Language | Locale |
| --- | --- |
| British English | `en-GB` (default) |
| American English | `en-US` |
| Spanish | `es-ES` |
| Portuguese | `pt-PT` |
| French | `fr-FR` |
| Italian | `it-IT` |
| German | `de-DE` |
| Greek | `el-GR` |
| Simplified Chinese | `zh-CN` |
| Russian | `ru-RU` |
| Esperanto | `eo` |

The clock initially follows your browser's language. In **Settings**, choose an interface language and select one or more quote languages. An empty selection follows the interface language; multiple selections rotate quotes between those languages.

Enable **bilingual mode** and choose a translation language to display the matching catalogue translation beneath the quote. This uses existing translations, not live machine translation. When a translation is unavailable, or the passage is already in the selected locale, the clock explains why a second passage isn't shown.

Explicit URL and saved locale choices are preserved. Generic English (`en`), unsupported English regions and unrecognized languages fall back to `en-GB`. Locale matching ignores case and accepts underscores, such as `en_US`.

### About the catalogues

The `en-GB` catalogue preserves the original English quotes. The `en-US` catalogue starts from the same collection and uses colons for numeric times, such as `7:59` instead of `7.59`. This is a notation adaptation, not a verification of every US book edition.

Many translations were originally made with Google Translate and may need corrections. Contributions that improve wording, book titles and time references are welcome. If a minute has no eligible quote, the clock displays a localized fallback.

## Language incubator

**Speak a language that is missing from the clock? Help bring it to life.** You can start a new catalogue, translate a few passages or review someone else's work. You don't have to take on an entire language alone: a small, carefully reviewed contribution is a useful start.

The **language incubator** is the workflow for growing new catalogues before they join the clock. A local translation administrator lets you create a language, prepare draft translations, compare them with the declared source, edit and approve passages, and preview them in the clock. You can prepare drafts manually, with built-in batches of 25, through Calibre or with an AI agent, then review a few passages at a time. You don't have to translate thousands of quotes from scratch; people who know the language make those drafts worth reading.

Keep author names unchanged and preferably retain the source book titles. **Quote IDs must stay exactly the same: they are the key that connects each passage across languages.**

[**Explore the language incubator →**](docs/LANGUAGE_INCUBATOR.md) for the step-by-step guide, or [open an issue](https://github.com/cdmoro/literature-clock/issues/new) with the language you'd like to contribute and the kind of help you can offer. If you're comfortable reviewing text but not setting up the tools, say so—an issue is a good place to coordinate with other contributors.

## Settings

Open **Settings** to configure languages, appearance and display options. You can choose a theme font or add a Google Fonts family by name, preview it and keep it in your custom font list.

Preferences are saved in the browser. URL parameters override saved settings, and changes update the address without reloading the page. Reading state and collections are separate from those preferences.

<details>
<summary><strong>URL parameter reference</strong></summary>

Use `true` or `false` for boolean options. For example: [Book Page in Zen mode](https://literatureclock.netlify.app/?theme=book-light&zen=true).

| Parameter | Purpose / values |
| --- | --- |
| `theme` | Theme and variant, such as `book-light`, `poster-dark` or `horizon-system` |
| `color` | Custom accent colour on supported themes; encode `#` as `%23` in URLs |
| `font` | Google Fonts family name, or `default` for the theme font |
| `locale` | Quote locale, such as `en-GB` or `es-ES` |
| `ui-locale` | Interface language, independently of the quote language |
| `quote-locales` | Comma-separated quote locales; an empty value follows the interface language |
| `random-locale` | Rotate quote languages; `true` uses the selected languages, or all supported languages when no selection is configured |
| `bilingual` | Show a matching catalogue translation |
| `translation-locale` | Translation language, such as `es-ES` |
| `zen` | Hide distractions |
| `work` | Filter quotes using the catalogue's safe-for-work classification |
| `screensaver` | Move the quote around the screen |
| `transition` | `none`, `fade`, `slide`, `blur` or `zoom` |
| `progressbar` | Show the minute progress bar |
| `show-time` | Show the clock time above the quote |
| `static` | Remove the footer controls for a display configured through its URL |

For fixed passages and previews:

| Parameter | Purpose |
| --- | --- |
| `time` | Hold a particular minute, such as [12:30](https://literatureclock.netlify.app/?time=12:30) |
| `quote-id` | Open a specific quote by stable ID; use the share action to create the full link |
| `quote` | Preview custom text before submitting a quote |
| `index` | Legacy selection by position in the minute's quote array |

Older `fade=true` / `fade=false` links remain supported. Prefer `transition` for new links.

</details>

## Screensaver

This repository includes an **experimental native macOS screensaver** that draws directly with AppKit, without WebKit. Quotes and fonts are bundled. It supports all 12 quote languages, Base, Book, Terminal, Festive, Bohemian, Retro and Photo themes, light/dark/system appearance, colour presets and a custom RGB picker, background patterns, minute progress, gentle movement and optional time/book title. Its settings panel follows the system language; an empty quote-language selection uses the system language with English (UK) fallback. Only Photo needs internet to download new backgrounds; it caches the last successful photo.

**This is a test version.** Native rendering has worked in user tests, and Photo downloads, colour presets and title hiding have been checked in System Settings Preview. Sustained automatic activation, multiple monitors, sleep/wake and Intel runtime compatibility still need broader testing. Downloads use ad-hoc signing and are not notarized.

See [native build, installation and testing instructions](screensavers/macos-native/README.md). The [native release workflow](.github/workflows/macos-native-screensaver.yml) builds Apple Silicon/Intel bundles and attaches the ZIP/checksum only to releases tagged `macos-native-vX.Y.Z`. Web and screensaver versions are independent in this shared repository. Check [Releases](https://github.com/cdmoro/literature-clock/releases), including experimental prereleases, for `Literature-Clock-Native-macOS.zip`; a web release may have no screensaver asset. [Feedback and bug reports](https://github.com/cdmoro/literature-clock/issues/new/choose) are welcome.

The Photo theme supports Picsum, the public NASA Image and Video Library, or Wikimedia Commons, without accounts or API keys. NASA images are selected automatically by category (galaxies, nebulae, Earth, Moon, or all), with source credits. Commons searches automatically for CC0 images of nature, landscapes, animals or architecture. Provider and category share a single row; Picsum hides the category selector. Both the web app and native saver reuse the same category queries. The native clock places its time display below the camera housing on screens with a notch.

Our own Windows/Linux screensavers remain future work.

[Enable screensaver mode](https://literatureclock.netlify.app/?screensaver=true) to move the quote gently around the screen. For an operating-system screensaver or desktop display, these external guides and tools offer possible setups:

- [macOS: WebViewScreenSaver](https://github.com/liquidx/webviewscreensaver)
- [Windows: webpage screensaver setup guide](https://www.youtube.com/watch?v=UovZwUlwwEs)
- [Linux / KDE: webpage wallpaper setup guide](https://www.youtube.com/watch?v=_v1sJhBu25o)

## Contributing

Help the clock grow, one passage at a time:

- [Suggest a new quote or a variant for an existing minute](https://github.com/cdmoro/literature-clock/issues/new?template=add-quote.yml&labels=add-quote&title=%5B23%3A28%5D+%5Ben-GB%5D+Add+quote&locale=en-GB).
- Use **Report error** on a displayed quote to report a typo, incorrect time or translation problem.
- [Open an issue](https://github.com/cdmoro/literature-clock/issues) for bugs, ideas or a new language proposal.
- Start a language or help review one through the [language incubator](docs/LANGUAGE_INCUBATOR.md).
- Submit a pull request with improvements to the clock, themes or documentation.

## Development

See the [development guide](docs/DEVELOPMENT.md) for local setup, commands, tests, quote generation and the translation administrator.

## Technology and credits

Built with TypeScript and [Vite](https://vite.dev/), tested with [Vitest](https://vitest.dev/), with [Husky](https://typicode.github.io/husky/) for Git hooks and [Netlify](https://www.netlify.com/) for hosting.

Also made possible by:

- [html2canvas-pro](https://yorickshan.github.io/html2canvas-pro/) for quote images
- [lunarphase-js](https://github.com/jasonsturges/lunarphase-js) for moon phases
- [Picsum](https://picsum.photos/) for photographs

## Licensing and quote provenance

The original software contributions by Carlos Bonadeo are licensed under the [MIT License](LICENSE). The package metadata uses MIT to match that license. MIT permits adaptation, redistribution, and commercial use, provided the copyright and license notices are preserved.

The MIT license does not relicense third-party material or the literary quotations included in this repository. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the quote collection's provenance, the upstream license notice, and the limits of the permissions we can confirm.

## Contact and support

Hi! I'm Carlos. Find me on [Twitter](https://twitter.com/CarlosBonadeo) or [LinkedIn](https://www.linkedin.com/in/cdbonadeo/).

If you enjoy Literature Clock, you can support the project with a [coffee](https://buymeacoffee.com/cdmoro), a [cafecito](http://cafecito.app/cdmoro) or through [Patreon](https://patreon.com/cdmoro).
