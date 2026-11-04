# macOS app: first public release checklist

This checklist is for the first public macOS app release, distributed as a direct download from GitHub Releases. The release must not depend on Apple Developer Program membership, Developer ID certificates, provisioning profiles, or notarization. The app supports macOS 14 and later and is distributed as a universal Apple silicon and Intel DMG.

## Release approach

- [x] Distribute a DMG directly from GitHub Releases.
- [x] Use an ad-hoc code signature; no Developer ID signing or notarization.
- [x] Keep the app and widget bundle identifiers and app-group identifier stable.
- [ ] Document that Gatekeeper may block the downloaded app and provide tested first-open instructions.
- [ ] Confirm that an ad-hoc signed app and widget can use their shared App Group on a clean Mac. This is a release gate because preferences and quote data use the shared container. If macOS denies access, change the app/widget data flow so the first release works without it; do not make release depend on paid signing.

## Build and package

- [x] Keep marketing version and build number in `Version.xcconfig` (`0.0.1` / `1` for the first release candidate).
- [x] Build a universal Release app and embedded widget in CI for pull requests.
- [x] Check the CI build's app/widget versions, App Group metadata, and `arm64` / `x86_64` architectures.
- [x] Provide a local DMG builder that ad-hoc signs both bundles and creates a SHA-256 checksum.
- [ ] Build the `.icon` source in Xcode and inspect the app's generated icon at normal and small sizes.
- [ ] Run the DMG builder successfully on a clean macOS machine or runner; verify the DMG, checksum, contents, architectures, bundle metadata, and ad-hoc signatures.
- [ ] Ensure the DMG contains `Literature Clock.app`, an Applications shortcut, and concise install/first-open instructions.

## Clean Mac acceptance

- [ ] Install the quarantined DMG downloaded from GitHub on a clean Mac with Gatekeeper enabled; follow the documented first-open steps and launch the app from `/Applications`.
- [ ] Confirm the app opens on macOS 14 or later on Apple silicon and Intel, using a real Mac or suitable separate test machines.
- [ ] Add small, medium, large, and extra-large widgets; configure languages and appearance; verify each renders correctly.
- [ ] Verify quote changes over time and after sleep/wake, and verify widgets continue working after quitting the app.
- [ ] Verify opening a widget quote opens the matching passage in the app, and test sharing and quote navigation.
- [ ] Verify app and widget preferences and quote data are shared as intended under the ad-hoc signature.
- [ ] Test an upgrade over an existing development install and confirm widget configuration and preferences remain usable.

## GitHub release integration

- [ ] Add the macOS app DMG and matching `.sha256` file to the consolidated release workflow, with checks that reject missing or unexpected app artifacts.
- [ ] Add the app version to generated release notes and include a direct download link and checksum instructions.
- [ ] Update the app README/install instructions with macOS requirements, drag-to-Applications steps, the tested Gatekeeper flow, and the fact that the build is ad-hoc signed and not notarized.
- [ ] Bump the macOS app version in `Version.xcconfig` for the first public build as needed; keep `CURRENT_PROJECT_VERSION` a positive build counter. Do not change the consolidated `release/VERSION` except when preparing the consolidated release.
- [ ] Confirm the release workflow artifacts and notes are complete on a draft/rehearsal run before creating the public GitHub Release.

## Definition of ready

The first release is ready when the clean-Mac acceptance checks pass, the ad-hoc app/widget shared-data behavior is resolved, and the GitHub release contains the verified universal DMG and checksum with accurate install instructions. Apple Developer credentials and notarization are not prerequisites.

The local unsigned universal Release build succeeded on 1 November 2026 with Xcode 27.1; app and widget reported version `0.0.1` / build `1` and contained `arm64` plus `x86_64`. Local DMG creation failed at `hdiutil create` with `Device not configured`, so the DMG and its installation path still need a successful clean-machine build and acceptance run.
