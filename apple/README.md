# Literature Clock for Mac

Native SwiftUI app and WidgetKit desktop widgets. The macOS app is the active delivery target. iPhone/iPad integration is preserved separately in `feat/ios-app` and is not included in this project on the macOS branch.

## Project layout

- `Shared/App`, `Shared/Models`, `Shared/Widgets`: reusable app, settings and widget code. Conditional iOS implementations remain available for future reuse.
- `Shared/Catalogues`, `Shared/Fonts`, `Shared/Strings`: shared offline resources and translations.
- `Shared/IconDesigns`: editable icon artwork.
- `macOS`: Mac metadata, entitlements and asset catalogue.

The native screensavers remain separate under `screensavers/`.

## Catalogue synchronization

After changing quote CSV files:

```sh
npm run generate-times
python3 apple/sync-catalogues.py
```

The shared catalogue files are generated; do not edit them manually.

## Branch workflow

`feat/macos-app` contains the shared foundation and Mac integration. `feat/ios-app` is based on that foundation and adds the iOS targets, schemes and platform resources. Preserve the latter branch without an active PR while iPhone development is paused. Merge subsequent shared improvements from the Mac branch (or main after it is merged) into iOS when needed.

## macOS app and desktop widgets

Select the **LiteratureClockMac** scheme in the same Xcode project, select **My Mac**, then Run. The native Mac app requires macOS 14 or later. It is separate from the screensaver and does not require an iPhone. Its widget extension is embedded automatically. Use the same signing team for `LiteratureClockMac` and `LiteratureClockMacWidgetExtension`.

After running the signed app, Control-click the desktop, choose **Edit Widgets**, search for **Literature Clock**, and drag a widget onto the desktop. Small, medium, large and extra-large widgets use the shared design. Control-click a widget and select **Edit Literature Clock** to configure its languages and style independently. Click its quote to open the full passage in the Mac app, where sharing is available. The small widget shows the time phrase and configured book/author credits, and has no navigation buttons.

The app has a resizable clock window, the same settings available through its toolbar, and a native Settings window (`⌘,`). Sharing renders the same card as iOS and uses the macOS share menu; copying text uses the Mac pasteboard. Special Elite is registered from the bundled font in both Mac processes.

Sources live under `Shared/App`, `Shared/Models`, and `Shared/Widgets` so improvements apply to both platforms. `iOS` and `macOS` contain each platform’s bundle metadata, entitlements and app icon. The Mac app group is `$(DEVELOPMENT_TEAM).net.literatureclock.app`, used by both Mac targets; iOS retains `group.net.literatureclock.app`. Preferences are shared locally with each platform's widget, not synced between devices.

Compile without signing for a source/build check:

```sh
xcodebuild -project apple/LiteratureClock.xcodeproj -scheme LiteratureClockMac \
  -configuration Debug -destination 'platform=macOS' \
  -derivedDataPath /tmp/literature-clock-mac-build CODE_SIGNING_ALLOWED=NO build
```

An unsigned build does not validate desktop widget registration or shared-container access. For runtime verification, run the signed app from Xcode and check:

- Add each widget size; change language, appearance, font and custom accent.
- Keep widgets visible through several minute changes, then sleep and wake the Mac.
- Cycle quotes in medium and larger widgets; verify the small widget has no buttons.
- Open a quote from a widget, then its sharing editor in the app; verify the quote, style and attribution are preserved.
- Resize the app window, open Settings with `⌘,`, copy text and share an image.
- Quit the containing app and verify widgets continue displaying their timelines.

WidgetKit controls timeline delivery on both platforms; the Mac target shares the iOS provider and does not introduce a separate refresh mechanism.

Widget links prefer an existing Mac clock window instead of opening a new one
for each click. Launching the app requests a widget timeline reload, including
after running an updated development build. WidgetKit still schedules delivery;
this is not a forced synchronous redraw.

For the investigation of a widget that freezes after its first quote, confirmed
timeline/catalogue behavior, diagnostic logs and physical-device checks, see
[Widget diagnostics](WIDGET_DIAGNOSTICS.md).
