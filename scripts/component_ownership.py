"""Map changed paths to shipped artifacts that consume them."""

from pathlib import PurePosixPath

WEB_FILES = {"index.html", "package.json", "package-lock.json", "netlify.toml", "vite.config.ts", "tsconfig.json"}
SHARED = {"Web", "macOS", "Windows"}

# This key is duplicated in the current macOS app's ClockHomeView.swift
# (WidgetQuoteDetail.detailTitle). Keep it listed separately from file-level
# ownership so changes to it also flag the app until that consumer loads a
# shared catalogue directly.
KEY_CONSUMERS = {
    "src/strings/common/settings.json": {
        "settings_attribution_position": SHARED | {"macOS app"},
    },
}


def components_for_translation_key(path: str, key: str) -> set[str]:
    """Return consumers for a translation key with any key-specific overrides."""
    normalized = str(PurePosixPath(path))
    return set(KEY_CONSUMERS.get(normalized, {}).get(key, components_for_path(normalized)))


def components_for_path(value: str) -> set[str]:
    path = str(PurePosixPath(value))
    if path in WEB_FILES:
        return {"Web"}
    exact = {
        "src/strings/translations.json": SHARED,
        "src/strings/settings.json": SHARED,
        "src/strings/fallbackQuotes.json": SHARED,
        "src/strings/about.json": {"Web"},
        "src/strings/colorControls.json": {"Web"},
        "src/strings/reading.json": {"Web"},
        "src/strings/share.json": {"Web"},
        "src/strings/speech.json": {"Web"},
        "screensavers/macos-native/Assets/settings.json": {"macOS", "Windows"},
        "src/strings/common/translations.json": SHARED,
        "src/strings/common/fallbackQuotes.json": SHARED,
        "src/strings/screensaver/native-settings.json": {"macOS", "Windows"},
        "src/strings/types.ts": {"Web"},
        "src/photo-providers.json": SHARED,
        "screensavers/macos-native/build.py": {"macOS", "Windows"},
    }
    if path in exact:
        return set(exact[path])
    if path.startswith("src/strings/web/"):
        return {"Web"}
    if path.startswith("src/strings/common/"):
        return SHARED
    if path.startswith("src/strings/screensaver/"):
        return {"macOS", "Windows"}
    if path.startswith(("src/strings/apple-app/", "src/strings/macos-app/")):
        return {"macOS app"}
    if path.startswith("src/strings/"):
        raise ValueError(f"Translation resource has no ownership mapping: {path}")
    if path.startswith("quotes/"):
        return SHARED
    if path.startswith(("screensavers/macos-native/Sources/", "screensavers/macos-native/Assets/")):
        return {"macOS", "Windows"} if "/Assets/" in path else {"macOS"}
    if path.startswith("screensavers/windows-native/"):
        return {"Windows"} if path not in {"screensavers/windows-native/README.md", "screensavers/windows-native/VERSION"} else set()
    if path.startswith("public/assets/"):
        return {"Web", "Windows"}
    if path.startswith(("src/", "public/", "times/", "plugins/", "admin/")):
        return {"Web"}
    if path.startswith("scripts/") and path not in {
        "scripts/validate_release_versions.py", "scripts/component_ownership.py", "scripts/label_pr_impacts.py"
    } and not path.startswith("scripts/test_"):
        return {"Web"}
    return set()


def changed_components(paths: list[str]) -> set[str]:
    result: set[str] = set()
    for path in paths:
        result.update(components_for_path(path))
    return result
