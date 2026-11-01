"""Coverage for macOS app integration into the consolidated version checks."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import validate_release_versions as versions


class MacAppVersions(unittest.TestCase):
    def test_app_and_widget_paths_map_to_app_only(self):
        for path in ('apple/Shared/App/ClockHomeView.swift', 'apple/Shared/Widgets/LiteratureClockWidget.swift',
                     'apple/macOS/Info.plist', 'apple/LiteratureClock.xcodeproj/project.pbxproj',
                     'apple/Version.xcconfig', 'apple/build.py'):
            with self.subTest(path=path):
                self.assertEqual(versions.changed_components([path]), {'macOS app'})

    def test_docs_and_paused_ios_do_not_change_mac_app(self):
        self.assertEqual(versions.changed_components(['apple/README.md', 'apple/iOS/Info.plist']), set())

    def test_reads_version_from_xcconfig(self):
        with patch.object(versions, 'run', return_value='MARKETING_VERSION = 0.1.0\nCURRENT_PROJECT_VERSION = 1\n'):
            self.assertEqual(versions.component_version('macOS app', 'baseline'), '0.1.0')

    def test_rejects_invalid_app_version(self):
        with patch.object(versions, 'run', return_value='MARKETING_VERSION = 0.1\n'):
            with self.assertRaises(SystemExit):
                versions.component_version('macOS app', 'baseline')

    def test_first_release_of_new_component_has_no_prior_version(self):
        def run(*args):
            if args[1] == 'tag':
                return 'literature-clock-v1.0.0'
            if args[1] == 'diff':
                return 'apple/Shared/App/ClockHomeView.swift'
            if args[1] == 'ls-tree':
                return '' if args[-1] == 'apple/Version.xcconfig' else args[-1]
            raise AssertionError(args)
        with tempfile.TemporaryDirectory() as directory:
            release = Path(directory) / 'VERSION'
            release.write_text('1.1.0')
            with patch.object(versions, 'Path', return_value=release), patch.object(versions, 'run', side_effect=run), \
                    patch.object(versions, 'component_version', return_value='0.1.0'), \
                    patch('sys.argv', ['validate_release_versions.py']):
                versions.main()


if __name__ == '__main__':
    unittest.main()
