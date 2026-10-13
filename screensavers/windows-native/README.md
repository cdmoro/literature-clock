# Literature Clock Native — Windows

Native WPF/.NET 10 screen saver for Windows 10/11 x64 and ARM64, without a browser,
WebView or local server. The self-contained download requires no installed .NET runtime.
Quotes, settings translations, fonts (including licences), theme textures and all 25
pattern tiles are generated directly from the macOS native saver's resources.
Settings and per-display photo caches live in `%LOCALAPPDATA%\Literature Clock`.

## Install

Download the standalone `Literature Clock.scr` for your architecture. It contains the .NET
runtime, managed dependencies, quote catalogues, fonts, themes and patterns. In Windows
Screen Saver settings, use **Browse** to select the downloaded file, then use **Settings**
to configure it and **Preview** to run it. No administrator rights or extraction are needed.
These are unsigned development builds, not signed public releases.

For a manual portable preview, run `Preview.ps1`; press **F2** for
settings. `/c` opens settings, `/s` covers all monitors, and `/p HWND` embeds the Windows
Settings thumbnail. Full-screen exits on keyboard, click or significant mouse movement;
the window preview and embedded thumbnail remain open. Windows controls secure resume
through its **On resume, display logon screen** option.

Run `Uninstall.ps1` to deselect this installation and move it into recoverable backups.
Preferences and cached photos are retained. Neither installer changes the secure-resume
preference or manages other users' installations.

## macOS parity

Includes all seven native themes, system/light/dark appearance, the same automatic font
mapping for all twelve languages, per-minute language rotation and distinct monitor
choices, highlighted time phrases, title hiding, safe-passage filtering, bilingual
shared-ID translations, gently moving text, fixed/custom/per-minute colours, background
selection, patterns, time display and all six progress modes. Book uses rounded highlight
fragments and its paper tile. Retro and Terminal retain repeating scanlines. Photo uses
Picsum, NASA or Commons, shared category queries, source credits, offline per-display
caches, next-minute prefetch and 650 ms crossfades. Commons accepts only CC0 metadata
without required attribution; JPEG/PNG only, since Windows has no built-in WebP decoder.
The bundled Book WebP is losslessly converted to PNG during the build.

Liquid Glass uses an HLSL port of `macos-native/Sources/OpticalGlass.metal`, with the same
36-DIP bevel, RGB dispersion, 28-DIP leading corners, last-8% corner fade, subtle horizontal
rim and 10% background / 2.5% foreground tint. Background glass keeps the passage above
the lens; foreground glass samples the passage and clock. WPF samples the live photo
crossfade. A GPU supporting pixel shader 3.0 and WPF rendering tier 2 is required; on
unsupported hardware glass falls back to classic 10% background progress.
This is the project's optical shader, rather than Apple's system Liquid Glass API.

Platform text shaping/rasterization, system colours and native settings controls differ
from AppKit. Pixel-identical output has not been established. Windows Settings embedding,
automatic activation, multi-monitor DPI changes, Arabic wrapping, photo providers,
GPU glass, keyboard dismissal, secure resume, sleep/wake and installer update/rollback
must be tested on actual Windows hardware before declaring release readiness. ARM64
cross-compilation does not validate ARM64 execution.

## Build and checks

On Windows install .NET 10 SDK, Python 3.12+, Pillow 11.3.0 and Windows SDK (for `fxc.exe`):

```powershell
python -m pip install Pillow==11.3.0
./screensavers/windows-native/build.ps1 -Runtime win-x64
./screensavers/windows-native/build.ps1 -Runtime win-arm64
```

The build compiles the HLSL shader to PS 3.0, verifies bundled font SHA-256 hashes,
generates offline catalogues, embeds resources and publishes a self-contained single-file
apphost with the `.scr` extension and a SHA-256 checksum. x64 builds run `--check`: all catalogues/fonts,
locale fallback, monitor variant arithmetic, safe filtering, bilingual ID matching,
Commons licence rejection and glass corner fade. Checks use no photo downloads or
saved-preference writes.
The GitHub workflow builds both architectures on pull requests and manual dispatch;
standalone `.scr` files are retained as Actions artifacts and published on version bumps.

On macOS, `python3 screensavers/windows-native/prepare.py` plus
`dotnet build screensavers/windows-native/LiteratureClock.csproj` validates C# against
Windows reference assemblies. The HLSL compiler and runtime checks require Windows.
