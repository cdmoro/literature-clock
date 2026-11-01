#!/usr/bin/env python3
"""Build a universal, ad-hoc signed macOS app DMG (not notarized)."""
import argparse
import hashlib
import plistlib
import re
import shutil
import subprocess
from pathlib import Path

APPLE = Path(__file__).resolve().parent
OUTPUT = APPLE / 'build'


def run(*args):
    subprocess.run(list(map(str, args)), check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--disable-macro-sandbox', action='store_true',
                        help='For restricted local environments that cannot run the Swift macro sandbox')
    args = parser.parse_args()
    config = (APPLE / 'Version.xcconfig').read_text()
    version = re.search(r'^MARKETING_VERSION\s*=\s*(\d+\.\d+\.\d+)\s*$', config, re.M)
    if not version:
        raise SystemExit('Invalid MARKETING_VERSION in apple/Version.xcconfig')
    version = version.group(1)
    build_match = re.search(r'^CURRENT_PROJECT_VERSION\s*=\s*([1-9]\d*)\s*$', config, re.M)
    if not build_match:
        raise SystemExit('CURRENT_PROJECT_VERSION must be a positive integer')
    build_number = build_match.group(1)
    derived = OUTPUT / 'DerivedData'
    command = ['xcodebuild', '-project', APPLE / 'LiteratureClock.xcodeproj',
               '-scheme', 'LiteratureClockMac', '-configuration', 'Release',
               '-destination', 'generic/platform=macOS', '-derivedDataPath', derived,
               'ARCHS=arm64 x86_64', 'ONLY_ACTIVE_ARCH=NO', 'CODE_SIGNING_ALLOWED=NO']
    if args.disable_macro_sandbox:
        command.append('OTHER_SWIFT_FLAGS=$(inherited) -disable-sandbox')
    run(*command, 'build')
    source = derived / 'Build/Products/Release/LiteratureClockMac.app'
    staging = OUTPUT / 'dmg'
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)
    app = staging / 'Literature Clock.app'
    run('ditto', source, app)
    widgets = list(app.glob('Contents/PlugIns/*.appex'))
    if len(widgets) != 1:
        raise SystemExit('Expected exactly one embedded widget extension')
    bundles = [*widgets, app]
    for bundle in bundles:
        with (bundle / 'Contents/Info.plist').open('rb') as stream:
            info = plistlib.load(stream)
        if info['CFBundleShortVersionString'] != version or info['CFBundleVersion'] != build_number:
            raise SystemExit(f'{bundle.name}: version does not match {version}')
        architectures = subprocess.check_output(
            ['lipo', str(bundle / 'Contents/MacOS' / info['CFBundleExecutable']), '-archs'], text=True).split()
        if not {'arm64', 'x86_64'}.issubset(architectures):
            raise SystemExit(f'{bundle.name}: missing universal architectures: {architectures}')
        # Preserve sandbox/group entitlements, but make no Developer ID claim.
        entitlements = {
            'com.apple.security.app-sandbox': True,
            'com.apple.security.application-groups': [info['ClockAppGroup']],
        }
        entitlements_path = OUTPUT / (bundle.stem + '.entitlements')
        with entitlements_path.open('wb') as stream:
            plistlib.dump(entitlements, stream)
        run('codesign', '--force', '--sign', '-', '--entitlements', entitlements_path, bundle)
    run('codesign', '--verify', '--deep', '--strict', app)
    (staging / 'Applications').symlink_to('/Applications')
    (staging / 'READ-ME.txt').write_text(
        f'Literature Clock {version}\n\nDrag Literature Clock to Applications. Requires macOS 14 or later.\n'
        'This build is ad-hoc signed, not Developer ID signed or notarized.\n'
        'Gatekeeper may block it. Desktop widget registration and shared app-group access\n'
        'are not validated for this distribution build.\n', encoding='utf-8')
    dmg = OUTPUT / 'Literature-Clock-App-macOS.dmg'
    run('hdiutil', 'create', '-volname', f'Literature Clock {version}', '-srcfolder', staging,
        '-ov', '-format', 'UDZO', dmg)
    run('hdiutil', 'verify', dmg)
    digest = hashlib.sha256(dmg.read_bytes()).hexdigest()
    dmg.with_suffix('.dmg.sha256').write_text(f'{digest}  {dmg.name}\n')
    print(f'Created {dmg} (app {version}; universal; not notarized)')


if __name__ == '__main__':
    main()
