#!/usr/bin/env python3
"""Bundle the macOS saver's exact offline catalogues, fonts, labels and tiles."""
import hashlib
import importlib.util
import json
import shutil
from pathlib import Path

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[1]
MAC = ROOT / 'screensavers/macos-native'
spec = importlib.util.spec_from_file_location('mac_native_build', MAC / 'build.py')
mac = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mac)


def prepare(destination=SOURCE / 'Resources'):
    destination.mkdir(parents=True, exist_ok=True)
    quotes = mac.catalogues()
    (destination / 'Quotes').mkdir(exist_ok=True)
    for locale, rows in quotes.items():
        (destination / 'Quotes' / f'{locale}.json').write_text(json.dumps(rows, ensure_ascii=False), encoding='utf-8')
    def write(name, data):
        (destination / name).write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
    write('locales.json', sorted(quotes))
    fallback = json.loads((ROOT / 'src/strings/common/fallbackQuotes.json').read_text(encoding='utf-8'))
    write('fallback.json', {locale: dict(first=mac.plain(rows[0]['quote_first']), time='', last=mac.plain(rows[0]['quote_last']), title='', author='', sfw=True) for locale, rows in fallback.items()})
    labels, settings, native = [json.loads(path.read_text(encoding='utf-8')) for path in [ROOT / 'src/strings/common/translations.json', ROOT / 'src/strings/common/settings.json', ROOT / 'src/strings/screensaver/native-settings.json']]
    write('settings.json', {key: {**value, **settings[key], **native[key]} for key, value in labels.items()})
    fonts = MAC / 'Assets/Fonts'
    for asset in json.loads((fonts / 'manifest.json').read_text(encoding='utf-8'))['files']:
        if hashlib.sha256((fonts / asset['path']).read_bytes()).hexdigest() != asset['sha256']:
            raise ValueError(f'Font checksum mismatch: {asset["path"]}')
    for folder in ['Fonts', 'Patterns']:
        shutil.copytree(MAC / 'Assets' / folder, destination / folder, dirs_exist_ok=True)
    # Generated from the same SVGs and logical tile sizes as the macOS build.
    seasonal = SOURCE / 'Assets/Patterns'
    sizes = json.loads((destination / 'Patterns/tiles.json').read_text())
    overrides = json.loads((seasonal / 'tiles.json').read_text())
    sizes.update(overrides)
    for name in overrides:
        shutil.copy2(seasonal / f'{name}.png', destination / 'Patterns' / f'{name}.png')
    (destination / 'Patterns/tiles.json').write_text(json.dumps(sizes, indent=2) + '\n')
    (destination / 'Backgrounds').mkdir(exist_ok=True)
    for asset in ['scanlines-bg-dark.jpg', 'scanlines-bg-light.jpg', 'book-paper-seamless.webp']:
        shutil.copy2(ROOT / 'public/assets' / asset, destination / 'Backgrounds' / asset)
    # WPF has no built-in WebP decoder. Convert losslessly at build time, never at runtime.
    from PIL import Image
    with Image.open(destination / 'Backgrounds/book-paper-seamless.webp') as image:
        image.save(destination / 'Backgrounds/book-paper-seamless.png')
    for asset in ['LICENSE', 'THIRD_PARTY_NOTICES.md']:
        shutil.copy2(ROOT / asset, destination / asset)
    shutil.copy2(ROOT / 'src/photo-providers.json', destination / 'photo-providers.json')
    (destination / 'version.txt').write_text((SOURCE / 'VERSION').read_text(encoding='utf-8'))
    print(f'Prepared {len(quotes)} shared native catalogues')


if __name__ == '__main__':
    prepare()
