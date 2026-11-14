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

### App interface strings

`src/strings/common/translations.json` and `src/strings/common/settings.json` are the source for shared interface text. Mac-only labels live in `src/strings/macos-app/interface.json`. After editing those catalogues, regenerate the native resources:

```sh
python3 apple/Shared/Strings/sync_strings.py
```

This updates the 12 `Localizable.strings` resources used by the app and widget.

## Branch workflow

`feat/macos-app` contains the shared foundation and Mac integration. `feat/ios-app` is based on that foundation and adds the iOS targets, schemes and platform resources. Preserve the latter branch without an active PR while iPhone development is paused. Merge subsequent shared improvements from the Mac branch (or main after it is merged) into iOS when needed.

## macOS app and desktop widgets

Select the **LiteratureClockMac** scheme in the same Xcode project, select **My Mac**, then Run. The native Mac app requires macOS 14 or later. It is separate from the screensaver and does not require an iPhone. Its widget extension is embedded automatically. Use the same signing team for `LiteratureClockMac` and `LiteratureClockMacWidgetExtension`.

After running the signed app, Control-click the desktop, choose **Edit Widgets**, search for **Literature Clock**, and drag a widget onto the desktop. Small, medium, large and extra-large widgets use the shared design. Control-click a widget and select **Edit Literature Clock** to configure its languages and style independently. Clicking its quote opens the unified quote and sharing dialog with the full passage and book/author credit. Copy the quote, edit its style and attribution, or share it from that dialog. The small widget shows the time phrase and configured book/author credits. All widget sizes reserve their space for the quote and attribution; quote navigation is available in the app.

The app has a resizable clock window, the same settings available through its toolbar, and a native Settings window (`⌘,`). The Mac sharing editor keeps a large card preview beside Colour and Text tools, with the image format selector in the bottom action bar. Font chips preview each typeface directly. Copy and Share remain available below, and the close button dismisses the editor. Sharing uses the macOS share menu; copying text uses the Mac pasteboard. Special Elite is registered from the bundled font in both Mac processes.

## Build and distribution status

For installation and updates, see the [installation guide](INSTALL.md). The
[first public beta notes](RELEASE_NOTES.md) describe the shipped features and
limitations. See the [distribution checklist](DISTRIBUTION_CHECKLIST.md) for
remaining acceptance work.

`apple/build.py` creates a universal, ad-hoc signed DMG and SHA-256 checksum.
The reusable macOS app workflow builds and verifies that same package on the
Xcode 27 runner. The consolidated release workflow requires the app DMG plus
both screensavers and all checksums. Pull requests and manual workflow runs
rehearse packaging and upload review artifacts without publishing or deploying.
Only the existing push trigger for `release/VERSION` publishes a release.

The app and widget bundle versions come from `Version.xcconfig`; increment `MARKETING_VERSION` for a user-visible app release and `CURRENT_PROJECT_VERSION` for each submitted build. Keep the existing bundle identifiers and team-scoped app group stable so development installs retain their identity and shared widget data.

The first public release is planned as a direct GitHub download with an ad-hoc signature, without paid Apple Developer Program membership, Developer ID signing, or notarization. Users may need to approve the first launch in **System Settings → Privacy & Security → Open Anyway**. Before adding it to a GitHub Release, verify this flow on a clean Mac and test app/widget App Group access: macOS authorizes the team-prefixed group by checking the Team ID in the code signature, while the current ad-hoc package has no Team ID. See the [distribution checklist](DISTRIBUTION_CHECKLIST.md) for this unresolved widget requirement. The macOS target uses the editable [Icon Composer source](Shared/IconDesigns/AppIconBookClock.icon) directly; build and inspect the app in Xcode to confirm generated variants before release.

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
- Verify every widget size has no navigation buttons and attribution uses the available width; open a widget quote and cycle quotes in the app.
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

The **Progress bar** switch is available in the app. Desktop widgets omit the
bar and its configuration option for the first release, because host-rendered
progress did not update reliably in installed builds.

Widget highlight color defaults to **Follow app**, including gallery previews.
Choosing a named color explicitly keeps that color independent of the app;
existing widgets with Red selected now render red instead of silently inheriting
the app palette. Select Follow app on those widgets to inherit it. Clear/Tinted
styles use system colors, with stronger time text and context at 70% opacity.
Widget quote text uses standard SwiftUI Text runs for host-rendered snapshots;
verify all sizes in the gallery and after configuration changes on the installed
DMG. Shared-preference access under ad-hoc signing remains an acceptance check.

The clock keeps its attribution directly below the passage as “— Book, Author”
(or “— Author”, according to settings). In time-fragment-only mode, attribution
moves to the bottom left above the actions, with book and author on separate lines.
The bottom action bar contains pause,
favorite, share and the current quote position. Navigation wraps within the
displayed minute; a single quote shows 1/1 with disabled arrows. Pause (Space)
freezes the displayed minute and progress; resume returns to the current time.
This temporary app state does not pause desktop widgets.
