import AppKit
import ScreenSaver
import WebKit

enum ClockLocale {
    static func resolve(_ identifier: String, supported: [String]) -> String {
        let normalized = identifier.replacingOccurrences(of: "_", with: "-").lowercased()
        if let exact = supported.first(where: { $0.lowercased() == normalized }) { return exact }
        let language = normalized.split(separator: "-").first.map(String.init) ?? ""
        let dominant = ["en": "en-GB", "es": "es-ES", "fr": "fr-FR", "it": "it-IT",
                        "pt": "pt-PT", "de": "de-DE", "el": "el-GR", "zh": "zh-CN",
                        "ru": "ru-RU", "eo": "eo", "ar": "ar-AE"]
        if let match = dominant[language], supported.contains(match) { return match }
        return "en-GB"
    }
}

// A custom origin keeps fetch() working for bundled catalogues without a local server.
final class BundledClock: NSObject, WKURLSchemeHandler {
    let root: URL
    init(root: URL) { self.root = root.standardizedFileURL }
    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, url.host == "clock" else {
            task.didFailWithError(NSError(domain: NSURLErrorDomain, code: NSURLErrorBadURL)); return
        }
        let path = url.path == "/" ? "index.html" : String(url.path.dropFirst())
        let file = root.appendingPathComponent(path).standardizedFileURL
        guard file.path.hasPrefix(root.path + "/") else {
            task.didFailWithError(NSError(domain: NSURLErrorDomain, code: NSURLErrorNoPermissionsToReadFile)); return
        }
        let types = ["html": "text/html", "js": "application/javascript", "css": "text/css",
                     "json": "application/json", "png": "image/png", "jpg": "image/jpeg",
                     "webp": "image/webp", "svg": "image/svg+xml", "ico": "image/x-icon"]
        do {
            let data = try Data(contentsOf: file)
            task.didReceive(HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1",
                                           headerFields: ["Content-Type": types[file.pathExtension] ?? "application/octet-stream"])!)
            task.didReceive(data)
            task.didFinish()
        } catch { task.didFailWithError(error) }
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

