# Literature Clock for iPhone and Mac

Native SwiftUI apps and WidgetKit extensions for iOS and macOS. Both platforms share the clock, quote catalogues, settings, share composition, widget configuration and timeline provider. Settings include quote languages, appearance, font, accent color, highlighting, fuzzy mode, safe quotes, attribution and seconds progress. Add a small, medium or large widget from the Home Screen widget gallery on iPhone. On iOS 27 and later, the extra-large portrait widget (`systemExtraLargePortrait`) also fills a 4×6 Home Screen grid. iPad supports the landscape extra-large family (`systemExtraLarge`). The small widget always uses fuzzy mode (only the time phrase) and shows no share or quote navigation buttons. Both extra-large layouts use larger quote text and spacing.

## Project layout

Open `apple/LiteratureClock.xcodeproj` from the repository root. If Xcode still has the old `ios` project open, close it and reopen this path. Scheme names and bundle identifiers are unchanged.

- `Shared/App`, `Shared/Models`, `Shared/Widgets`: Swift code compiled by both platforms.
- `Shared/Catalogues`, `Shared/Fonts`: bundled resources used by both apps and extensions.
- `Shared/IconDesigns`: editable artwork, previews and the fallback icon renderer.
- `iOS`: iPhone/iPad bundle metadata, entitlements and asset catalogue.
- `macOS`: Mac bundle metadata, entitlements and asset catalogue.
- `sync-catalogues.py`: refreshes the shared catalogue bundle from `public/times`.

The native screensavers remain separate under `screensavers/`.

## Build

Open `LiteratureClock.xcodeproj` in Xcode and select the `LiteratureClock` scheme. The project targets iOS 17 and uses an App Group (`group.net.literatureclock.app`) to share the selected language with the widget. Change the bundle identifiers and App Group identifier to match the signing team before installing on a device.

The published quote catalogues are bundled for offline use. After changing quote CSV files, regenerate the web catalogues and refresh the shared Apple app copies:

```sh
npm run generate-times
python3 apple/sync-catalogues.py
```

The shared catalogue files are generated from `public/times/`; do not edit them manually.

## App icon

The app target uses the book-and-clock design from `iOS/BookClock.xcassets` (`AppIconBookClock`) in Debug and Release. The editable `Shared/IconDesigns/AppIconBookClock.icon` is visible in the project but excluded from Resources: Apple’s icon exporter currently fails to compile it. Once that export issue is resolved, add the `.icon` file to the app target’s Resources phase to enable Liquid Glass.

See `Shared/IconDesigns/README.md` for artwork structure and validation limitations.

## Widget interaction

Long-press an installed Home Screen widget and choose **Edit Widget** to configure that instance. The widget configuration is independent of the app settings. Tap the quote to open its full text in the app with the widget’s language, font, accent, appearance and highlighting. Dismiss this view to return to the live clock; opening a widget does not save over app preferences. The share icon opens sharing directly. Sharing includes a separate **Highlight the time** toggle. Both the preview and exported image inherit the source app or widget attribution setting: `— Book, Author`, `— Author`, or no attribution. The credit stays below the quote in the selected quote font.

If a physical device keeps showing placeholder shapes or does not offer **Edit Widget**, debug the `LiteratureClockWidgetExtension` scheme on that device and inspect its console. Verify small, medium and large widgets on iPhone, extra-large portrait on iOS 27+, and extra-large on iPad, installed through the Home Screen gallery, including after removing and re-adding an old widget. A successful simulator run alone does not confirm device rendering or configuration registration.

The widget kind is `net.literatureclock.app.configurable-clock`. Development installs that previously used `LiteratureClockWidget` need their Home Screen widgets removed and re-added; the kind identifies the system's widget registration. Keep the extension scheme's `_XCWidgetKind` value in sync.


## macOS app and desktop widgets

Select the **LiteratureClockMac** scheme in the same Xcode project, select **My Mac**, then Run. The native Mac app requires macOS 14 or later. It is separate from the screensaver and does not require an iPhone. Its widget extension is embedded automatically. Use the same signing team for `LiteratureClockMac` and `LiteratureClockMacWidgetExtension`.

After running the signed app, Control-click the desktop, choose **Edit Widgets**, search for **Literature Clock**, and drag a widget onto the desktop. Small, medium, large and extra-large widgets use the shared design. Control-click a widget and select **Edit Literature Clock** to configure its languages and style independently. Click its quote to open the full passage in the Mac app, or use its share button to open the shared image editor. The small widget shows only the time phrase and has no navigation or share buttons.

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
- Open a quote and its sharing editor from a widget; verify the quote, style and attribution are preserved.
- Resize the app window, open Settings with `⌘,`, copy text and share an image.
- Quit the containing app and verify widgets continue displaying their timelines.

WidgetKit controls timeline delivery on both platforms; the Mac target shares the iOS provider and does not introduce a separate refresh mechanism.
