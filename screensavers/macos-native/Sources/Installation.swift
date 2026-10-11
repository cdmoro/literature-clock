import Foundation

/// Filesystem transaction only: no preferences, process control or system installation.
struct NativeInstallation {
    static let identifier = "net.literatureclock.native-saver"
    static let bundleName = "Literature Clock.saver"
    let source: URL
    let directory: URL
    let backups: URL
    var files: FileManager = .default

    struct Failure: LocalizedError {
        let message: String
        var errorDescription: String? { message }
    }
    struct Result {
        let installed: URL
        let backup: URL?
    }
    static func info(_ bundle: URL) -> [String: Any]? {
        guard let data = try? Data(contentsOf: bundle.appendingPathComponent("Contents/Info.plist")) else { return nil }
        return (try? PropertyListSerialization.propertyList(from: data, format: nil)) as? [String: Any]
    }
    static func isLink(_ url: URL) -> Bool {
        (try? url.resourceValues(forKeys: [.isSymbolicLinkKey]).isSymbolicLink) == true
    }
    func existing() throws -> [URL] {
        guard files.fileExists(atPath: directory.path) else { return [] }
        return try files.contentsOfDirectory(at: directory, includingPropertiesForKeys: [.isSymbolicLinkKey])
            .filter { $0.pathExtension == "saver" && !Self.isLink($0) && Self.info($0)?["CFBundleIdentifier"] as? String == Self.identifier }
            .sorted { $0.lastPathComponent < $1.lastPathComponent }
    }
    func validate(_ bundle: URL) throws {
        guard !Self.isLink(bundle), let info = Self.info(bundle),
              info["CFBundleIdentifier"] as? String == Self.identifier,
              let executable = info["CFBundleExecutable"] as? String,
              executable == "Literature Clock",
              files.fileExists(atPath: bundle.appendingPathComponent("Contents/MacOS/" + executable).path) else {
            throw Failure(message: "The screen saver package is invalid. Download the ZIP again.")
        }
        let resources = bundle.appendingPathComponent("Contents/Resources")
        let data = try Data(contentsOf: resources.appendingPathComponent("locales.json"))
        let locales = try JSONDecoder().decode([String].self, from: data)
        guard !locales.isEmpty, locales.contains("en-GB"), locales.allSatisfy({ $0.range(of: "^[a-z]{2,3}(-[A-Z]{2})?$", options: .regularExpression) != nil }) else {
            throw Failure(message: "The screen saver has no valid quote languages.")
        }
        for locale in locales {
            let quotes = try JSONSerialization.jsonObject(with: Data(contentsOf: resources.appendingPathComponent("Quotes/" + locale + ".json")))
            guard let catalogue = quotes as? [String: Any], !catalogue.isEmpty else { throw Failure(message: "A quote catalogue is empty: " + locale) }
        }
        for name in ["fallback.json", "settings.json", "photo-providers.json", "Fonts/manifest.json", "Patterns/tiles.json"] {
            _ = try JSONSerialization.jsonObject(with: Data(contentsOf: resources.appendingPathComponent(name)))
        }
        let signature = Process()
        signature.executableURL = URL(fileURLWithPath: "/usr/bin/codesign")
        signature.arguments = ["--verify", "--strict", bundle.path]
        signature.standardOutput = FileHandle.nullDevice; signature.standardError = FileHandle.nullDevice
        try signature.run(); signature.waitUntilExit()
        guard signature.terminationStatus == 0 else { throw Failure(message: "The screen saver failed its integrity check. Download the ZIP again.") }
    }
    func install(allowDuplicates: Bool) throws -> Result {
        try validate(source)
        let old = try existing()
        guard old.count <= 1 || allowDuplicates else { throw Failure(message: "Confirm replacement of the duplicate installations first.") }
        let destination = directory.appendingPathComponent(Self.bundleName)
        if Self.isLink(directory) || Self.isLink(backups) || Self.isLink(destination) ||
            (files.fileExists(atPath: destination.path) && !old.contains(where: { $0.standardizedFileURL.path == destination.standardizedFileURL.path })) {
            throw Failure(message: "The installation location contains an unrelated file or symbolic link. It was left unchanged.")
        }
        try files.createDirectory(at: directory, withIntermediateDirectories: true)
        let stage = directory.appendingPathComponent(".literature-clock-stage-" + UUID().uuidString)
        let backup = backups.appendingPathComponent(UUID().uuidString)
        defer { try? files.removeItem(at: stage) }
        try files.copyItem(at: source, to: stage)
        try validate(stage)
        var moved: [(original: URL, backup: URL)] = []
        do {
            if !old.isEmpty { try files.createDirectory(at: backup, withIntermediateDirectories: true) }
            for previous in old {
                let saved = backup.appendingPathComponent(previous.lastPathComponent)
                try files.moveItem(at: previous, to: saved)
                moved.append((previous, saved))
            }
            try files.moveItem(at: stage, to: destination)
        } catch {
            var recoveryFailed = false
            for entry in moved.reversed() {
                do { try files.moveItem(at: entry.backup, to: entry.original) }
                catch { recoveryFailed = true }
            }
            if recoveryFailed { throw Failure(message: "Installation failed. Previous copies are preserved at " + backup.path + ". Restore them before trying again.") }
            throw Failure(message: "Installation failed. Your previous screen saver was restored. " + error.localizedDescription)
        }
        return Result(installed: destination, backup: moved.isEmpty ? nil : backup)
    }
}
