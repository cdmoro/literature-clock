#!/usr/bin/env python3
"""Build a native, offline macOS saver directly from published CSV catalogues."""
import argparse
import hashlib
import json
import plistlib
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).resolve().parent
OUTPUT = SOURCE / 'build'
sys.path.insert(0, str(ROOT / 'scripts'))
from native_quote_catalogues import build_native_catalogues, plain


def catalogues():
    return build_native_catalogues(ROOT)

def run(*args):
    subprocess.run(args, check=True, cwd=ROOT)


def bundle(name, extension, architecture, data, version):
    bundle_extension = 'saver' if extension == 'saver' else 'app'
    contents = OUTPUT / f'{name}.{bundle_extension}' / 'Contents'
    resources = contents / 'Resources'
    resources.mkdir(parents=True, exist_ok=True)
    binary_dir = contents / 'MacOS'
    if binary_dir.exists():
        shutil.rmtree(binary_dir)
    (resources / 'Quotes').mkdir(exist_ok=True)
    for locale, quotes in data.items():
        (resources / f'Quotes/{locale}.json').write_text(json.dumps(quotes, ensure_ascii=False), encoding='utf-8')
    (resources / 'locales.json').write_text(json.dumps(sorted(data)))
    fallback = json.loads((ROOT / 'src/strings/common/fallbackQuotes.json').read_text())
    (resources / 'fallback.json').write_text(json.dumps({locale: dict(first=plain(rows[0]['quote_first']), time='', last=plain(rows[0]['quote_last']), title='', author='', sfw=True) for locale, rows in fallback.items()}, ensure_ascii=False))
    shutil.copy2(OUTPUT / 'OpticalGlass.metallib', resources / 'OpticalGlass.metallib')
    font_root = SOURCE / 'Assets/Fonts'
    manifest = json.loads((font_root / 'manifest.json').read_text())
    for asset in manifest['files']:
        file = font_root / asset['path']
        if hashlib.sha256(file.read_bytes()).hexdigest() != asset['sha256']:
            raise ValueError(f'Bundled font checksum mismatch: {file}')
    if (resources / 'Fonts').exists():
        shutil.rmtree(resources / 'Fonts')
    (resources / 'font-options.json').unlink(missing_ok=True)
    shutil.copytree(font_root, resources / 'Fonts')
    labels = json.loads((ROOT / 'src/strings/common/translations.json').read_text(encoding='utf-8'))
    settings = json.loads((ROOT / 'src/strings/common/settings.json').read_text())
    native = json.loads((ROOT / 'src/strings/screensaver/native-settings.json').read_text())
    (resources / 'settings.json').write_text(json.dumps({key: {**value, **settings[key], **native[key]} for key, value in labels.items()}, ensure_ascii=False))
    for name_notice in ['LICENSE', 'THIRD_PARTY_NOTICES.md']:
        shutil.copy2(ROOT / name_notice, resources / name_notice)
    (resources / 'Backgrounds').mkdir(exist_ok=True)
    for asset in ['scanlines-bg-dark.jpg', 'scanlines-bg-light.jpg', 'book-paper-seamless.webp']:
        shutil.copy2(ROOT / 'public/assets' / asset, resources / 'Backgrounds' / asset)
    shutil.copytree(SOURCE / 'Assets/Patterns', resources / 'Patterns', dirs_exist_ok=True)
    patterns = resources / 'Patterns'
    sizes_path = patterns / 'tiles.json'
    sizes = json.loads(sizes_path.read_text())
    sizes.update({'christmas': [150, 150], 'halloween': [150, 150], 'valentine': [70, 61.96]})
    sizes_path.write_text(json.dumps(sizes, indent=2) + '\n')
    rasterizer = OUTPUT / 'PatternRasterizer'
    run('xcrun', 'swiftc', '-swift-version', '5', '-module-cache-path', str(OUTPUT / 'module-cache'),
        '-framework', 'AppKit', str(SOURCE / 'Sources/PatternRasterizer.swift'), '-o', str(rasterizer))
    for pattern_name, width, height in [('christmas', 150, 150), ('halloween', 150, 150), ('valentine', 70, 61.96)]:
        run(str(rasterizer), str(patterns / f'{pattern_name}.svg'), str(patterns / f'{pattern_name}.png'), str(width), str(height))
    shutil.copy2(ROOT / 'src/photo-providers.json', resources / 'photo-providers.json')
    library = extension == 'saver'
    executable = name if library else 'LiteratureClockOptionsPreview' if extension == 'app-options' else 'LiteratureClockPreview'
    info = dict(CFBundleIdentifier=f'net.literatureclock.native-{extension}', CFBundleName=name,
                CFBundleDisplayName='Literature Clock' if extension == 'saver' else name,
                CFBundleExecutable=executable, CFBundleVersion=version, CFBundleShortVersionString=version,
                CFBundlePackageType='BNDL' if library else 'APPL', LSMinimumSystemVersion='12.0',
                NSPrincipalClass='NativeClockView' if library else 'NSApplication', NSHighResolutionCapable=True)
    if library:
        info['ScreenSaverThumbnail'] = 'thumbnail'
        for asset in ['thumbnail.png', 'thumbnail@2x.png', 'thumbnail.tiff']:
            shutil.copy2(SOURCE / 'Assets' / asset, resources / asset)
    (contents / 'Info.plist').write_bytes(plistlib.dumps(info))
    if not library:
        (contents / 'PkgInfo').write_text('APPL????')
    binary = contents / 'MacOS' / executable
    binary.parent.mkdir(exist_ok=True)
    shared_sources = ['ProjectLink.swift', 'Options.swift', 'Appearance.swift', 'PhotoBackground.swift', 'NativeClockView.swift']
    sources = shared_sources if library else shared_sources + ['OptionsPreview.swift'] if extension == 'app-options' else shared_sources + ['Preview.swift']
    slices = []
    for arch in architecture:
        thin = OUTPUT / f'{executable}-{arch}'
        exception_object = None
        if extension == 'app-options':
            exception_object = OUTPUT / f'OptionsExceptionCatcher-{arch}.o'
            run('xcrun', 'clang', '-target', f'{arch}-apple-macosx12.0', '-fobjc-arc', '-c',
                str(SOURCE / 'Sources/OptionsExceptionCatcher.m'), '-o', str(exception_object))
        run('xcrun', 'swiftc', '-module-name', 'LiteratureClockNative', '-swift-version', '5',
            '-module-cache-path', str(OUTPUT / 'module-cache'), '-target', f'{arch}-apple-macosx12.0',
            '-framework', 'AppKit', '-framework', 'ScreenSaver',
            *(['-emit-library'] if library else ['-parse-as-library']),
            *[str(SOURCE / 'Sources' / source) for source in sources],
            *([str(exception_object)] if exception_object else []), '-o', str(thin))
        slices.append(str(thin))
    run('xcrun', 'lipo', '-create', *slices, '-output', str(binary))
    actual = subprocess.check_output(['xcrun', 'lipo', '-archs', str(binary)], text=True).split()
    if set(actual) != set(architecture):
        raise RuntimeError(f'Unexpected binary architectures: {actual}')
    run('codesign', '--force', '--sign', '-', str(contents.parent))
    run('codesign', '--verify', '--strict', str(contents.parent))
    return contents.parent

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--universal', action='store_true')
    parser.add_argument('--preview', action='store_true', help='also build the standalone rendering preview app')
    parser.add_argument('--options-preview', action='store_true', help='also build the standalone settings-panel preview app')
    parser.add_argument('--version', default=(SOURCE / 'VERSION').read_text().strip(), help='Numeric major.minor.patch screensaver version')
    args = parser.parse_args()
    if not re.fullmatch(r'\d+\.\d+\.\d+', args.version):
        parser.error('--version must be numeric major.minor.patch (for example 0.1.0)')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    obsolete_installer = OUTPUT / 'Install Literature Clock.app'
    if obsolete_installer.exists():
        shutil.rmtree(obsolete_installer)
    obsolete_distribution = OUTPUT / 'Literature Clock for macOS'
    if obsolete_distribution.exists():
        shutil.rmtree(obsolete_distribution)
    for obsolete_archive in [OUTPUT / 'Literature-Clock-Native-macOS.zip', OUTPUT / 'Literature-Clock-Native-macOS.zip.sha256']:
        obsolete_archive.unlink(missing_ok=True)
    for obsolete_binary in OUTPUT.glob('Install Literature Clock-*'):
        if obsolete_binary.is_file():
            obsolete_binary.unlink()
    run('xcrun', 'metal', '-fmodules-cache-path=' + str(OUTPUT / 'module-cache'), '-fcikernel',
        '-c', str(SOURCE / 'Sources/OpticalGlass.metal'), '-o', str(OUTPUT / 'OpticalGlass.air'))
    run('xcrun', 'metallib', '-cikernel', str(OUTPUT / 'OpticalGlass.air'), '-o', str(OUTPUT / 'OpticalGlass.metallib'))
    data = catalogues()
    architectures = ['arm64', 'x86_64'] if args.universal else ['arm64']
    saver = bundle('Literature Clock', 'saver', architectures, data, args.version)
    if args.preview:
        bundle('Literature Clock Native Preview', 'app', architectures, data, args.version)
    if args.options_preview:
        bundle('Literature Clock Options Preview', 'app-options', architectures, data, args.version)
    standalone_archive = OUTPUT / 'Literature-Clock-Native-macOS.saver.zip'
    run('ditto', '-c', '-k', '--sequesterRsrc', '--keepParent', str(saver), str(standalone_archive))
    standalone_archive.with_suffix('.zip.sha256').write_text(hashlib.sha256(standalone_archive.read_bytes()).hexdigest() + '  ' + standalone_archive.name + '\n')
    print(f'Built native saver with {len(data)} languages: {saver}')


if __name__ == '__main__':
    main()
