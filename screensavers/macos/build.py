#!/usr/bin/env python3
"""Build the bundled web saver and a standalone diagnostic app on macOS."""
import argparse
import hashlib
import json
import re
import plistlib
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).resolve().parent
OUTPUT = SOURCE / 'build'


def run(*args):
    subprocess.run(args, cwd=ROOT, check=True)


def bundle(name, extension, sources, architectures, version, library=False, reuse_resources=False, minimal_page=False, static_clock=False):
    contents = OUTPUT / f'{name}.{extension}' / 'Contents'
    resources = contents / 'Resources'
    binary = contents / 'MacOS' / name
    binary.parent.mkdir(parents=True, exist_ok=True)
    resources.mkdir(parents=True, exist_ok=True)
    diagnostic = resources / 'Diagnostic.html'
    static_marker = resources / 'StaticClock'
    if static_clock:
        static_marker.write_text('Diagnostic: disable clock animations')
    elif static_marker.exists():
        static_marker.unlink()
    if minimal_page:
        diagnostic.write_text('''<!doctype html><html><meta name="viewport" content="width=device-width"><style>body{background:#123354;color:white;font:48px system-ui;margin:0;display:grid;place-content:center;height:100vh}#counter{font-size:90px}</style><body>Renderer test<div id="counter">0</div><script>let n=0;setInterval(()=>document.querySelector('#counter').textContent=++n,1000)</script></body></html>''')
    elif diagnostic.exists():
        diagnostic.unlink()
    web = resources / 'Web'
    if not reuse_resources:
        if web.exists():
            shutil.rmtree(web)
        shutil.copytree(ROOT / 'dist', web)
        for catalogue in (web / 'times').glob('*-draft'):
            shutil.rmtree(catalogue)
    elif not (web / 'index.html').is_file():
        raise ValueError('No existing bundle resources to reuse; run a normal build first')
    locales = json.loads((ROOT / 'src/strings/translations.json').read_text())
    (resources / 'locales.json').write_text(json.dumps(sorted(locales)))
    settings = json.loads((ROOT / 'src/strings/settings.json').read_text())
    native = json.loads((SOURCE / 'Assets/settings.json').read_text())
    labels = {locale: {**values, **settings.get(locale, {}), **native.get(locale, {})}
              for locale, values in locales.items()}
    (resources / 'settings.json').write_text(json.dumps(labels, ensure_ascii=False))
    for notice in ['LICENSE', 'THIRD_PARTY_NOTICES.md']:
        shutil.copy2(ROOT / notice, resources / notice)
    info = dict(CFBundleIdentifier=f'net.literatureclock.{extension}', CFBundleName=name,
                CFBundleExecutable=name, CFBundleVersion=version, CFBundleShortVersionString=version,
                CFBundlePackageType='BNDL' if library else 'APPL',
                NSPrincipalClass='LiteratureClockView' if library else 'NSApplication',
                LSMinimumSystemVersion='12.0', NSHighResolutionCapable=True)
    (contents / 'Info.plist').write_bytes(plistlib.dumps(info))
    if library:
        info["ScreenSaverThumbnail"] = "thumbnail"
        (contents / "Info.plist").write_bytes(plistlib.dumps(info))
        for asset in ["thumbnail.png", "thumbnail@2x.png", "thumbnail.tiff"]:
            shutil.copy2(SOURCE / "Assets" / asset, resources / asset)
    slices = []
    for architecture in architectures:
        thin = OUTPUT / f'{name}-{architecture}'
        run('xcrun', 'swiftc', '-module-name', 'LiteratureClock', '-swift-version', '5',
            '-module-cache-path', str(OUTPUT / 'module-cache'),
            '-target', f'{architecture}-apple-macosx12.0',
            '-framework', 'AppKit', '-framework', 'ScreenSaver', '-framework', 'WebKit',
            *(['-emit-library'] if library else ['-parse-as-library']),
            *[str(SOURCE / 'Sources' / source) for source in sources], '-o', str(thin))
        slices.append(str(thin))
    run('xcrun', 'lipo', '-create', *slices, '-output', str(binary))
    actual = subprocess.check_output(['xcrun', 'lipo', '-archs', str(binary)], text=True).split()
    if set(actual) != set(architectures):
        raise RuntimeError(f'Unexpected binary architectures: {actual}')
    run('codesign', '--force', '--sign', '-', str(contents.parent))
    run('codesign', '--verify', '--strict', str(contents.parent))
    return contents.parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--universal', action='store_true', help='Build Apple Silicon and Intel slices')
    parser.add_argument('--skip-web', action='store_true', help='Reuse an existing dist build')
    parser.add_argument('--reuse-resources', action='store_true', help='For Swift-only iteration: reuse existing bundled web files (requires --skip-web)')
    parser.add_argument('--minimal-page', action='store_true', help='Diagnostic build: show a plain counter instead of the clock')
    parser.add_argument('--static-clock', action='store_true', help='Diagnostic build: disable clock animations without changing saved options')
    parser.add_argument('--version', default='0.1.0', help='Numeric release version, optionally prefixed with v')
    args = parser.parse_args()
    if args.reuse_resources and not args.skip_web:
        parser.error('--reuse-resources requires --skip-web')
    version = args.version.removeprefix('v')
    if not re.fullmatch(r'\d+\.\d+\.\d+', version):
        parser.error('--version must be a numeric major.minor.patch version (e.g. v1.2.3)')
    if not args.skip_web:
        run('python3', 'scripts/generate_times.py')
        run('npm', 'run', 'build', '--', '--base=./')
    if not (ROOT / 'dist/index.html').is_file() or not (ROOT / 'dist/times').is_dir():
        parser.error('dist must contain the built clock and generated catalogues')
    OUTPUT.mkdir(exist_ok=True)
    architectures = ['arm64', 'x86_64'] if args.universal else ['arm64']
    saver = bundle('Literature Clock Web', 'saver', ['LiteratureClockView.swift'], architectures, version, library=True, reuse_resources=args.reuse_resources, minimal_page=args.minimal_page, static_clock=args.static_clock)
    preview = bundle('Literature Clock Preview', 'app', ['LiteratureClockView.swift', 'Preview.swift'], architectures, version, reuse_resources=args.reuse_resources, minimal_page=args.minimal_page, static_clock=args.static_clock)
    package = OUTPUT / f'Literature-Clock-Web-macOS-{"universal" if args.universal else "arm64"}.zip'
    run('ditto', '-c', '-k', '--sequesterRsrc', '--keepParent', str(saver), str(package))
    digest = hashlib.sha256(package.read_bytes()).hexdigest()
    package.with_suffix('.zip.sha256').write_text(f'{digest}  {package.name}\n')
    print(f'Built {", ".join(architectures)} prototype:\n{saver}\n{preview}\n{package}')


if __name__ == '__main__':
    main()
