import unittest
import json
from pathlib import Path

from component_ownership import changed_components, components_for_path, components_for_translation_key


class ComponentOwnershipTests(unittest.TestCase):
    def test_web_only_strings_are_web_only(self):
        for name in ("about", "colorControls", "reading", "share", "speech"):
            with self.subTest(name=name):
                self.assertEqual(components_for_path(f"src/strings/web/{name}.json"), {"Web"})

    def test_quotes_reach_both_screensavers_and_web(self):
        self.assertEqual(components_for_path("quotes/quotes.es-ES.csv"), {"Web", "macOS", "Windows"})

    def test_currently_shared_strings_are_shared(self):
        self.assertEqual(components_for_path("src/strings/common/settings.json"), {"Web", "macOS", "Windows"})
        self.assertEqual(
            components_for_translation_key("src/strings/common/settings.json", "settings_attribution_position"),
            {"Web", "macOS", "Windows", "macOS app"},
        )
        self.assertEqual(
            components_for_translation_key("src/strings/common/settings.json", "settings_show_seconds"),
            {"Web", "macOS", "Windows"},
        )
        self.assertEqual(components_for_path("src/strings/screensaver/native-settings.json"), {"macOS", "Windows"})
        self.assertEqual(components_for_path("src/strings/web/settings.json"), {"Web"})

    def test_web_and_shared_settings_partition_every_locale_without_duplicate_keys(self):
        common = json.loads(Path("src/strings/common/settings.json").read_text())
        web = json.loads(Path("src/strings/web/settings.json").read_text())
        self.assertEqual(set(common), set(web))
        reference = set(common["en-GB"]) | set(web["en-GB"])
        self.assertFalse(set(common["en-GB"]) & set(web["en-GB"]))
        for locale in common:
            self.assertFalse(set(common[locale]) & set(web[locale]), locale)
            self.assertEqual(set(common[locale]) | set(web[locale]), reference, locale)

    def test_artifact_roots(self):
        self.assertEqual(components_for_path("src/strings/screensaver/native-settings.json"), {"macOS", "Windows"})
        self.assertEqual(components_for_path("src/strings/apple-app/localizable.json"), {"macOS app"})

    def test_unknown_translation_path_fails(self):
        with self.assertRaisesRegex(ValueError, "no ownership mapping"):
            components_for_path("src/strings/new-platform/es.json")

    def test_path_sets_are_unioned(self):
        self.assertEqual(changed_components(["src/strings/web/share.json", "quotes/quotes.es-ES.csv"]),
                         {"Web", "macOS", "Windows"})

    def test_non_payload_documentation_has_no_component(self):
        self.assertEqual(components_for_path("screensavers/windows-native/README.md"), set())


if __name__ == "__main__":
    unittest.main()
