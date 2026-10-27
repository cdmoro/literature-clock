# iOS icons

## Selected design: book and clock

`AppIconBookClock.icon` contains two SVG foreground groups on a separate navy background:

1. `Assets/01-Pages.svg`: the two front leaves, rounded corners, two warm ivory tones and a subtle fold. No covers, rear pages, textures or baked shadows.
2. `Assets/02-Hands.svg`: unequal clock hands pointing toward 11 and 2 plus the center disk, rendered as a single uniform navy silhouette. No separate ring, reflections or bevel.

The hands have zero group shadow; the page group has a restrained 4% shadow. Both groups have Liquid Glass enabled with low translucency. The two SVG layers share the same 1024 × 1024 coordinates and can be edited independently. The background is an icon fill, not a third foreground image.

`BookClock-Preview.svg` and `Previews/BookClock-Vector.png` show the artwork without system material effects.

## App integration and validation

Debug and Release select `AppIconBookClock`. The app currently compiles the opaque 1024 × 1024 PNG from `BookClock.xcassets`. That catalogue successfully compiled with Apple's `actool` after the vector update.

The `.icon` document is visible in the Xcode project but excluded from Resources: `ictool` still reports that the document could not be opened, including with the new SVG layers. Native Liquid Glass export and appearance testing therefore remain pending. The app currently uses the matching flattened vector artwork. Add the `.icon` document to the app's Resources only after confirming successful export in Icon Composer/Xcode.

The full app build previously failed in SwiftUI macro expansion in this environment. No device validation has been completed.

## Regenerate PNG fallback

From the repository root on macOS:

```sh
swift ios/IconDesigns/render-book-clock.swift
```

This composes the two source SVG layers, writes the SVG preview and exports opaque PNGs using AppKit and Core Graphics. It does not change the layers or invent new artwork.
