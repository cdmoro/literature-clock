# Literature Clock for macOS

The native screen saver renders the clock with AppKit. It does not use a browser, WebKit or a local server. Quote catalogues, fonts, themes and patterns are bundled; the optional Photo background downloads images and, for NASA and Wikimedia Commons, search metadata.

It supports the 12 published quote languages, language rotation, bilingual display, light/dark/system appearance, themes, accent and custom colours, optional time and minute progress, passage filtering, and per-minute background patterns. Photo backgrounds work with the supported themes and can use Picsum, NASA or Wikimedia Commons. NASA and Commons topics are shared with the web app through `src/photo-providers.json`. Photos rotate automatically; the last successful image and its credit are saved for offline use.

The native app has its own settings. Per-display choices such as quotes, selected languages, photos and random colours or patterns can vary independently, while fixed settings are shared. Glass progress requires macOS 26 or later; other themes and progress styles remain available on older supported systems.

## Build

Build on macOS with Xcode and its Metal Toolchain installed:

```sh
python3 screensavers/macos-native/build.py --universal
```

The build creates the saver, a standalone preview app, the installer app, and a ZIP archive with a SHA-256 checksum under `screensavers/macos-native/build/`. Builds are universal for Apple silicon and Intel and are ad-hoc signed, not notarized. The installer checks can be run with:

```sh
"screensavers/macos-native/build/Install Literature Clock.app/Contents/MacOS/Install Literature Clock" --check-install
```

This check uses temporary directories and does not alter installed savers or user preferences.

## Preview and diagnostics

Open the standalone preview app to inspect rendering and settings without changing the installed saver's preferences. Its executable supports these preview modes:

- `--glass-preview` for Book/light with clock and background progress
- `--photo-glass-preview` for Photo/dark
- `--foreground-glass-preview` for foreground Liquid Glass
- `--rounded-glass-preview` for a 12-second progress cycle
- `--showcase-preview` for a looping theme and language demonstration

Run the executable with `--check-render` to render catalogues and theme variants and check native rendering behavior. Output is written to `/private/tmp/literature-clock-native-checks`.

## Install

For installation and updates, use the installer included in the downloaded ZIP. It backs up replaced copies and can restore them if installation fails. See [INSTALL.txt](INSTALL.txt) for installer details, manual installation, and Gatekeeper instructions for ad-hoc signed builds.

Download the latest macOS build from [GitHub Releases](https://github.com/cdmoro/literature-clock/releases/latest).

## Project releases

The macOS component version is recorded in `VERSION`. The web app and each native saver have separate component versions; the consolidated release workflow publishes them together. See the repository's release workflow for when to update `release/VERSION` and component versions.

## Photo sources and attribution

Picsum, NASA and Wikimedia Commons are available as photo providers. NASA and Commons use the shared topics configured in `src/photo-providers.json`; Picsum has no topic selector. Commons results are restricted to bitmap images whose metadata identifies a CC0 licence. NASA can include third-party material, so its results are not a complete rights audit. Source credits are shown with the image. See [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/).

## Feedback

Report issues at [GitHub Issues](https://github.com/cdmoro/literature-clock/issues/new/choose). Include your macOS version, Mac model, selected theme and languages, display setup, and whether the issue occurs in the small preview, full-screen preview or automatic activation.
