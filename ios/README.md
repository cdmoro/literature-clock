# Literature Clock for iPhone

An early native iOS app and WidgetKit extension. The app shows the current literary clock and has two settings: quote language and light, dark or system appearance. Add the medium or large widget from the Home Screen widget gallery.

## Build

Open `LiteratureClock.xcodeproj` in Xcode and select the `LiteratureClock` scheme. The project targets iOS 17 and uses an App Group (`group.net.literatureclock.app`) to share the selected language with the widget. Change the bundle identifiers and App Group identifier to match the signing team before installing on a device.

The published quote catalogues are bundled for offline use. After changing quote CSV files, regenerate the web catalogues and refresh the iOS copies:

```sh
npm run generate-times
python3 ios/sync-catalogues.py
```

The iOS catalogue files are generated from `public/times/`; do not edit them manually.

## App icon

The app target uses the book-and-clock design from `IconDesigns/BookClock.xcassets` (`AppIconBookClock`) in Debug and Release. The editable `IconDesigns/AppIconBookClock.icon` is visible in the project but excluded from Resources: Apple’s icon exporter currently fails to compile it. Once that export issue is resolved, add the `.icon` file to the app target’s Resources phase to enable Liquid Glass.

See `IconDesigns/README.md` for artwork structure and validation limitations.

## Widget interaction

Long-press an installed Home Screen widget and choose **Edit Widget** to configure that instance. The widget configuration is independent of the app settings. Tap the quote to open its full text in the app with the widget’s language, font, accent, appearance and highlighting. Dismiss this view to return to the live clock; opening a widget does not save over app preferences. The share icon opens sharing directly. Sharing includes a separate **Highlight the time** toggle. Both the preview and exported image inherit the source app or widget attribution setting: `— Book, Author`, `— Author`, or no attribution. The credit stays below the quote in the selected quote font.

If a physical device keeps showing placeholder shapes or does not offer **Edit Widget**, debug the `LiteratureClockWidgetExtension` scheme on that device and inspect its console. Verify both medium and large widgets installed through the Home Screen gallery, including after removing and re-adding an old widget. A successful simulator run alone does not confirm device rendering or configuration registration.
