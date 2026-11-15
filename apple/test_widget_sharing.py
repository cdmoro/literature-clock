import unittest

from diagnose_widget_sharing import assess, sharing_events


class SharingEvidenceTests(unittest.TestCase):
    def event(self, **overrides):
        return {"token": "unique", "palette": "orange", "group": "test.group",
                "build": "6", "accent": "#123456", "selection": "app", "appliedPalette": "orange", **overrides}

    def test_color_alone_cannot_prove_sharing(self):
        status, _ = assess([("APP", self.event()), ("WIDGET", self.event(token="old"))], "6")
        self.assertEqual(status, "FAIL")

    def test_marker_and_palette_prove_same_values(self):
        self.assertEqual(assess([("APP", self.event()), ("WIDGET", self.event())], "6")[0], "PASS")

    def test_custom_color_requires_hex_match(self):
        self.assertEqual(assess([("APP", self.event(palette="custom")),
                                 ("WIDGET", self.event(palette="custom", accent="#ABCDEF"))], "6")[0], "FAIL")

    def test_custom_color_can_pass(self):
        value = self.event(palette="custom", appliedPalette="custom")
        self.assertEqual(assess([("APP", value), ("WIDGET", value)], "6")[0], "PASS")

    def test_matching_storage_with_wrong_resolved_palette_fails(self):
        self.assertEqual(assess([("APP", self.event()),
                                 ("WIDGET", self.event(appliedPalette="red"))], "6")[0], "FAIL")

    def test_fixed_widget_color_does_not_test_inheritance(self):
        self.assertEqual(assess([("APP", self.event()),
                                 ("WIDGET", self.event(selection="red"))], "6")[0], "INCONCLUSIVE")

    def test_old_build_cannot_pass(self):
        self.assertEqual(assess([("APP", self.event(build="3")), ("WIDGET", self.event(build="3"))], "6")[0], "INCONCLUSIVE")

    def test_latest_app_change_invalidates_previous_success(self):
        self.assertEqual(assess([("APP", self.event()), ("WIDGET", self.event()),
                                 ("APP", self.event(token="new"))], "6")[0], "INCONCLUSIVE")

    def test_no_widget_is_not_a_sharing_failure(self):
        self.assertEqual(assess([("APP", self.event())], "6")[0], "INCONCLUSIVE")

    def test_parse_only_structured_probe_logs(self):
        events = list(sharing_events([{"eventMessage": 'SHARING_APP {"build":"6"}'},
                                     {"eventMessage": "unrelated"},
                                     {"eventMessage": "SHARING_WIDGET {bad}"}]))
        self.assertEqual(events, [("APP", {"build": "6"})])


if __name__ == "__main__":
    unittest.main()
