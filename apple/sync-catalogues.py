#!/usr/bin/env python3
"""Bundle one compact JSON file per published locale for the iOS and macOS apps."""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "times"
DESTINATION = ROOT / "apple" / "Shared" / "Catalogues"

shutil.rmtree(DESTINATION, ignore_errors=True)
DESTINATION.mkdir(parents=True)
for locale_dir in sorted(path for path in SOURCE.iterdir() if path.is_dir()):
    catalogue = {
        path.stem: json.loads(path.read_text(encoding="utf-8"))
        for path in sorted(locale_dir.glob("*.json"))
        if not path.name.startswith(".")
    }
    (DESTINATION / f"{locale_dir.name}.json").write_text(
        json.dumps(catalogue, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"{locale_dir.name}: {len(catalogue)} minutes")
