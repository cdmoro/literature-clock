import AppKit
import WebKit

final class PreviewDelegate: NSObject, NSApplicationDelegate {
    var window: NSWindow!
    var clock: LiteratureClockView!
    func applicationDidFinishLaunching(_ notification: Notification) {
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1100, height: 720),
                          styleMask: [.titled, .closable, .resizable, .miniaturizable], backing: .buffered, defer: false)
        window.title = "Literature Clock — Web Screensaver Prototype"
        clock = LiteratureClockView(frame: window.contentView!.bounds, isPreview: false)!
        clock.autoresizingMask = [.width, .height]
        window.contentView = clock
        let menu = NSMenu()
        let appItem = NSMenuItem()
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "Settings…", action: #selector(settings), keyEquivalent: ",").target = self
        appMenu.addItem(withTitle: "Quit", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu
        menu.addItem(appItem)
        NSApp.mainMenu = menu
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        clock.startAnimation()
        if CommandLine.arguments.contains("--check-lifecycle") {
            Task { @MainActor in
                do {
                    try await checkLifecycle()
                    print("PASS: 3 real web-view start/stop cycles, sleep callback, and quote loading")
                    NSApp.terminate(nil)
                } catch {
                    fputs("FAIL: \(error)\n", stderr)
                    exit(1)
                }
            }
        }
    }
    private enum CheckFailure: Error { case timedOut, retainedWebView, duplicateWebViews }
    @MainActor private func waitForQuote() async throws {
        for _ in 0..<150 {
            let views = clock.subviews.compactMap { $0 as? WKWebView }
            if views.count > 1 { throw CheckFailure.duplicateWebViews }
            if let web = views.first {
                let value = try? await web.evaluateJavaScript("Boolean(document.querySelector('#quote #title')?.textContent?.trim())")
                if value as? Bool == true { return }
            }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        throw CheckFailure.timedOut
    }
    @MainActor private func checkLifecycle() async throws {
        for cycle in 0..<3 {
            try await waitForQuote()
            // Repeated host starts must not add duplicate web views.
            clock.startAnimation()
            if clock.subviews.compactMap({ $0 as? WKWebView }).count != 1 { throw CheckFailure.duplicateWebViews }
            if cycle == 1 {
                clock.perform(NSSelectorFromString("hostDidStop:"), with: Notification(name: NSWorkspace.willSleepNotification))
            } else { clock.stopAnimation() }
            if clock.subviews.contains(where: { $0 is WKWebView }) { throw CheckFailure.retainedWebView }
            clock.startAnimation()
        }
        try await waitForQuote()
    }
    @objc func settings() {
        if let sheet = clock.configureSheet { window.beginSheet(sheet) }
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationWillTerminate(_ notification: Notification) { clock.stopAnimation() }
}

@main enum PreviewMain {
    static func main() {
        let app = NSApplication.shared
        let delegate = PreviewDelegate()
        app.delegate = delegate
        app.setActivationPolicy(.regular)
        withExtendedLifetime(delegate) { app.run() }
    }
}
