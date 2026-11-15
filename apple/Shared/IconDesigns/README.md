# Apple app icon

`AppIconBookClock.icon` is the editable Icon Composer source and the macOS app's build icon. The target's App Icon setting matches `AppIconBookClock`, the file name without `.icon`; the project includes the document in the app's Resources build phase.

Xcode generates the platform appearances and icon sizes from this source. The app supports macOS 14 and later. Build with Xcode and verify the generated app icon before release.
