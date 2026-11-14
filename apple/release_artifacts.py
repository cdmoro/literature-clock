#!/usr/bin/env python3
"""Validate the consolidated release payload before rehearsal or publishing."""
import argparse
import hashlib
from pathlib import Path

PAYLOADS = {
    "Literature-Clock-App-macOS.dmg",
    "Literature-Clock-Native-macOS.saver.zip",
    "Literature-Clock-Native-Windows-win-x64.scr",
    "Literature-Clock-Native-Windows-win-arm64.scr",
}


def validate(directory: Path) -> None:
    expected = PAYLOADS | {name + ".sha256" for name in PAYLOADS}
    actual = {path.name for path in directory.iterdir()}
    if actual != expected:
        raise ValueError(f"Invalid release artifacts: missing={sorted(expected - actual)}, "
                         f"unexpected={sorted(actual - expected)}")
    for name in sorted(PAYLOADS):
        payload = directory / name
        checksum = directory / (name + ".sha256")
        if not payload.is_file() or payload.is_symlink() or payload.stat().st_size == 0:
            raise ValueError(f"Missing, empty or non-regular payload: {name}")
        if not checksum.is_file() or checksum.is_symlink():
            raise ValueError(f"Non-regular checksum: {checksum.name}")
        fields = checksum.read_text().strip().split()
        if len(fields) != 2 or fields[1].removeprefix("*") != name:
            raise ValueError(f"Invalid checksum filename: {checksum.name}")
        digest = hashlib.sha256(payload.read_bytes()).hexdigest()
        if fields[0].lower() != digest:
            raise ValueError(f"Checksum mismatch: {name}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    try:
        validate(args.directory)
    except (ValueError, OSError) as error:
        raise SystemExit(str(error)) from error
    print("Verified all four downloads and their SHA-256 checksums")
