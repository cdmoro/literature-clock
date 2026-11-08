# Install Literature Clock for Mac (beta)

Requires **macOS 14 or later**. The universal DMG includes both Apple silicon
and Intel binaries. The app and desktop widgets are separate from the native
screensaver.

## Install and update

1. Download `Literature-Clock-App-macOS.dmg` and its `.sha256` file from the
   [GitHub release](https://github.com/cdmoro/literature-clock/releases).
2. Optionally check the download in Terminal, from the folder containing both files:

   ```sh
   shasum -a 256 -c Literature-Clock-App-macOS.dmg.sha256
   ```

3. Open the DMG and drag **Literature Clock.app** to **Applications**. To update,
   quit the old app first and replace it when Finder asks.
4. Eject the disk image and open Literature Clock from Applications.

This beta is ad-hoc signed and **not notarized**. If macOS blocks its first
launch, try opening it once, then go to **System Settings → Privacy & Security**,
find the message about Literature Clock, and choose **Open Anyway**. Confirm
the next dialog. See [Apple's instructions](https://support.apple.com/102445).
The downloaded/quarantined first-open flow still needs independent beta testing.

## Desktop widgets

Open the installed app once. Control-click the desktop, choose **Edit Widgets**,
search for Literature Clock, and add a size. Control-click a widget to edit its
options. **Follow app** uses the app's highlight color; a named color applies to
that widget independently. Clear/Tinted styles use system colors.

Widgets change quotes by minute and have independent language/style options.
WidgetKit schedules updates, so delivery may vary after sleep or under system
load. The first beta omits widget progress bars; the app retains its progress bar.

## Previous Xcode builds

If the gallery lists multiple copies (including `LiteratureClockMac`), close
Xcode and any development app, eject mounted Literature Clock DMGs, and remove
only generated app copies from your project's `apple/build/DerivedData` and
`apple/build/dmg`, plus the project's build products under Xcode DerivedData.
Do not delete the source project or preference containers. Open the Applications
copy again. macOS may need a restart to clear old gallery entries. Widgets from
a development installation may need to be removed and added again.

## Report beta problems

Use [GitHub Issues](https://github.com/cdmoro/literature-clock/issues) and include
the app version, macOS version, Apple silicon/Intel, widget size and rendering
style, and whether the issue happens after changing an option or waking the Mac.
If a widget becomes blank, include a screenshot and the option that triggered it.
