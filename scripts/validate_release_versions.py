#!/usr/bin/env python3
"""Require component version bumps when their release payload changes."""

import argparse
import re
import subprocess
import sys
from pathlib import Path

VERSION_FILES = {
    "Web": "package.json",
    "macOS": "screensavers/macos-native/VERSION",
    "Windows": "screensavers/windows-native/VERSION",
    "macOS app": "apple/Version.xcconfig",
}
RELEASE_TAG = re.compile(r"^literature-clock-v(\d+)\.(\d+)\.(\d+)$")
SEMVER = re.compile(r"^\d+\.\d+\.\d+$")

WEB_PATHS = (
    "src/",
    "public/",
    "quotes/",
    "times/",
    "plugins/",
    "admin/",
)
WEB_FILES = {
    "index.html",
    "package.json",
    "package-lock.json",
    "netlify.toml",
    "vite.config.ts",
    "tsconfig.json",
}
SHARED_NATIVE_PATHS = ("quotes/", "src/strings/")
SHARED_NATIVE_FILES = {"src/photo-providers.json"}


def run(*command: str) -> str:
    return subprocess.run(command, check=True, capture_output=True, text=True).stdout.strip()


def component_version(component: str, ref: str | None = None) -> str:
    path = VERSION_FILES[component]
    content = Path(path).read_text().strip() if ref is None else run("git", "show", f"{ref}:{path}")
    if component == "Web":
        import json

        content = json.loads(content)["version"]
    if component == "macOS app":
        match = re.search(r"^MARKETING_VERSION\s*=\s*(\d+\.\d+\.\d+)\s*$", content, re.M)
        content = match.group(1) if match else ""
    if not SEMVER.fullmatch(content):
        raise SystemExit(f"{component} version in {path} must be major.minor.patch; got {content!r}")
    return content


def parse_version(value: str) -> tuple[int, int, int]:
    return tuple(map(int, value.split(".")))


def changed_components(paths: list[str]) -> set[str]:
    changed: set[str] = set()
    for path in paths:
        if path.startswith(("apple/Shared/", "apple/macOS/", "apple/LiteratureClock.xcodeproj/")) or path in {
            "apple/build.py", "apple/Version.xcconfig"
        }:
            changed.add("macOS app")
        if (
            path in WEB_FILES
            or path.startswith(WEB_PATHS)
            or path.startswith("scripts/") and path != "scripts/validate_release_versions.py"
        ):
            changed.add("Web")
        if (
            path.startswith("screensavers/macos-native/Sources/")
            or path.startswith("screensavers/macos-native/Assets/")
            or path == "screensavers/macos-native/build.py"
            or path.startswith(SHARED_NATIVE_PATHS)
            or path in SHARED_NATIVE_FILES
        ):
            changed.add("macOS")
        if (
            path.startswith("screensavers/windows-native/Sources/")
            or path.startswith("screensavers/windows-native/")
            and path not in {"screensavers/windows-native/README.md", "screensavers/windows-native/VERSION"}
            or path.startswith("screensavers/macos-native/Assets/")
            or path.startswith("public/assets/")
            or path == "screensavers/macos-native/build.py"
            or path.startswith(SHARED_NATIVE_PATHS)
            or path in SHARED_NATIVE_FILES
        ):
            changed.add("Windows")
    return changed


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--pull-request",
        action="store_true",
        help="validate component versions without requiring a new consolidated release number",
    )
    args = parser.parse_args()
    current_release = Path("release/VERSION").read_text().strip()
    if not SEMVER.fullmatch(current_release):
        raise SystemExit("release/VERSION must be major.minor.patch")

    tags = run("git", "tag", "--list", "literature-clock-v*").splitlines()
    releases = [(parse_version(match.group(1) + "." + match.group(2) + "." + match.group(3)), tag)
                for tag in tags if (match := RELEASE_TAG.fullmatch(tag))]
    releases.sort()
    current_tuple = parse_version(current_release)
    if args.pull_request:
        previous = next(((version, tag) for version, tag in reversed(releases) if version <= current_tuple), None)
    else:
        if any(version == current_tuple for version, _ in releases):
            raise SystemExit(f"Consolidated release {current_release} already has a tag")
        previous = next(((version, tag) for version, tag in reversed(releases) if version < current_tuple), None)
        if releases and current_tuple <= releases[-1][0]:
            raise SystemExit(f"release/VERSION must be greater than the latest release {releases[-1][1]}")
    if previous is None:
        print(f"First consolidated release {current_release}: no prior release baseline to compare")
        return

    _, previous_tag = previous
    changed_paths = run("git", "diff", "--name-only", f"{previous_tag}..HEAD").splitlines()
    changed = changed_components(changed_paths)
    errors = []
    for component in VERSION_FILES:
        current = component_version(component)
        if run("git", "ls-tree", "--name-only", previous_tag, VERSION_FILES[component]) == "":
            print(f"New component {component}: {current}")
            continue
        previous_version = component_version(component, previous_tag)
        if parse_version(current) < parse_version(previous_version):
            errors.append(f"{component} version went backwards ({previous_version} -> {current})")
        elif component in changed and parse_version(current) <= parse_version(previous_version):
            errors.append(f"{component} code changed since {previous_tag}; bump {VERSION_FILES[component]} above {previous_version}")
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"Release {current_release} component versions validated against {previous_tag}")


if __name__ == "__main__":
    main()
