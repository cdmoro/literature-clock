import Foundation

private final class InterruptedInstallationFiles: FileManager {
    var blockedDestination: URL?
    override func moveItem(at srcURL: URL, to dstURL: URL) throws {
        if dstURL.standardizedFileURL.path == blockedDestination?.standardizedFileURL.path && srcURL.lastPathComponent.hasPrefix(".literature-clock-stage-") {
            throw NativeInstallation.Failure(message: "Simulated interrupted replacement")
        }
        try super.moveItem(at: srcURL, to: dstURL)
    }
}

enum InstallationChecks {
    private static func check(_ condition: Bool, _ message: String = "Installation check failed") { precondition(condition, message) }
    static func run(source: URL) throws {
        let files = FileManager.default
        let root = files.temporaryDirectory.appendingPathComponent("literature-clock-install-check-" + UUID().uuidString)
        try files.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? files.removeItem(at: root) }
        let directory = root.appendingPathComponent("Screen Savers")
        let backups = root.appendingPathComponent("Backups")
        let operation = NativeInstallation(source: source, directory: directory, backups: backups)
        let preferences = root.appendingPathComponent("settings.plist")
        let sentinel = Data("existing user preferences".utf8)
        try sentinel.write(to: preferences)
        let first = try operation.install(allowDuplicates: false)
        check(first.backup == nil && first.installed.lastPathComponent == NativeInstallation.bundleName)
        try operation.validate(first.installed)
        let original = try Data(contentsOf: first.installed.appendingPathComponent("Contents/MacOS/Literature Clock"))
        let update = try operation.install(allowDuplicates: false)
        check(update.backup != nil, "Update must preserve the previous installation")
        check(try Data(contentsOf: update.backup!.appendingPathComponent("Literature Clock.saver/Contents/MacOS/Literature Clock")) == original)
        let duplicate = directory.appendingPathComponent("Literature Clock 5.saver")
        try files.copyItem(at: source, to: duplicate)
        let unrelated = directory.appendingPathComponent("Unrelated.saver")
        try files.createDirectory(at: unrelated, withIntermediateDirectories: true)
        try sentinel.write(to: unrelated.appendingPathComponent("keep.txt"))
        do { _ = try operation.install(allowDuplicates: false); fatalError("Duplicates require confirmation") }
        catch { check(files.fileExists(atPath: duplicate.path)) }
        let cleaned = try operation.install(allowDuplicates: true)
        check(try operation.existing().count == 1)
        check(files.fileExists(atPath: cleaned.backup!.appendingPathComponent(duplicate.lastPathComponent).path))
        check(try Data(contentsOf: unrelated.appendingPathComponent("keep.txt")) == sentinel)
        let failingFiles = InterruptedInstallationFiles(); failingFiles.blockedDestination = first.installed
        var interrupted = operation; interrupted.files = failingFiles
        do { _ = try interrupted.install(allowDuplicates: true); fatalError("Failure injection must fail installation") }
        catch { check(try Data(contentsOf: first.installed.appendingPathComponent("Contents/MacOS/Literature Clock")) == original, "Rollback must restore the old executable") }
        let conflictDirectory = root.appendingPathComponent("Conflict")
        let conflict = conflictDirectory.appendingPathComponent(NativeInstallation.bundleName)
        try files.createDirectory(at: conflict, withIntermediateDirectories: true)
        try sentinel.write(to: conflict.appendingPathComponent("keep.txt"))
        let conflictOperation = NativeInstallation(source: source, directory: conflictDirectory, backups: backups)
        do { _ = try conflictOperation.install(allowDuplicates: true); fatalError("Unrelated canonical path must never be replaced") }
        catch { check(try Data(contentsOf: conflict.appendingPathComponent("keep.txt")) == sentinel) }
        let links = root.appendingPathComponent("Links")
        try files.createDirectory(at: links, withIntermediateDirectories: true)
        try files.createSymbolicLink(at: links.appendingPathComponent(NativeInstallation.bundleName), withDestinationURL: first.installed)
        let linkOperation = NativeInstallation(source: source, directory: links, backups: backups)
        do { _ = try linkOperation.install(allowDuplicates: true); fatalError("Symbolic links must not be replaced") }
        catch { check(NativeInstallation.isLink(links.appendingPathComponent(NativeInstallation.bundleName))) }
        let corrupt = root.appendingPathComponent("Corrupt.saver")
        try files.copyItem(at: source, to: corrupt)
        try files.removeItem(at: corrupt.appendingPathComponent("Contents/Resources/Quotes/en-GB.json"))
        let corruptOperation = NativeInstallation(source: corrupt, directory: directory, backups: backups)
        do { _ = try corruptOperation.install(allowDuplicates: true); fatalError("Corrupt payload must fail before replacing the installation") }
        catch { check(try Data(contentsOf: first.installed.appendingPathComponent("Contents/MacOS/Literature Clock")) == original) }
        check(try Data(contentsOf: preferences) == sentinel)
        check(!(try files.contentsOfDirectory(atPath: directory.path)).contains { $0.hasPrefix(".literature-clock-stage-") })
        print("PASS: fresh install, update, recoverable backups, duplicate confirmation, unrelated saver preservation, interrupted replacement rollback, path collision, symbolic links, corrupt payload, preferences preservation and staging cleanup")
    }
}
