## Literature Clock for Mac {{APP_VERSION}} — first public beta

A native reading clock with offline quotes in 12 languages and small, medium,
large and extra-large desktop widgets. Includes favorites, recent quotes,
sharing, appearance controls and per-widget configuration. Requires macOS 14+;
the same DMG supports Apple silicon and Intel.

### Beta limitations

- The app is ad-hoc signed and not notarized. macOS may require approval in
  Privacy & Security on first launch.
- Widget progress bars are omitted; the app still has its progress bar.
- Widget updates are scheduled by macOS. Previously installed development
  widgets may need to be removed and added again.
- Widgets start with Red and have their own highlight color setting.
- Please report blank widgets or configuration problems with your macOS version
  and widget size.

See the [installation and widget guide](https://github.com/cdmoro/literature-clock/blob/main/apple/INSTALL.md).
Download the DMG and matching `.sha256` file from this release. From their folder:

```sh
shasum -a 256 -c Literature-Clock-App-macOS.dmg.sha256
```
