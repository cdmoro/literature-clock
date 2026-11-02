# macOS app distribution checklist

This checklist tracks the work required before the app is advertised as a public download from the repository.

## Repository work

- [x] Keep the established app and widget bundle identifiers and app-group identifier so development installs retain their identity.
- [x] Read the app and widget marketing/build versions from `Version.xcconfig`.
- [x] Set the first unpublished preview version to `0.0.1`; keep the build number as a separate counter.
- [x] Build the app and widget as a universal Release configuration locally with Xcode 27.1.
- [x] Add a pull-request workflow that validates the macOS app component version, builds the universal app and widget, checks bundle metadata, and uploads a short-lived CI artifact.
- [x] Keep the app CI artifact separate from consolidated public Releases.
- [x] Connect the approved Icon Composer `.icon` directly as the macOS app icon source and remove the raster app-icon catalogue.
- [ ] Build in Xcode and confirm it compiles the `.icon`, generates the expected icon variants, and displays the approved design in the built app.
- [x] Rename the Icon Composer layers and assets in English.
- [ ] Make the app DMG build reproducible on a clean macOS runner and verify app/widget signatures, bundle metadata, architectures, and checksums.
- [ ] Add the app to the public release workflow, release notes, download links, and installation instructions after the distribution path and package are validated.

## Mac validation

- [ ] Install a CI or locally archived build on a clean Mac and launch the app from `/Applications`.
- [ ] Add each widget size and verify configuration, timeline updates, quote links, sharing, and persistence after quitting the app or sleeping the Mac.
- [ ] Confirm the app and widget can access the same app-group container in the installed ad-hoc distribution build. If they cannot, choose between changing the signing approach and removing/documenting features that rely on shared app-group state.
- [ ] Test first launch and upgrade from an older development build without losing widget configuration.

## Distribution decision and credentials

- [x] Distribute directly from GitHub Releases as an ad-hoc signed DMG; do not join the paid Apple Developer Program for this release.
- [x] Skip Developer ID signing and notarization. Gatekeeper may block the first launch; users can Control-click the app, choose **Open**, and confirm.
- [ ] Build the DMG reproducibly on a clean Mac and verify its checksum and contents.
- [ ] Install the quarantined download on a clean Mac and confirm the first-launch instructions with Gatekeeper enabled.
- [ ] Resolve and verify widget/App Group behavior for the ad-hoc distribution before promising that widgets share app preferences and data.
- [ ] Add the validated DMG and checksum to the public release workflow and document installation.

The existing builder produces an ad-hoc signed, non-notarized DMG. This allows direct distribution without a paid membership, but does not provide the low-friction Gatekeeper experience of a Developer ID signed and notarized app.

The app and widget share the macOS-style App Group `$(DEVELOPMENT_TEAM).net.literatureclock.app`. macOS authorizes this group by comparing the Team ID in each process's code signature to the group identifier. The current packaging script uses an ad-hoc signature, which has no Team ID; therefore app-group access and shared app/widget preferences are a release blocker to verify. See Apple's [App Group container documentation](https://developer.apple.com/documentation/xcode/accessing-app-group-containers).

Local result on 1 November 2026: the unsigned universal Release app and widget build succeeded with Xcode 27.1. Both bundles report version `0.0.1` / build `1`, use the expected app group, and contain `arm64` plus `x86_64`. The local DMG step failed at `hdiutil create` with `Device not configured`; repeat packaging on CI or a clean Mac.
