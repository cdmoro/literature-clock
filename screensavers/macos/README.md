# Literature Clock Web — macOS prototype

An independent macOS `.saver` built with Swift, ScreenSaver and WKWebView. It reuses this repository's web clock, not WebViewScreenSaver's source. A future native renderer can live alongside it.

## Build

Requires macOS, Xcode with its command-line tools, Python 3 and this repository's npm dependencies (`npm ci`). From the repository root:

```sh
python3 screensavers/macos/build.py
```

Outputs (ignored by Git):

- `build/Literature Clock Web.saver`
- `build/Literature Clock Preview.app`

The default local build targets **Apple Silicon** and macOS 12 or later. Add `--universal` to include Intel in the same binary, and `--version v1.2.3` to set the bundle version. Use `--skip-web` only when reusing an up-to-date `dist` built with relative asset paths. The deployment target is not a claim of tested compatibility with every macOS version. Signed, notarized public distribution and runtime validation on Intel remain future work. Artifacts have local ad-hoc signatures.

Double-click the preview app to inspect the clock. Its application menu offers **Settings…** (`⌘,`). To install the actual saver, double-click the `.saver`, then select Literature Clock Web in macOS Screen Saver settings. Installation is a separate manual step; the build script does not install or change system preferences.

## Configuration

The native options sheet saves one or more quote languages, theme, light/dark/system color scheme, accent palette, transition, minute progress, time visibility, movement and explicit-content filtering through ScreenSaverDefaults. Multiple selected languages rotate at each minute. With no languages selected, the clock follows the first preferred system language, matching a supported regional variant or its language; unsupported languages fall back to en-GB. The preview and saver use the same preference domain name, but macOS sandboxing can give each host its own preference storage; settings in the standalone app are not guaranteed to configure the installed saver. Save applies changes; Cancel discards them. The options panel follows the system language independently of the quote languages, using the repository’s 12 UI translations and English fallback. Native-only help, movement and button labels are maintained in Assets/settings.json.

Content, Appearance and Behavior sections separate the settings. Selectors show translated descriptive labels and store stable internal values. The sheet uses the native sheet background material, fits its contents and places Cancel/Save at the bottom right. `system` follows macOS appearance; choose `dark` to force a dark clock. Preferences are synchronized before opening options or starting the clock. A changed settings snapshot rebuilds an already running web view on its next start; saving also broadcasts a notification to other active instances in the system host.

The clock loads from a dedicated `literature://clock/` origin. A WKURLSchemeHandler serves packaged resources and JSON catalogues, so no HTTP server or published website is needed. Options are passed internally as URL parameters supported by the existing clock. Each running view uses an ephemeral browser store; native preferences are the source of truth.

Catalogues, textures and scripts are bundled. Google Fonts still require internet; offline fonts fall back to local fonts. Photo backgrounds and custom font selection are deliberately excluded from this initial options sheet. The full published website's themes and options are not all exposed yet. Rebuild to update the packaged clock or catalogues. Build generation also produces draft catalogues used by the website; the saver package excludes them.

The native host creates the web view when animation starts and destroys it when animation stops. On macOS 14 and later it uses WebKit's public `inactiveSchedulingPolicy = .none` to avoid suspending remote saver surfaces. A native-only injected marker lets the clock use that view lifetime for quote updates, movement and transitions even when `document.hidden` disagrees with the displayed surface. Ordinary browser tabs still pause while hidden. External top-level navigation is blocked.

Each view stops independently through its host callback; sleep also releases the web view. The global saver-stop notification is deliberately not used, because it cannot distinguish the small preview from a simultaneous full-screen view. No loading artwork or static quote image is displayed. The thumbnail assets are used only for the saver catalogue. Unexpected web content termination gets at most two recovery attempts per run. Saving options refreshes running views and attached system previews; cancelling resumes attached previews that the host paused for configuration.

