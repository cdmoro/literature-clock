import AppKit

@main
final class Installer: NSObject, NSApplicationDelegate {
    private var window: NSWindow!
    private var message: NSTextField!
    private var installButton: NSButton!
    private var settingsButton: NSButton!
    private var backupButton: NSButton!
    private var installedBackup: URL?
    private var installing = false
    private var operation: NativeInstallation {
        NativeInstallation(source: Bundle.main.resourceURL!.appendingPathComponent(NativeInstallation.bundleName),
            directory: FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Screen Savers"),
            backups: FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/Literature Clock/Installation Backups"))
    }
    static func main() {
        if CommandLine.arguments.contains("--check-install") {
            do { try InstallationChecks.run(source: Bundle.main.resourceURL!.appendingPathComponent(NativeInstallation.bundleName)); exit(0) }
            catch { fputs("FAIL: \(error)\n", stderr); exit(1) }
        }
        let app = NSApplication.shared
        let delegate = Installer()
        app.delegate = delegate; app.setActivationPolicy(.regular); app.run()
    }
    func applicationDidFinishLaunching(_ notification: Notification) {
        let menu = NSMenu(), entry = NSMenuItem(), applicationMenu = NSMenu()
        applicationMenu.addItem(withTitle: "Quit Installer", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        entry.submenu = applicationMenu; menu.addItem(entry); NSApp.mainMenu = menu
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 520, height: 365), styleMask: [.titled, .closable], backing: .buffered, defer: false)
        window.title = "Install Literature Clock"; window.isReleasedWhenClosed = false
        let stack = NSStackView(); stack.orientation = .vertical; stack.alignment = .leading; stack.spacing = 18
        stack.translatesAutoresizingMaskIntoConstraints = false
        window.contentView!.addSubview(stack)
        NSLayoutConstraint.activate([stack.leadingAnchor.constraint(equalTo: window.contentView!.leadingAnchor, constant: 28), stack.trailingAnchor.constraint(equalTo: window.contentView!.trailingAnchor, constant: -28), stack.topAnchor.constraint(equalTo: window.contentView!.topAnchor, constant: 28)])
        let heading = NSTextField(labelWithString: "Literature Clock for macOS")
        heading.font = .boldSystemFont(ofSize: 22); stack.addArrangedSubview(heading)
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
        stack.addArrangedSubview(NSTextField(labelWithString: "Version " + version))
        let previous = (try? operation.existing()) ?? []
        let versions = Set(previous.compactMap { NativeInstallation.info($0)?["CFBundleShortVersionString"] as? String }).sorted()
        message = NSTextField(wrappingLabelWithString: previous.isEmpty ? "Install the screen saver for your account. No administrator password is needed." : "Update your installed screen saver (" + versions.joined(separator: ", ") + "). Your preferences will be kept, and previous copies will be backed up.")
        message.widthAnchor.constraint(equalToConstant: 464).isActive = true; stack.addArrangedSubview(message)
        let notice = NSTextField(wrappingLabelWithString: "Save or cancel any open screen saver options first. Installation closes System Settings and restarts the screen saver preview so the new version can load.")
        notice.textColor = .secondaryLabelColor; notice.widthAnchor.constraint(equalToConstant: 464).isActive = true; stack.addArrangedSubview(notice)
        installButton = NSButton(title: previous.isEmpty ? "Install" : "Update", target: self, action: #selector(install))
        installButton.bezelStyle = .rounded; installButton.keyEquivalent = "\r"
        settingsButton = NSButton(title: "Open Screen Saver Settings", target: self, action: #selector(openSettings)); settingsButton.isHidden = true
        backupButton = NSButton(title: "Show Previous Copies", target: self, action: #selector(openBackup)); backupButton.isHidden = true
        stack.addArrangedSubview(NSStackView(views: [installButton, settingsButton, backupButton]))
        stack.addArrangedSubview(ProjectLink(title: "View project on GitHub"))
        window.center(); window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply { installing ? .terminateCancel : .terminateNow }
    @objc private func install() {
        do {
            try operation.validate(operation.source)
            let previous = try operation.existing()
            if previous.count > 1 {
                let alert = NSAlert(); alert.messageText = "Replace duplicate installations?"
                alert.informativeText = "These copies will be moved to a recoverable backup and replaced by one Literature Clock installation:\n\n" + previous.map { $0.lastPathComponent }.joined(separator: "\n")
                alert.addButton(withTitle: "Replace and Back Up"); alert.addButton(withTitle: "Cancel")
                guard alert.runModal() == .alertFirstButtonReturn else { return }
            }
            let settings = NSRunningApplication.runningApplications(withBundleIdentifier: "com.apple.systempreferences")
            for app in settings where !app.terminate() { throw NativeInstallation.Failure(message: "Close System Settings, then try again. Your installation has not changed.") }
            installing = true; window.standardWindowButton(.closeButton)?.isEnabled = false
            installButton.isEnabled = false; message.stringValue = "Installing Literature Clock…"
            let transaction = operation
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let deadline = Date().addingTimeInterval(5)
                    while settings.contains(where: { !$0.isTerminated }) && Date() < deadline { Thread.sleep(forTimeInterval: 0.1) }
                    guard settings.allSatisfy({ $0.isTerminated }) else { throw NativeInstallation.Failure(message: "Close System Settings, then try again. Your installation has not changed.") }
                    // Release loaded bundles before replacing any of their resources.
                    guard try Self.restartHost() else { throw NativeInstallation.Failure(message: "macOS could not stop the screen saver preview. Close the preview or log out and back in, then retry. Your installation has not changed.") }
                    let result = try transaction.install(allowDuplicates: true)
                    DispatchQueue.main.async {
                        self.message.stringValue = "Installation complete. Open settings and select Literature Clock. Your preferences are unchanged."
                        self.installing = false; self.window.standardWindowButton(.closeButton)?.isEnabled = true
                        self.installButton.isHidden = true; self.settingsButton.isHidden = false
                        self.settingsButton.keyEquivalent = "\r"
                        self.installedBackup = result.backup; self.backupButton.isHidden = result.backup == nil
                    }
                } catch { DispatchQueue.main.async { self.show(error) } }
            }
        } catch { show(error) }
    }
    private static func restartHost() throws -> Bool {
        let process = Process(); process.executableURL = URL(fileURLWithPath: "/usr/bin/killall")
        process.arguments = ["-u", NSUserName(), "legacyScreenSaver", "legacyScreenSaver-x86_64"]
        process.standardOutput = FileHandle.nullDevice; process.standardError = FileHandle.nullDevice
        try process.run(); process.waitUntilExit()
        // Exit 1 also means there was no running host. Verify independently.
        let deadline = Date().addingTimeInterval(3)
        repeat {
            let check = Process(); check.executableURL = URL(fileURLWithPath: "/usr/bin/pgrep")
            check.arguments = ["-u", String(getuid()), "-x", "legacyScreenSaver|legacyScreenSaver-x86_64"]
            check.standardOutput = FileHandle.nullDevice; check.standardError = FileHandle.nullDevice
            try check.run(); check.waitUntilExit()
            if check.terminationStatus == 1 { return true }
            if check.terminationStatus != 0 { return false }
            Thread.sleep(forTimeInterval: 0.1)
        } while Date() < deadline
        return false
    }
    private func show(_ error: Error) {
        installing = false; window.standardWindowButton(.closeButton)?.isEnabled = true
        installButton.isEnabled = true
        message.stringValue = "Installation did not complete."
        let alert = NSAlert(); alert.messageText = "Couldn’t install Literature Clock"; alert.informativeText = error.localizedDescription
        alert.runModal()
    }
    @objc private func openSettings() {
        let link: String
        if #available(macOS 13.0, *) { link = "x-apple.systempreferences:com.apple.Wallpaper-Settings.extension" }
        else { link = "x-apple.systempreferences:com.apple.preference.desktopscreeneffect?ScreenSaver" }
        NSWorkspace.shared.open(URL(string: link)!)
    }
    @objc private func openBackup() { if let installedBackup { NSWorkspace.shared.open(installedBackup) } }
}
