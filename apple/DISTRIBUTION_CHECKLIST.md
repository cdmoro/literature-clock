# macOS app: first public beta checklist

Target: **0.2.0**, build **12**, direct GitHub DMG, macOS 14+, Intel and
Apple silicon. The app uses an ad-hoc signature, without notarization or paid
Apple Developer credentials. Consolidated `release/VERSION` is unchanged.

## Current release blocker

- [ ] Verify all four sizes show live catalogue quotes on the installed build
  and advance through successive minute changes.
- Build 7 uses bundled catalogues and independent widget settings. Its loading
  view shows the time. Console on build 6 showed a missing small-widget timeline
  file and a catalogue read from a stale Xcode bundle path. Verify the installed
  build with a single registered copy of the app.

## Confirmed locally

- [x] Build 7 app and extension compile for both architectures, verify with
  strict signature checks, and each contain all 12 catalogues.
- [x] Build 7 provider tests return matching catalogue quotes in all four
  families with the expected minute dates, language filtering and palettes.
- [ ] Generate the build 7 DMG in an unrestricted Terminal or CI. The managed
  local build staged the signed app but `hdiutil create` failed with
  `Device not configured`.
- [x] User built and verified an ad-hoc universal DMG from Terminal.
- [x] User installed the DMG and launched the app from Applications.
- [x] Widgets changed quotes by minute in the earlier installed build.
- [x] Build checks versions, architectures and nested signatures; DMG is verified
  and a SHA-256 file is generated.
- [x] DMG includes the app, an Applications shortcut and first-open instructions.
- [x] Widget progress and its option are removed; app progress remains.
- [x] Widgets default to Red and expose independent named colors.

## Release preparation implemented, CI rehearsal pending

- [x] Reusable app workflow creates the DMG on the Xcode 27 runner.
- [x] Consolidated workflow includes the DMG and checksum and gates publishing
  on an exact artifact-set/checksum validation.
- [x] PRs and manual runs build review artifacts without publishing or deploying.
- [x] App beta version, notes and download link are included in release notes.
- [x] Installation/update instructions and beta limitations are written.
- [x] Release-validator failure cases and component mapping pass local tests.
- [ ] Run the actual GitHub workflow rehearsal and inspect its DMG and notes.
- [ ] Review the final icon for visual distinction and inspect generated sizes.
- [ ] Review/commit changes and integrate the PR before preparing publication.

## Installed acceptance still required

- [ ] Test snapshots and live quotes on the current build in all four sizes, including after
  changing options, quitting the app, and sleep/wake.
- [ ] On the installed DMG, change an existing widget's language, appearance and
  color in Edit Widget. Verify that the replacement timeline logs the selected
  configuration and the desktop widget applies it.
- [ ] Verify Red on newly added widgets and test an explicit color change. Check
  Clear/Tinted contrast and gallery previews.
- [ ] Verify widget links, favorites, sharing, settings and upgrades.
- [ ] On a separate clean Mac, download the DMG with quarantine/Gatekeeper active
  and verify the documented Privacy & Security approval flow.
- [ ] Verify actual runtime on macOS 14+ and Intel as well as Apple silicon;
  universal binaries alone do not establish runtime compatibility.

## Publication

No push, deployment, tag or release has been performed during this preparation.
Only a later explicit publication request should prepare the consolidated
release version and trigger the existing release push workflow.
