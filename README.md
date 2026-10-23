# Literature Clock

> Turn your screen into a living anthology. Every minute of the day has its quote.

[![macOS](https://img.shields.io/badge/macOS-Universal-black?logo=apple)](screensavers/macos-native/README.md)
[![Windows](https://img.shields.io/badge/Windows-x64%20%7C%20ARM64-blue?logo=windows)](screensavers/windows-native/README.md)
[![Web Demo](https://img.shields.io/badge/Web_Demo-Live-brightgreen)](https://literatureclock.netlify.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Literature Clock** is an elegant, lightweight native screensaver for **macOS** and **Windows** that tells the time using excerpts from world literature. Each minute presents a real book passage mentioning the current hour and minute—delivering serendipitous moments of reading to your idle display.

Also available as a full-featured [interactive web app](https://literatureclock.netlify.app/).

https://github.com/user-attachments/assets/626ca478-d170-4176-90d9-c46580fcfa91

*Literature Clock cycling through themes, languages, and Liquid Glass progress.*

---

<div align="center">

### Download Literature Clock

Turn your display into a literary clock. Choose your platform to get the native screensaver, or try the web app.

| <img src="https://cdn.simpleicons.org/apple/ffffff" alt="Apple" width="20" /> **macOS** | <img src="docs/windows.svg" alt="Windows" width="20" /> **Windows** |
|:---:|:---:|
| [Apple Silicon & Intel](https://github.com/cdmoro/literature-clock/releases/latest/download/Literature-Clock-Native-macOS.saver.zip) | [x64](https://github.com/cdmoro/literature-clock/releases/latest/download/Literature-Clock-Native-Windows-win-x64.scr) · [ARM64](https://github.com/cdmoro/literature-clock/releases/latest/download/Literature-Clock-Native-Windows-win-arm64.scr) |
| [Installation guide](screensavers/macos-native/README.md) | [Installation guide](screensavers/windows-native/README.md) |

[🌎 Open the live web app](https://literatureclock.netlify.app/) · [All releases and version notes](https://github.com/cdmoro/literature-clock/releases/latest)

Each consolidated release includes native downloads for macOS and Windows. Release notes list each component version and generated changes. The web app is hosted separately. The release workflow checks changes against the previous consolidated release and stops if a changed platform's version was not increased.

</div>

---

## ✨ Features

![Literature Clock displaying a literary quote with the time highlighted](https://github.com/user-attachments/assets/15fedb98-8d39-418a-86fa-a7fd9d0077d2)

- ⚡ **Pure Native Performance** — Written in Swift & AppKit (macOS) and WPF/.NET (Windows). No WebKit, Chromium, or Electron overhead. Smooth 60 FPS text drift prevents OLED and display burn-in while remaining gentle on your battery.
- 📚 **1,440 Offline Literary Moments** — Thousands of hand-curated quotes across world literature with book titles and authors. Completely self-contained and works 100% offline.
- 🎨 **Artisan Themes & Textures** — From tactile **Book Page** paper and retro **Terminal** scanlines to the day-night celestial sky in **Horizon**, or 25 custom geometric patterns.
- 📸 **Dynamic Photo Backdrops** — Optionally cycle curated photographs from **NASA**, **Wikimedia Commons**, and **Picsum**, cached locally for offline display.
- 🌍 **12 Languages & Bilingual Reading** — Read in English (UK & US), Spanish, French, German, Italian, Portuguese, Chinese, Russian, Greek, and Esperanto. Enable *Bilingual mode* to display the original quote alongside its translated edition.
- 💧 **Optical Liquid Glass Progress** — A custom hardware shader (Metal on macOS, HLSL on Windows) that renders realistic optical refraction tracking the seconds of each minute.

---

## 🚀 Download & Installation

### <img src="https://cdn.simpleicons.org/apple/ffffff" alt="Apple" width="20" /> macOS (Apple Silicon & Intel)
1. Download [`Literature-Clock-Native-macOS.saver.zip`](https://github.com/cdmoro/literature-clock/releases/latest/download/Literature-Clock-Native-macOS.saver.zip).
2. Extract the archive and double-click `Literature Clock.saver` to install.
3. Open **System Settings → Wallpaper → Screen Saver** to choose and configure your themes.

<details>
<summary><strong>Gatekeeper approval (First open)</strong></summary>

Because these are independent open-source builds, macOS may prompt for approval on first run:
1. Open **System Settings → Privacy & Security**.
2. Scroll to the **Security** section and click **Open Anyway** next to Literature Clock.
3. Double-click `Literature Clock.saver` once more to complete installation.

*See the [macOS Screen Saver Guide](screensavers/macos-native/README.md) for full troubleshooting and build details.*
</details>

### <img src="docs/windows.svg" alt="Windows" width="20" /> Windows (10 & 11)
1. Download the standalone `.scr` for your system: [x64](https://github.com/cdmoro/literature-clock/releases/latest/download/Literature-Clock-Native-Windows-win-x64.scr) or [ARM64](https://github.com/cdmoro/literature-clock/releases/latest/download/Literature-Clock-Native-Windows-win-arm64.scr).
2. Right-click the `.scr` file and select **Install**, or click **Browse** in Windows Screen Saver settings.
3. Click **Settings** to customize appearance. No runtime setup or administrator permissions required.

*See the [Windows Screen Saver Guide](screensavers/windows-native/README.md) for multi-monitor options and portable scripts.*

---

## 🎨 Themes Showcase

![Selection of Literature Clock themes](https://github.com/user-attachments/assets/d882b15c-0947-45ed-8456-25f56fb6083c)

| Theme | Look and Feel | Try in Browser |
| --- | --- | --- |
| **Book Page** | Classic paper texture, book typography, and highlighted time | [Light](https://literatureclock.netlify.app/?theme=book-light) · [Dark](https://literatureclock.netlify.app/?theme=book-dark) |
| **Horizon** | Ambient gradient that shifts with the time of day | [Open Horizon](https://literatureclock.netlify.app/?theme=horizon-system) |
| **Terminal** | Minimalist green-on-black phosphor display with scanlines | [Open Terminal](https://literatureclock.netlify.app/?theme=terminal-dark) |
| **Poster** | Bold typography framed by elegant borders | [Open Poster](https://literatureclock.netlify.app/?theme=poster-system) |
| **Photo** | Curated rotating photography from NASA, Wikimedia, and Picsum | [Open Photo](https://literatureclock.netlify.app/?theme=photo-dark) |

---

## 🌎 The Web Companion

Looking for an in-browser experience or setting up a dedicated desk display, old iPad, or Raspberry Pi? The [web version](https://literatureclock.netlify.app/) offers the full literary clock plus reading tools:

- ⏸️ **Pause & Browse** — Linger on a quote or explore alternative passages for the same minute.
- ❤️ **Favorites & History** — Save passages you love and revisit recent quotes without an account.
- 🔊 **Read Aloud** — Listen to quotes spoken aloud via Web Speech synthesis.
- 📤 **Shareable Quote Cards** — Export passages as high-resolution images or share direct timestamp links.
- 🛡️ **Work Safe Mode** — Filter explicit passages for office and public environments.

<details>
<summary><strong>URL Parameter Reference</strong></summary>

Customize the web clock directly via URL parameters (e.g. `?theme=book-light&zen=true`):

| Parameter | Values / Description |
| --- | --- |
| `theme` | `book-light`, `book-dark`, `terminal-dark`, `horizon-system`, `poster-system`, etc. |
| `locale` | Quote language (e.g. `en-GB`, `es-ES`, `fr-FR`, `de-DE`, `zh-CN`) |
| `bilingual` | `true` to display translated quotes underneath |
| `zen` | `true` to hide interface controls |
| `time` | Hold a fixed minute (e.g. `?time=12:30`) |
| `screensaver` | `true` to enable gentle browser drift |

</details>

---

## 🤝 Contributing & Community

- **Contributing guide**: Start with [CONTRIBUTING.md](CONTRIBUTING.md) for contribution types, review expectations, and links to the detailed guides.
- **Language Incubator**: Want to bring Literature Clock to your native language? Check out our [Language Incubator Guide](docs/LANGUAGE_INCUBATOR.md) to learn how we draft and verify catalogues batch by batch.
- **Submit a Quote**: Found a passage in a book mentioning the time? [Suggest a new quote](https://github.com/cdmoro/literature-clock/issues/new?template=add-quote.yml).
- **Report Errors**: Spot a typo or timestamp mismatch? [Open an issue](https://github.com/cdmoro/literature-clock/issues) or use the in-app report link.
- **Development**: See the [development guide](docs/DEVELOPMENT.md) for local setup, commands, and project structure.

---

## ☕ Credits & Support

Literature Clock was inspired by the original work of [Johannes Enevoldsen](https://github.com/JohannesNE/literature-clock) and [Jaap Meijers](http://www.eerlijkemedia.nl/) (Kindle literary clock).

Created and maintained by [Carlos Bonadeo](https://twitter.com/CarlosBonadeo).

If you love having Literature Clock on your screen, consider supporting the project:
- [Buy me a Coffee](https://buymeacoffee.com/cdmoro)
- [Cafecito](http://cafecito.app/cdmoro)
- [Patreon](https://patreon.com/cdmoro)

---

## 📄 License

Application code is licensed under the [MIT License](LICENSE). Third-party fonts, quotes, and assets retain their respective licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for details.
