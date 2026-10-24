# Literature Clock Native — Windows

Native WPF/.NET 10 screen saver for Windows 10/11 x64 and ARM64, without a browser,
WebView or local server. The self-contained download requires no installed .NET runtime.
Quotes, settings translations, fonts (including licences), theme textures and all 25
pattern tiles are generated directly from the macOS native saver's resources.
Settings and per-display photo caches live in `%LOCALAPPDATA%\Literature Clock`.

## Install

Download the standalone `Literature-Clock-Native-Windows-win-x64.scr` or `Literature-Clock-Native-Windows-win-arm64.scr` for your architecture from the latest [Literature Clock release](https://github.com/cdmoro/literature-clock/releases). It contains the .NET
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

## Features

Includes seven themes, system/light/dark appearance, automatic font selection for all
twelve languages, per-minute language rotation, distinct monitor choices, highlighted
time phrases, title hiding and quote attribution below the passage, at bottom left, or
hidden, safe-passage filtering, bilingual translations by shared
quote ID, moving text, fixed/custom/per-minute colours, background selection, patterns,
time display and six progress modes. Book uses rounded highlight fragments and its paper
tile. Retro and Terminal use repeating scanlines. Photo supports Picsum, NASA and
Wikimedia Commons, with category queries, source credits, per-display offline caches,
next-minute prefetch and 650 ms crossfades. Commons accepts only CC0 metadata without
required attribution. Windows has no built-in WebP decoder, so the bundled Book WebP is
converted to PNG during the build.

Text over Photo backgrounds uses a fine background-coloured outline and a soft 12-DIP
halo. Selected patterns use a stronger outline. WPF renders the outline with zero-offset
shadow effects, so edge softness can differ slightly from the web and macOS renderers.

Liquid Glass uses an HLSL implementation based on `macos-native/Sources/OpticalGlass.metal`,
with a 36-DIP bevel, RGB dispersion, 28-DIP leading corners, last-8% corner fade, subtle
horizontal rim and 10% background / 2.5% foreground tint. Background glass keeps the passage above
the lens; foreground glass samples the passage and clock. Both modes sample the live photo
crossfade and fixed background pattern; animated particles stay outside the sampled surface.
A GPU supporting pixel shader 3.0 and WPF rendering tier 2 is required; on
unsupported hardware glass falls back to classic 10% background progress.
This is the project's optical shader, rather than Apple's system Liquid Glass API.

Text shaping, rasterization, system colours and settings controls use Windows-native
behavior, so rendering can differ from other platforms. Pixel-identical output is not
promised. The project shader is not Apple's system Liquid Glass API.

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
The GitHub release workflow builds both architectures and publishes them with the web and macOS downloads in one consolidated project release. The Windows component version remains in `screensavers/windows-native/VERSION`.

On macOS, `python3 screensavers/windows-native/prepare.py` plus
`dotnet build screensavers/windows-native/LiteratureClock.csproj` validates C# against
Windows reference assemblies. The HLSL compiler and runtime checks require Windows.
