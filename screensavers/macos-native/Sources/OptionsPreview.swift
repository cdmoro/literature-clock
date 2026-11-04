import AppKit

@_silgen_name("LCCatchOptionsException")
private func catchOptionsException(_ block: @convention(block) () -> Void) -> UnsafePointer<CChar>?

final class OptionsPreviewDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow!
    private var clock: NativeClockView!

    func applicationDidFinishLaunching(_ notification: Notification) {
        let app = NSApplication.shared
        app.setActivationPolicy(.regular)
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 640, height: 420),
                          styleMask: [.titled, .closable], backing: .buffered, defer: false)
        window.title = "Literature Clock — Options Preview"
        let explanation = NSTextField(wrappingLabelWithString: "This preview opens the screen saver options in a standalone app. Changes use temporary preview preferences.")
        explanation.alignment = .center
        explanation.textColor = .secondaryLabelColor
        explanation.frame = window.contentView!.bounds.insetBy(dx: 50, dy: 50)
        explanation.autoresizingMask = [.width, .height]
        window.contentView?.addSubview(explanation)

        clock = NativeClockView(frame: .zero, isPreview: true)!
        clock.preferences = UserDefaults(suiteName: "net.literatureclock.options-preview")!
        clock.preferences.register(defaults: [
            "font": "default", "theme": "base-dark", "screensaver": true,
            "show-time": true, "work": true, "background": "default",
            "palette": "default", "custom-color": "#d24335",
            "progressbar": "background", "background-pattern": "none",
            "pattern-size": 1.0, "background-effect": "none",
            "photo-provider": "picsum", "photo-category": "all",
            "bilingual": false, "quote-attribution": "below"
        ])
        clock.photoDownloadsEnabled = false

        window.center()
        window.makeKeyAndOrderFront(nil)
        app.activate(ignoringOtherApps: true)
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            var sheet: NSWindow?
            if let error = catchOptionsException({ sheet = self.clock.configureSheet }) {
                let alert = NSAlert()
                alert.messageText = "Options panel creation failed"
                alert.informativeText = String(cString: error)
                alert.alertStyle = .critical
                alert.runModal()
                return
            }
            guard let sheet else { return }
            self.window.beginSheet(sheet)
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}

@main enum OptionsPreviewMain {
    static func main() {
        let app = NSApplication.shared
        let delegate = OptionsPreviewDelegate()
        app.delegate = delegate
        withExtendedLifetime(delegate) { app.run() }
    }
}