For Swift-only iterations, `--skip-web --reuse-resources` reuses the previous bundle resources. Do not use this shortcut after changing the website, catalogues or assets. The preview executable accepts `--check-lifecycle` to check three real quote-loading/start/stop cycles, repeated starts without duplicate web views, and the sleep callback. This checks view removal, not operating-system process termination, CPU usage or actual sleep/wake behavior.

## Manual compatibility checks

Compilation and the standalone app cannot establish compatibility with the macOS screen saver host. Before release, test:

1. Open the preview app; verify a literary quote, attribution and current minute appear.
2. Change language/theme; save, quit and reopen to verify persistence. Change again and cancel to verify discard.
3. Disconnect networking and restart; verify quotes advance across a minute with local font fallback.
4. Enable movement and each transition; watch several minutes in both the app and the actual system saver.
5. Check small System Settings preview, full screen, multiple monitors and different display scaling.
6. Start/stop the saver repeatedly; verify it exits normally on input and does not accumulate web views or consume CPU after stopping.
7. Test sleep/wake and the system appearance/reduced-motion preferences.

Known upstream compatibility reports to keep in mind:

- [WebViewScreenSaver release history](https://github.com/liquidx/webviewscreensaver/releases): animation fixes for Sonoma.
- [Apple developer forum report, March 2026](https://developer.apple.com/forums/thread/820860): WKWebView disappearing in the legacy saver host on macOS 26.4. This does not establish behavior on other versions.

No private macOS APIs are used in this prototype. A private occlusion method used by WebViewScreenSaver was investigated but was not installed as a workaround.

## Release downloads

The WebKit prototype is paused. Automatic release builds are disabled; `.github/workflows/macos-screensaver.yml` can only be dispatched manually for diagnostics. Native prototype builds use a separate workflow and `macos-native-vX.Y.Z` releases. For this legacy manual workflow, the release tag must be `major.minor.patch` or `vmajor.minor.patch` (for example `v1.2.3`). Other tag formats fail explicitly rather than silently assigning a wrong version. The workflow checks out the release tag, builds both architectures, verifies the binary slices and ad-hoc signatures, and packages the saver with `ditto` to preserve bundle metadata.

Downloads attached to the release:

- `Literature-Clock-Web-macOS-universal.zip` — unzip and double-click the enclosed `.saver` to install.
- `Literature-Clock-Web-macOS-universal.zip.sha256` — SHA-256 checksum.

The standalone preview app is built for validation but is not included in the release ZIP. Actions also retains the ZIP/checksum as an artifact for 30 days. Failed builds never start the release upload job. Compilation and binary checks do not validate full-screen animation or Intel runtime behavior.

Run **macOS web screensaver (paused)** manually in Actions with no release tag to build a preview artifact from the selected branch. With an existing release tag, it builds that exact tag and attaches downloads to that release (including a draft). The workflow must be available on the default branch for manual dispatch. It creates no releases and does not overwrite existing assets; files already attached under the same names are skipped on reruns. The release upload job alone receives `contents: write`.

Published immutable releases cannot accept new assets. If this diagnostic workflow is used against a release, upload to an existing draft before publishing it; no post-publication build runs automatically.

The downloads currently use **ad-hoc signing**, not Developer ID signing or Apple notarization. Downloaded builds may be blocked or require explicit user approval under macOS security policy. Do not describe these prototype downloads as notarized. A polished public distribution requires a Developer ID Application certificate and an Apple notarization setup stored securely in GitHub Actions; no credentials are required for the prototype build.

## Experimental status and validation

**This is a test version, not a stable screensaver.** Local validation on macOS 27.0.1 established universal compilation/signatures and standalone rendering. The user also confirmed one successful system full-screen run with animation. Neither result establishes sustained system-host compatibility or Intel runtime compatibility.

The additional 30-minute investigation on 2026-10-07 ended without meeting the acceptance criteria. The latest installed candidate no longer darkened in the user's repeated Preview checks, but its content/animations froze and switching Base Light/Dark had no visible effect. WebKit investigation is paused; do not publish this candidate as a working download. A separate [native ScreenSaverView implementation](../macos-native/README.md) now uses bundled quote catalogues and fonts and has passed initial user rendering tests.

Known limitations:

- **System rendering:** full-screen Preview and automatic activation previously became dark after roughly three seconds. The same native wrapper rendered a plain counter continuously; direct HTML loading and disabling clock animation did not resolve the full clock failure. After setting WebKit's public inactive scheduling policy to `.none`, the user reported repeated runs without darkening, but inconsistent animation. Remote host logs can still report `document.hidden = true` while content is displayed. Using native view lifetime for clock timers and animation decisions passed regression tests but did not resolve the user's final frozen Preview. Sustained automatic activation remains unverified. [Apple forum report FB22353950](https://developer.apple.com/forums/thread/820860) describes a similar disappearance; it is not proof of this prototype's cause.
- **Appearance updates:** colour palette changes were confirmed by the user; light/dark scheme changes were reported ineffective. Logs from the latest candidate confirm both the URL and effective DOM theme are `base-light` after Save, including a light computed background in the configuration view. Full-screen appearance still needs visual confirmation; this remains a publication blocker.
- **Options:** the installed options sheet was checked successfully, including retained settings. It can stop responding; fully quit System Settings, wait for its Wallpaper preview process to exit, then reopen. This recovered the panel during local testing without resetting preferences. A permanent fix remains pending.
- **Catalogue thumbnail:** macOS may show its default blue swirl despite the packaged artwork; see below. No loading image or frozen quote is displayed by the saver.
- **Automatic start delay:** macOS controls this, not the saver. On the test machine, System Settings explicitly marked the five-minute delay as configured by a profile and disabled its selector.
- **Additional checks:** sustained automatic runs, CPU usage after stopping, sleep/wake, multiple monitors and Intel execution still need validation. Build success is not runtime certification.

Validation completed:

- Universal arm64/x86_64 compilation, strict bundle signature checks and ZIP/checksum generation.
- Three real quote-loading/start/stop cycles in the diagnostic app, repeated starts without duplicate attached web views, and the sleep callback. This checks view removal, not operating-system process termination or actual sleep/wake.
- The organized native sheet inspected in English and Spanish; all panel keys present in all 12 locales. Save/Guardar applies translated selectors using their original internal values. Empty language selection persists and renders real quotes in the effective system language. A Spanish application-language override verified Spanish UI and quotes without changing macOS's language.
- Swift locale resolution checked for exact locales, regional/script variants, unsupported languages and empty input, including fallback to en-GB.
- Dark theme application, settings persistence and Cancel in the standalone app; advancing time and gentle movement observed there. Seven shared web movement tests and the web build passed.

When replacing a local installation, replace the entire `.saver` bundle rather than merging contents. An overlay update left an obsolete hashed web asset and invalidated the resource seal; clean replacement restored strict verification. Keep any backup outside the Screen Savers folder. Fully quit System Settings before updating to avoid retaining an older loaded module.

## Catalogue thumbnail

The saver includes `thumbnail.png` (480×312), `thumbnail@2x.png` (960×624), a TIFF with both resolutions, and the `ScreenSaverThumbnail` bundle entry. The artwork uses the clock's dark colors and its own tagline; it does not reproduce a literary quotation. Assets and a reproducible AppKit generator live in `Assets/`. The build copies them before signing, so release ZIPs include them.

Local image rendering, package contents and signatures were verified. The installed thumbnail remained the default blue swirl after reopening System Settings and restarting its legacy saver preview process on macOS 27.0.1. This is not confirmed to be just a cache issue. Apple DTS stated in April 2026 that there is no supported way they know of to replace the default thumbnail: https://developer.apple.com/forums/thread/806641 . The bundled artwork is provided for compatible hosts; do not promise it will be displayed on recent macOS versions.

Font fitting now also responds when web fonts finish loading or fail, rather than relying only on the initial 500 ms fitting window. A regression test covers Greek text whose font metrics change after that window. This addresses a concrete late-font-loading condition; the user-reported clipping still needs visual confirmation with the affected theme and quote.
