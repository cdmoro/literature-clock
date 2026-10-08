# Literature Clock Native — macOS prototype

This experimental saver draws quotes with AppKit inside `ScreenSaverView`. It has no WebKit, JavaScript, browser or local server. Only the optional Photo theme downloads images and, for NASA/Commons, catalogue metadata; all quotes and fonts remain offline. It uses its own native settings domain.

The prototype supports the 12 published quote languages, rotating selected languages each minute. No selected language follows the first preferred system language, with en-GB fallback. It includes light/dark/system appearance, accent colours, optional time, explicit-passage filtering, minute progress and movement starting at the centre. The native panel reuses the existing translations.

Base fonts are bundled and registered only within the saver process: Special Elite, Sansation (Greek), Pangolin (Russian), Marhey (Arabic) and ZCOOL KuaiLe (Chinese). Book, Terminal, Festive, Bohemian and Retro add their theme fonts and language-specific variants. These are native interpretations of the web themes, with distinct typography, background and accent colours; they do not reproduce every CSS effect. Greek Bohemian uses the already bundled Sansation. Native font fallback supplies any missing glyphs. Font files and their licenses are vendored from a pinned Google Fonts revision; `Assets/Fonts/manifest.json` records source URLs and checksums, verified at build time. Builds and rendering require no font downloads.

Colour swatches select presets, the theme default, minute rotation or a custom RGB colour. The RGB sliders and hexadecimal field stay inside the settings sheet, since the system colour panel is not reliably displayed by the remote Settings host. Editing a custom colour never overrides a subsequently selected preset on Save. Book titles can be hidden independently while keeping the author. Background patterns include dots, diagonal lines and grid, with optional rotation each minute. Patterns have stronger contrast and are rendered once per appearance/size change. Retro reuses the web scanline backgrounds, Book bundles its paper texture, Festive has its diagonal gradient, and Terminal has scanlines. The optional time sits above the passage, centred independently of text motion. Closed option sheets are recreated instead of reusing a dismissed window.

Photo downloads a seeded Picsum background at most once per minute, asynchronously, with bounded image dimensions and request timeouts. A light/dark overlay keeps text legible. The last successful photo is cached; a failed download leaves it visible, and an initial offline launch uses the theme background. It currently uses the bundled Book fonts and locale variants. Switching away or stopping cancels the request. A real Picsum download was verified in the System Settings preview. Sustained full-screen activation and offline recovery in that host still require verification.

The passage is rasterized only when its content, appearance or display scale changes, then moved as a single image at up to 60 frames per second. This avoids rerasterizing glyphs at each fractional position. Motion is faster than the initial prototype while staying within generous text margins. The bundled thumbnail is used only in the saver catalogue. `Assets/generate-thumbnail.swift` can generate an alternative book-and-clock illustration; it is not run by the build, which preserves the supplied thumbnail assets.

The build reads the CSVs through the existing validation helpers, excludes draft rows, validates the highlighted time and SFW flag, converts markup to plain text, and creates one compact JSON catalogue per language. A missing minute uses the en-GB catalogue; if no eligible quote exists, it displays the existing translated quote-not-found notice and current time without inventing a passage. With explicit passages filtered, 29 minutes currently have no eligible quote in either Greek or English; this can explain a bare-time display in earlier builds, but is not proof of the user's particular occurrence.

Build on macOS:

```sh
python3 screensavers/macos-native/build.py --universal
```

Output: `build/Literature Clock Native.saver`, a standalone preview app, and `Literature-Clock-Native-macOS.zip` with a SHA-256 checksum. Signing is ad-hoc; these are local test builds, not notarized public releases. The native release workflow builds this saver independently of web releases.

Open the preview app to inspect drawing and its Settings menu. Run its executable with `--check-render` to render all catalogues and theme variants to `/private/tmp/literature-clock-native-checks`, check bundled font selection, minute changes, a filtered gap, reopening a dismissed options sheet, and custom-colour saving. This checks native drawing, not sustained system-host behavior. The user confirmed native rendering and animations. Photo downloads, preset/default colour persistence, repeated options opening and title hiding were subsequently checked in System Settings Preview. Earlier intermittent Options failures and mixed web/native full-screen monitors still warrant repeated testing. System Settings showed Native selected for both displays during investigation; the mixed-monitor cause is not confirmed. Repeated Preview/options, automatic activation, multiple displays and sleep/wake remain required before publication. Intel compilation is not Intel runtime validation.

