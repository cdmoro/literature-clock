import AppKit

final class PhotoCheckProtocol: URLProtocol {
    static var count = 0
    static var status = 200
    static var imageData = Data()
    static var catalogueData = Data()
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        Self.count += 1
        let isCatalogue = request.url?.host == "images-api.nasa.gov" || request.url?.host == "commons.wikimedia.org"
        let response = HTTPURLResponse(url: request.url!, statusCode: Self.status, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": isCatalogue ? "application/json" : "image/png"])!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: isCatalogue ? Self.catalogueData : Self.imageData)
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}

final class PreviewDelegate: NSObject, NSApplicationDelegate {
    var window: NSWindow!
    var clock: NativeClockView!
    func applicationDidFinishLaunching(_ notification: Notification) {
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1100, height: 720), styleMask: [.titled, .closable, .resizable], backing: .buffered, defer: false)
        clock = NativeClockView(frame: window.contentView!.bounds, isPreview: false)!
        clock.autoresizingMask = [.width, .height]
        window.contentView = clock
        window.title = "Literature Clock — Native Prototype"
        let menu = NSMenu(), item = NSMenuItem(), submenu = NSMenu()
        submenu.addItem(withTitle: "Settings…", action: #selector(settings), keyEquivalent: ",").target = self
        submenu.addItem(withTitle: "Quit", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        item.submenu = submenu; menu.addItem(item); NSApp.mainMenu = menu
        window.center(); window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
        var checkSuite: String?
        if CommandLine.arguments.contains("--check-render") {
            let suite = "net.literatureclock.native-check." + UUID().uuidString
            checkSuite = suite
            let defaults = UserDefaults(suiteName: suite)!
            defaults.register(defaults: ["theme": "base-dark", "background-pattern": "none", "palette": "default", "custom-color": "#d24335", "show-time": true, "hide-book-title": false, "quote-locales": "", "work": true, "screensaver": true, "progressbar": "background"])
            clock.preferences = defaults
            clock.photoDownloadsEnabled = false
        }
        clock.startAnimation()
        if CommandLine.arguments.contains("--check-render") {
            let keys = ["theme", "background-pattern", "palette", "custom-color", "show-time", "hide-book-title", "quote-locales", "work", "locale", "screensaver", "progressbar"]
            let saved = keys.map { ($0, clock.preferences.object(forKey: $0)) }
            defer {
                for (key, value) in saved { clock.preferences.set(value, forKey: key) }
                if let suite = checkSuite { clock.preferences.removePersistentDomain(forName: suite) }
                clock.preferences.synchronize()
            }
            clock.preferences.set("base-dark", forKey: "theme")
            let output = URL(fileURLWithPath: "/private/tmp/literature-clock-native-checks", isDirectory: true)
            try! FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
            let parts = Calendar.current.dateComponents([.hour, .minute], from: Date())
            let minute = String(format: "%02d:%02d", parts.hour ?? 0, parts.minute ?? 0)
            for locale in clock.localeNames {
                guard let quote = clock.catalogue(locale).values.first?.first else { fatalError("Empty catalogue: \(locale)") }
                clock.quote = quote; clock.quoteLocale = locale; clock.lastMinute = minute
                let expected = ["ar": "Marhey", "ru": "Pangolin", "el": "Sansation", "zh": "ZCOOLKuaiLe"][locale.split(separator: "-").first.map(String.init) ?? "en"] ?? "SpecialElite"
                precondition(clock.quoteFont(24).fontName.contains(expected), "Bundled font missing for \(locale)")
                let bitmap = clock.bitmapImageRepForCachingDisplay(in: clock.bounds)!
                clock.cacheDisplay(in: clock.bounds, to: bitmap)
                try! bitmap.representation(using: .png, properties: [:])!.write(to: output.appendingPathComponent(locale + ".png"))
            }
            clock.refreshQuote(Date().addingTimeInterval(60))
            precondition(clock.lastMinute != minute, "Minute change did not update the native clock")
            clock.preferences.set("el-GR", forKey: "quote-locales")
            clock.preferences.set(true, forKey: "work")
            var gap = Calendar.current.dateComponents([.year, .month, .day], from: Date())
            gap.hour = 12; gap.minute = 34
            clock.lastMinute = ""; clock.refreshQuote(Calendar.current.date(from: gap)!)
            precondition(clock.quote?.last.isEmpty == false, "Missing minute must explain the missing quote")
            for theme in NativeAppearance.themes {
                clock.preferences.set(theme + "-dark", forKey: "theme")
                for locale in clock.localeNames {
                    clock.quoteLocale = locale
                    let family = NativeAppearance.fontFamily(theme: theme, locale: locale)
                    precondition(clock.quoteFont(24).fontName.lowercased().contains(family), "Missing font: \(theme)/\(locale)/\(family)")
                }
                for mode in ["light", "dark"] {
                    clock.preferences.set(theme + "-" + mode, forKey: "theme")
                    clock.preferences.set(theme == "book" ? "dots" : "grid", forKey: "background-pattern")
                    clock.quoteLocale = "el-GR"
                    clock.quote = clock.catalogue("el-GR").values.first!.first!
                    clock.lastMinute = minute
                    let bitmap = clock.bitmapImageRepForCachingDisplay(in: clock.bounds)!
                    clock.cacheDisplay(in: clock.bounds, to: bitmap)
                    try! bitmap.representation(using: .png, properties: [:])!.write(to: output.appendingPathComponent(theme + "-" + mode + ".png"))
                }
            }
            let first = clock.configureSheet!
            first.orderOut(nil)
            let second = clock.configureSheet!
            precondition(first !== second, "Closed options sheet was reused")
            let well = clock.controls["custom-color"] as! NSColorWell
            well.color = NativeAppearance.color("#123456")!
            clock.perform(NSSelectorFromString("customColorChanged"))
            precondition(clock.menuValue("palette") == "custom", "Colour picker did not select custom colour")
            let themeMenu = clock.controls["theme-base"] as! NSPopUpButton
            themeMenu.select(themeMenu.itemArray.first { $0.representedObject as? String == "book" }!)
            let other = NativeClockView(frame: clock.bounds, isPreview: true)!
            let otherSuite = "net.literatureclock.native-check." + UUID().uuidString
            other.preferences = UserDefaults(suiteName: otherSuite)!
            defer { other.preferences.removePersistentDomain(forName: otherSuite) }
            clock.perform(NSSelectorFromString("saveOptions"))
            precondition(other.preferences.string(forKey: "theme") == "book-dark" || other.preferences.string(forKey: "theme") == "book-light", "Theme did not reach another view")
            precondition(other.preferences.string(forKey: "palette") == "custom", "Custom palette did not reach another view")
            precondition(other.preferences.string(forKey: "custom-color") == "#123456", "Custom colour did not reach another view")
            precondition(clock.preferences.string(forKey: "custom-color") == "#123456", "Custom colour was not saved")
            for palette in ["default", "pink", "green", "random"] {
                _ = clock.configureSheet
                let button = clock.swatches.first { $0.value == palette }!
                clock.perform(NSSelectorFromString("selectSwatch:"), with: button)
                precondition(clock.menuValue("palette") == palette, "Swatch did not select \(palette)")
                clock.perform(NSSelectorFromString("saveOptions"))
                precondition(clock.preferences.string(forKey: "palette") == palette, "Custom colour overrode \(palette) on Save")
            }
            _ = clock.configureSheet
            (clock.controls["hide-book-title"] as! NSButton).state = .on
            clock.perform(NSSelectorFromString("saveOptions"))
            precondition(clock.preferences.bool(forKey: "hide-book-title") && other.preferences.bool(forKey: "hide-book-title"), "Hide title did not reach other views")
            _ = clock.configureSheet
            for (key, value) in [("theme-base", "photo"), ("photo-provider", "nasa"), ("photo-category", "moon")] {
                let menu = clock.controls[key] as! NSPopUpButton
                menu.select(menu.itemArray.first { $0.representedObject as? String == value }!)
                if key == "photo-provider" { clock.perform(NSSelectorFromString("photoControlsChanged")) }
            }
            clock.perform(NSSelectorFromString("saveOptions"))
            precondition(clock.preferences.string(forKey: "photo-provider") == "nasa" && other.preferences.string(forKey: "photo-category") == "moon", "Photo settings did not persist across views")
            let fixture = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 4, pixelsHigh: 3, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
            PhotoCheckProtocol.imageData = fixture.representation(using: .png, properties: [:])!
            let config = URLSessionConfiguration.ephemeral
            config.protocolClasses = [PhotoCheckProtocol.self]
            let photoCache = output.appendingPathComponent(UUID().uuidString + ".jpg")
            defer { try? FileManager.default.removeItem(at: photoCache); try? FileManager.default.removeItem(at: photoCache.appendingPathExtension("json")) }
            let photo = NativePhotoBackground(cacheURL: photoCache, session: URLSession(configuration: config))
            var loaded = false
            let now = Date()
            for _ in 0..<60 { photo.update(now: now, size: NSSize(width: 1100, height: 720)) { loaded = true } }
            let deadline = Date().addingTimeInterval(3)
            while !loaded && Date() < deadline { RunLoop.current.run(until: Date().addingTimeInterval(0.01)) }
            precondition(loaded && PhotoCheckProtocol.count == 1 && photo.image != nil, "Photo did not load once per minute")
            precondition(FileManager.default.fileExists(atPath: photoCache.path), "Photo was not cached")
            let offline = NativePhotoBackground(cacheURL: photoCache, session: URLSession(configuration: config))
            precondition(offline.image != nil, "Offline activation lost the cached photo")
            PhotoCheckProtocol.status = 503
            var unexpectedChange = false
            offline.update(now: now.addingTimeInterval(60), size: NSSize(width: 1100, height: 720)) { unexpectedChange = true }
            let failureDeadline = Date().addingTimeInterval(3)
            while PhotoCheckProtocol.count < 2 && Date() < failureDeadline { RunLoop.current.run(until: Date().addingTimeInterval(0.01)) }
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
            precondition(PhotoCheckProtocol.count == 2 && offline.image != nil && !unexpectedChange, "A failed download replaced the cached photo")
            photo.cancel(); offline.cancel()
            PhotoCheckProtocol.status = 200
            PhotoCheckProtocol.catalogueData = Data(#"{"collection":{"items":[{"data":[{"nasa_id":"test","title":"Nebula","secondary_creator":"NASA/ESA"}],"links":[{"href":"https://images-assets.nasa.gov/image/test/test~medium.jpg","render":"image"}]}]}}"#.utf8)
            let nasa = NativePhotoBackground(cacheURL: nil, session: URLSession(configuration: config))
            var nasaLoaded = false
            nasa.update(now: now, size: clock.bounds.size, provider: "nasa", category: "nebulae") { nasaLoaded = true }
            let nasaDeadline = Date().addingTimeInterval(3)
            while !nasaLoaded && Date() < nasaDeadline { RunLoop.current.run(until: Date().addingTimeInterval(0.01)) }
            precondition(nasaLoaded && PhotoCheckProtocol.count == 4 && nasa.credit == "NASA/ESA", "NASA catalogue/image/credit failed")
            nasaLoaded = false
            nasa.update(now: now.addingTimeInterval(60), size: clock.bounds.size, provider: "nasa", category: "nebulae") { nasaLoaded = true }
            let nextDeadline = Date().addingTimeInterval(3)
            while !nasaLoaded && Date() < nextDeadline { RunLoop.current.run(until: Date().addingTimeInterval(0.01)) }
            precondition(nasaLoaded && PhotoCheckProtocol.count == 5, "NASA catalogue was not cached")
            nasa.cancel()
            PhotoCheckProtocol.catalogueData = Data(#"{"query":{"pages":[{"title":"File:Landscape.jpg","imageinfo":[{"mime":"image/jpeg","thumburl":"https://thumb.wikimedia.org/landscape.jpg","descriptionurl":"https://commons.wikimedia.org/wiki/File:Landscape.jpg","extmetadata":{"LicenseShortName":{"value":"CC0"},"AttributionRequired":{"value":"false"},"Artist":{"value":"<a>A &amp; B</a>"}}}]}]}}"#.utf8)
            let commons = NativePhotoBackground(cacheURL: nil, session: URLSession(configuration: config))
            var commonsLoaded = false
            commons.update(now: now, size: clock.bounds.size, provider: "commons", category: "landscapes") { commonsLoaded = true }
            let commonsDeadline = Date().addingTimeInterval(3)
            while !commonsLoaded && Date() < commonsDeadline { RunLoop.current.run(until: Date().addingTimeInterval(0.01)) }
            precondition(commonsLoaded && PhotoCheckProtocol.count == 7 && commons.credit == "A & B / Wikimedia Commons / CC0", "Commons catalogue/credits failed")
            commons.cancel()
            _ = clock.configureSheet
            let providerMenu = clock.controls["photo-provider"] as! NSPopUpButton
            providerMenu.select(providerMenu.itemArray.first { $0.representedObject as? String == "commons" }!)
            clock.perform(NSSelectorFromString("photoControlsChanged"))
            let categoryMenu = clock.controls["photo-category"] as! NSPopUpButton
            precondition(categoryMenu.superview === providerMenu.superview && !categoryMenu.isHidden, "Photo selectors are not joined")
            categoryMenu.select(categoryMenu.itemArray.first { $0.representedObject as? String == "animals" }!)
            clock.perform(NSSelectorFromString("saveOptions"))
            precondition(other.preferences.string(forKey: "photo-provider") == "commons" && other.preferences.string(forKey: "photo-category") == "animals", "Commons options were not saved")
            let left = NativeClockView(frame: clock.bounds, isPreview: false)!
            let right = NativeClockView(frame: clock.bounds, isPreview: false)!
            left.preferences = clock.preferences; right.preferences = clock.preferences
            left.photoDownloadsEnabled = false; right.photoDownloadsEnabled = false
            left.displayIndexOverride = 0; right.displayIndexOverride = 1
            var testParts = Calendar.current.dateComponents([.year, .month, .day], from: Date())
            testParts.hour = 12; testParts.minute = 0; testParts.second = 0
            let displayDate = Calendar.current.date(from: testParts)!
            let entries = ["First passage", "Second passage"].map { NativeQuote(first: $0, time: "noon", last: "", title: "Test", author: "Test", sfw: true) }
            for view in [left, right] { view.cache = ["en-GB": ["12:00": entries], "es-ES": ["12:00": entries]] }
            clock.preferences.set("en-GB", forKey: "quote-locales")
            left.refreshQuote(displayDate); right.refreshQuote(displayDate)
            precondition(left.quote?.first != right.quote?.first, "Same-language displays chose the same available passage")
            clock.preferences.set("en-GB,es-ES", forKey: "quote-locales")
            left.lastMinute = ""; right.lastMinute = ""
            left.refreshQuote(displayDate); right.refreshQuote(displayDate)
            precondition(left.quoteLocale == "en-GB" && right.quoteLocale == "es-ES", "Selected languages were not distributed across displays")
            precondition(left.randomValue(["red", "green", "blue"], at: displayDate) != right.randomValue(["red", "green", "blue"], at: displayDate), "Random variants coincide across displays")
            right.displayIndexOverride = 0
            right.refreshQuote(displayDate)
            precondition(right.quoteLocale == left.quoteLocale, "Moving an instance to another display did not refresh its selection")
            let primaryURL = NativePhotoBackground.photoURL(minute: 100, size: clock.bounds.size, displayID: "primary")
            let secondaryURL = NativePhotoBackground.photoURL(minute: 100, size: clock.bounds.size, displayID: "secondary")
            precondition(primaryURL != secondaryURL, "Picsum seed did not vary by display")
            for all in [false, true] {
                let first = NativePhotoBackground.photoPosition(minute: 100, categoryCount: 14, allCategories: all, displayIndex: 0)
                let second = NativePhotoBackground.photoPosition(minute: 100, categoryCount: 14, allCategories: all, displayIndex: 1)
                precondition(first % 50 != second % 50, "Catalogue images coincide across displays")
            }
            precondition(NativePhotoBackground.cacheURL(displayID: "primary") != NativePhotoBackground.cacheURL(displayID: "secondary"), "Offline photo cache was shared across displays")
            let screenFrame = NSRect(x: 0, y: 0, width: 1512, height: 982)
            precondition(NativeClockView.timeInset(viewFrame: screenFrame, screenFrame: screenFrame, safeTop: 32) == 40)
            precondition(NativeClockView.timeInset(viewFrame: NSRect(x: 0, y: 0, width: 1512, height: 950), screenFrame: screenFrame, safeTop: 32) == 8)
            precondition(NativeClockView.timeInset(viewFrame: screenFrame, screenFrame: screenFrame, safeTop: 0) == 8)
            print("PASS: 12 catalogues, 84 theme/locale font combinations, light/dark rendering, missing quote notice, reopening options custom colour save, preset restoration, hiding book titles, photo download throttling, caching and offline failure, automatic NASA and Commons catalogues/credits/cache, joined selectors, distinct display quotes/languages/random variants/seeds/catalogue selections/caches, notch safe area")
            clock.stopAnimation(); NSApp.terminate(nil)
        }
    }
    @objc func settings() { if let sheet = clock.configureSheet { window.beginSheet(sheet) } }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationWillTerminate(_ notification: Notification) { clock.stopAnimation() }
}

@main enum PreviewMain {
    static func main() {
        let app = NSApplication.shared, delegate = PreviewDelegate()
        app.delegate = delegate; app.setActivationPolicy(.regular)
        withExtendedLifetime(delegate) { app.run() }
    }
}