@objc(LiteratureClockView)
final class LiteratureClockView: ScreenSaverView, WKNavigationDelegate {
    private static let instances = NSHashTable<LiteratureClockView>.weakObjects()
    private var active = false
    private var recoveryAttempts = 0
    private var loadedSettings: String?
    private static let settingsChanged = Notification.Name("net.literatureclock.web-saver.settingsChanged")
    private var web: WKWebView?
    private var sheet: NSWindow?
    private var controls: [String: NSControl] = [:]
    private let preferences = ScreenSaverDefaults(forModuleWithName: "net.literatureclock.web-saver")!
    private var resources: URL { Bundle(for: LiteratureClockView.self).resourceURL! }
    private var localeNames: [String] {
        guard let data = try? Data(contentsOf: resources.appendingPathComponent("locales.json")),
              let names = try? JSONDecoder().decode([String].self, from: data) else { return ["en-GB"] }
        return names
    }
    private var systemLocale: String {
        ClockLocale.resolve(Locale.preferredLanguages.first ?? "en-GB", supported: localeNames)
    }
    private lazy var labels: [String: [String: String]] = {
        guard let data = try? Data(contentsOf: resources.appendingPathComponent("settings.json")),
              let value = try? JSONDecoder().decode([String: [String: String]].self, from: data) else { return [:] }
        return value
    }()
    private func text(_ key: String) -> String {
        labels[systemLocale]?[key] ?? labels["en-GB"]?[key] ?? key
    }
    private func menuValue(_ key: String) -> String? {
        (controls[key] as? NSPopUpButton)?.selectedItem?.representedObject as? String
    }
    override init?(frame: NSRect, isPreview: Bool) {
        super.init(frame: frame, isPreview: isPreview)
        setup()
    }
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setup()
    }
    private func setup() {
        preferences.register(defaults: ["locale": "en-GB", "theme": "base-dark", "transition": "fade",
                                       "screensaver": true, "show-time": true, "work": false, "progressbar": "none",
                                       "quote-locales": "", "palette": "default"])
        wantsLayer = true
        layer?.backgroundColor = NSColor.black.cgColor
        Self.instances.add(self)
        // Global saver-stop notifications cannot identify which view stopped.
        // During Preview, the small preview can stop while full screen starts.
        // Let the host stop each view independently instead of stopping them all.
        DistributedNotificationCenter.default().addObserver(self, selector: #selector(settingsDidChange),
            name: Self.settingsChanged, object: nil)
        NSWorkspace.shared.notificationCenter.addObserver(self, selector: #selector(hostDidStop),
            name: NSWorkspace.willSleepNotification, object: nil)
    }
    deinit {
        DistributedNotificationCenter.default().removeObserver(self)
        NSWorkspace.shared.notificationCenter.removeObserver(self)
    }
    @objc private func hostDidStop(_ notification: Notification) {
        if Thread.isMainThread { stopAnimation() }
        else { DispatchQueue.main.async { [weak self] in self?.stopAnimation() } }
    }
    override func startAnimation() {
        NSLog("Literature Clock: startAnimation preview=%d", isPreview ? 1 : 0)
        super.startAnimation()
        active = true
        preferences.synchronize()
        let keys = ["locale", "theme", "transition", "screensaver", "show-time", "work", "progressbar", "quote-locales", "palette"]
        let settings = keys.map { String(describing: preferences.object(forKey: $0)!) }.joined(separator: "\u{1f}") + "\u{1f}" + systemLocale
        if web != nil {
            if loadedSettings == settings { return }
            releaseWebView()
        }
        loadedSettings = settings
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.setURLSchemeHandler(BundledClock(root: resources.appendingPathComponent("Web")), forURLScheme: "literature")
        let style = "document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='footer, #exit-zen, .reading-notice {display:none !important}';document.head.append(s)});"
        config.userContentController.addUserScript(WKUserScript(source: style, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let view = WKWebView(frame: bounds, configuration: config)
        view.autoresizingMask = [.width, .height]
        view.navigationDelegate = self
        addSubview(view)
        web = view
        var url = URLComponents(string: "literature://clock/index.html")!
        url.queryItems = keys.map { URLQueryItem(name: $0, value: String(describing: preferences.object(forKey: $0)!)) }
        // NSNumber booleans stringify as 0/1; the web clock requires true/false.
        for key in ["screensaver", "show-time", "work"] {
            url.queryItems?.removeAll { $0.name == key }
            url.queryItems?.append(URLQueryItem(name: key, value: preferences.bool(forKey: key) ? "true" : "false"))
        }
        url.queryItems?.append(contentsOf: [URLQueryItem(name: "static", value: "true"),
                                            URLQueryItem(name: "zen", value: "false"),
                                            URLQueryItem(name: "font", value: "default")])
        let selected = preferences.string(forKey: "quote-locales") ?? ""
        if selected.isEmpty {
            url.queryItems?.removeAll { $0.name == "locale" }
            url.queryItems?.append(URLQueryItem(name: "locale", value: systemLocale))
        }
        url.queryItems?.append(URLQueryItem(name: "ui-locale", value: systemLocale))
        url.queryItems?.append(URLQueryItem(name: "random-locale", value: selected.split(separator: ",").count > 1 ? "true" : "false"))
        view.load(URLRequest(url: url.url!))
    }
    private func releaseWebView() {
        web?.stopLoading()
        web?.navigationDelegate = nil
        web?.removeFromSuperview()
        web = nil
        loadedSettings = nil
    }
    override func stopAnimation() {
        NSLog("Literature Clock: stopAnimation preview=%d", isPreview ? 1 : 0)
        active = false
        recoveryAttempts = 0
        releaseWebView()
        super.stopAnimation()
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        NSLog("Literature Clock: web content terminated preview=%d", isPreview ? 1 : 0)
        guard active, web === webView else { return }
        guard recoveryAttempts < 2 else {
            NSLog("Literature Clock: web content repeatedly terminated; waiting for next host start")
            stopAnimation()
            return
        }
        recoveryAttempts += 1
        releaseWebView()
        startAnimation()
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(navigationAction.request.url?.scheme == "literature" ? .allow : .cancel)
    }
    override var hasConfigureSheet: Bool { true }
    override var configureSheet: NSWindow? {
        NSLog("Literature Clock: configureSheet requested")
        if let sheet { return sheet }
        preferences.synchronize()
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 700, height: 470),
                              styleMask: [.titled], backing: .buffered, defer: false)
        window.title = "Literature Clock"
        let background = NSVisualEffectView(frame: window.contentView!.bounds)
        background.material = .sheet
        background.blendingMode = .behindWindow
        background.state = .active
        background.autoresizingMask = [.width, .height]
        window.contentView = background
        let stack = NSStackView()
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 10
        stack.translatesAutoresizingMaskIntoConstraints = false
        window.contentView!.addSubview(stack)
        NSLayoutConstraint.activate([stack.leadingAnchor.constraint(equalTo: window.contentView!.leadingAnchor, constant: 24),
                                     stack.trailingAnchor.constraint(equalTo: window.contentView!.trailingAnchor, constant: -24),
                                     stack.topAnchor.constraint(equalTo: window.contentView!.topAnchor, constant: 24),
                                     stack.bottomAnchor.constraint(equalTo: window.contentView!.bottomAnchor, constant: -24)])
        func section(_ key: String, first: Bool = false) {
            if !first {
                let divider = NSBox()
                divider.boxType = .separator
                stack.addArrangedSubview(divider)
                divider.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true
                stack.setCustomSpacing(16, after: divider)
            }
            let title = NSTextField(labelWithString: text(key))
            title.font = .boldSystemFont(ofSize: NSFont.systemFontSize)
            stack.addArrangedSubview(title)
        }
        section("settings_content", first: true)
        stack.addArrangedSubview(NSTextField(labelWithString: text("settings_quote_languages")))
        let saved = preferences.string(forKey: "quote-locales") ?? ""
        let selected = Set(saved.split(separator: ",").map(String.init))
        let languages = localeNames
        for offset in stride(from: 0, to: languages.count, by: 3) {
            let row = NSStackView()
            row.distribution = .fillEqually
            row.spacing = 16
            for locale in languages[offset..<min(offset + 3, languages.count)] {
                let name = Locale(identifier: systemLocale).localizedString(forIdentifier: locale) ?? locale
                let check = NSButton(checkboxWithTitle: name, target: nil, action: nil)
                check.state = selected.contains(locale) ? .on : .off
                controls["quote-locale:" + locale] = check
                row.addArrangedSubview(check)
            }
            stack.addArrangedSubview(row)
            row.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true
        }
        let help = NSTextField(wrappingLabelWithString: text("languages_help"))
        help.textColor = .secondaryLabelColor
        help.font = .systemFont(ofSize: NSFont.smallSystemFontSize)
        stack.addArrangedSubview(help)
        stack.setCustomSpacing(20, after: help)
        section("settings_appearance")
        let theme = preferences.string(forKey: "theme") ?? "base-dark"
        let parts = theme.split(separator: "-").map(String.init)
        for (key, label, values) in [
            ("theme-base", "theme", ["base", "book", "terminal", "horizon", "poster", "elegant", "retro"]),
            ("theme-mode", "settings_scheme", ["light", "dark", "system"]),
            ("palette", "settings_color", ["default", "red", "pink", "green", "orange", "purple", "blue", "gray", "random"]),
            ("transition", "transition", ["none", "fade", "slide", "blur", "zoom"]),
            ("progressbar", "progressbar_mode", ["none", "theme", "top", "bottom", "background"])
        ] {
            if key == "transition" { section("settings_behavior") }
            let menu = NSPopUpButton()
            let value = key == "theme-base" ? parts.first : key == "theme-mode" ? parts.last : preferences.string(forKey: key)
            for raw in values {
                let labelKey = key == "transition" ? "transition_" + raw : key == "progressbar" ? "settings_progress_" + raw :
                    raw == "default" ? "default_font" : raw == "random" ? "settings_color_random" : raw
                let label = text(labelKey)
                let item = NSMenuItem(title: label, action: nil, keyEquivalent: "")
                item.representedObject = raw
                menu.menu?.addItem(item)
                if raw == value { menu.select(item) }
            }
            controls[key] = menu
            let title = NSTextField(labelWithString: text(label))
            title.widthAnchor.constraint(equalToConstant: 180).isActive = true
            menu.widthAnchor.constraint(equalToConstant: 260).isActive = true
            stack.addArrangedSubview(NSStackView(views: [title, menu]))
        }
        for (key, label) in [("screensaver", "movement"), ("show-time", "time_mode"), ("work", "work_mode_title")] {
            let check = NSButton(checkboxWithTitle: text(label), target: nil, action: nil)
            check.state = preferences.bool(forKey: key) ? .on : .off
            controls[key] = check
            stack.addArrangedSubview(check)
        }
        let cancel = NSButton(title: text("cancel"), target: self, action: #selector(cancelOptions))
        cancel.keyEquivalent = "\u{1b}"
        let save = NSButton(title: text("save"), target: self, action: #selector(saveOptions))
        save.keyEquivalent = "\r"
        let spacer = NSView()
        let buttons = NSStackView(views: [spacer, cancel, save])
        buttons.spacing = 12
        stack.addArrangedSubview(buttons)
        buttons.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true
        window.contentView!.layoutSubtreeIfNeeded()
        window.setContentSize(NSSize(width: 700, height: max(470, stack.fittingSize.height + 48)))
        sheet = window
        return window
    }
    @objc private func cancelOptions() {
        closeOptions()
        DispatchQueue.main.async {
            for view in Self.instances.allObjects where !view.active && view.isPreview && view.window != nil {
                view.startAnimation()
            }
        }
    }
    @objc private func saveOptions() {
        let languages = localeNames.filter { (controls["quote-locale:" + $0] as? NSButton)?.state == .on }
        preferences.set(languages.joined(separator: ","), forKey: "quote-locales")
        preferences.set(languages.first ?? systemLocale, forKey: "locale")
        let base = menuValue("theme-base") ?? "base"
        let mode = menuValue("theme-mode") ?? "dark"
        preferences.set(base + "-" + mode, forKey: "theme")
        for (key, control) in controls {
            if key.hasPrefix("quote-locale:") || key.hasPrefix("theme-") { continue }
            if control is NSPopUpButton { preferences.set(menuValue(key), forKey: key) }
            else if let button = control as? NSButton { preferences.set(button.state == .on, forKey: key) }
        }
        preferences.synchronize()
        closeOptions()
        DistributedNotificationCenter.default().postNotificationName(Self.settingsChanged, object: nil,
            userInfo: nil, deliverImmediately: true)
        // The sheet can belong to a different view from the visible system preview.
        // Remote preview windows can report isVisible=false even while Settings
        // displays their surface. Resume attached previews after configuration;
        // detached configuration-only views stay stopped.
        DispatchQueue.main.async {
            for view in Self.instances.allObjects where view.active || (view.isPreview && view.window != nil) {
                view.releaseWebView()
                view.startAnimation()
            }
        }
    }
    @objc private func settingsDidChange(_ notification: Notification) {
        DispatchQueue.main.async { [weak self] in
            guard let self, self.active else { return }
            self.startAnimation()
        }
    }
    private func closeOptions() {
        guard let sheet else { return }
        if let parent = sheet.sheetParent { parent.endSheet(sheet) }
        else { sheet.orderOut(nil) }
        self.sheet = nil
        controls.removeAll()
    }
}