## Install and give feedback

Download `Literature-Clock-Native-macOS.zip` from a `macos-native-vX.Y.Z` release, unzip it and double-click `Literature Clock Native.saver` to install. Select **Literature Clock Native** in System Settings → Wallpaper → Screen Saver, then open **Options** and save your settings. If macOS blocks this ad-hoc-signed test build, review the downloaded source/release and use the system's explicit approval flow if you choose to proceed. Building locally is another option. Fully quit and reopen System Settings after replacing an installed bundle to avoid retaining the previous version.

Please report your macOS version, hardware, selected theme/languages and whether a problem occurs in the small preview, full-screen Preview or automatic activation in [GitHub issues](https://github.com/cdmoro/literature-clock/issues/new/choose). Include whether one or several displays are connected.

## Independent releases in this repository

The web clock and native saver keep independent versions while sharing catalogues, translations and assets. Screensaver releases use `macos-native-vX.Y.Z` tags (for example `macos-native-v0.1.0`). Mark initial releases as **prereleases** on GitHub; the bundle itself uses the numeric version. Ordinary web release tags do not build or attach this saver.

`.github/workflows/macos-native-screensaver.yml` builds universal bundles after a matching release is published, then attaches the ZIP and checksum to that existing release. It does not create or publish releases. Manual dispatch with an empty tag builds an Actions artifact from the selected branch; with an existing matching release tag it checks out that exact tag and attaches the ZIP/checksum pair without replacing existing files. A partial pair causes an explicit failure rather than attaching a newly built checksum to an older ZIP. The workflow must be on the default branch before manual dispatch is available. It requires no npm dependencies or font downloads.

For immutable releases, create an **existing draft release**, run manual dispatch against its tag, wait for the assets and then publish the draft. Assets cannot be added to an immutable release after publication; a failed upload still leaves the build artifact in Actions. Release automation has not yet been run on GitHub.

## Photo providers and safe screen area

Choose Photo, then Picsum, NASA or Wikimedia Commons in Options. Provider and category sit side by side; the category selector is hidden for Picsum. NASA and Commons need no account or API key. Category queries come from `src/photo-providers.json`, shared with the web app. Each category search retrieves up to 100 NASA results or 50 Commons results automatically and is cached in memory for an hour; images rotate each minute. All alternates between the provider’s available categories. Source credits are drawn over the background. Commons accepts only bitmap images whose metadata identifies a CC0 licence without required attribution. Artist HTML is converted to plain text; the image source is retained with the cached metadata. Entries whose description identifies copyright protection are excluded; NASA occasionally includes third-party material, so this filter does not constitute a complete rights audit. No image list is maintained by hand.

Downloads preserve the last successful image and its credit if NASA, Commons, Picsum or the internet is unavailable. The native saver stores that image and credit on disk for offline activation. The web app preserves the last loaded background during the current session. See [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/).

The time label uses the current screen's `safeAreaInsets.top` and the view's screen coordinates to avoid a camera housing. It keeps its normal margin on external screens, miniature previews, and windows that macOS has already positioned below the notch. Synthetic geometry checks cover these cases; actual full-screen placement on a Mac with a notch still needs verification.

### Available photo topics

| Provider | Topics (plus All) |
| --- | --- |
| NASA | Galaxies, nebulae, Earth, Moon, stars, planets, Mars, Jupiter, Saturn, Sun, auroras, space stations, rockets, astronauts |
| Wikimedia Commons | Nature, landscapes, animals, architecture, oceans, mountains, forests, flowers, birds, waterfalls, cities, castles, bridges, art, beaches, sunsets |

These are shared search topics, rather than a fixed official category taxonomy. The providers select images automatically; Commons may also return paintings and other artwork. The web validates saved categories directly against the shared configuration, and both interfaces translate their labels in all 12 supported languages.
