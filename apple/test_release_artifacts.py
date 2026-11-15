import hashlib
from pathlib import Path
import tempfile
import unittest

from release_artifacts import PAYLOADS, validate


class ReleaseArtifactsTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        for name in PAYLOADS:
            data = name.encode()
            (self.directory / name).write_bytes(data)
            (self.directory / (name + ".sha256")).write_text(
                f"{hashlib.sha256(data).hexdigest()}  {name}\n")

    def test_complete_payload(self):
        validate(self.directory)

    def test_missing_app_stops_release(self):
        (self.directory / "Literature-Clock-App-macOS.dmg").unlink()
        with self.assertRaisesRegex(ValueError, "missing="):
            validate(self.directory)

    def test_unexpected_download_stops_release(self):
        (self.directory / "old-build.zip").write_bytes(b"old")
        with self.assertRaisesRegex(ValueError, "unexpected="):
            validate(self.directory)

    def test_corrupt_download_stops_release(self):
        (self.directory / "Literature-Clock-App-macOS.dmg").write_bytes(b"corrupt")
        with self.assertRaisesRegex(ValueError, "Checksum mismatch"):
            validate(self.directory)

    def test_checksum_cannot_point_to_another_file(self):
        checksum = self.directory / "Literature-Clock-App-macOS.dmg.sha256"
        checksum.write_text(checksum.read_text().replace("Literature-Clock-App-macOS.dmg", "../other.dmg"))
        with self.assertRaisesRegex(ValueError, "checksum filename"):
            validate(self.directory)

    def test_empty_download_stops_release(self):
        (self.directory / "Literature-Clock-App-macOS.dmg").write_bytes(b"")
        with self.assertRaisesRegex(ValueError, "empty"):
            validate(self.directory)


if __name__ == "__main__":
    unittest.main()
