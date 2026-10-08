import AppKit
import CoreImage

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
        window.title = "Literature Clock — Window Preview"
        let menu = NSMenu(), item = NSMenuItem(), submenu = NSMenu()
        submenu.addItem(withTitle: "Settings…", action: #selector(settings), keyEquivalent: ",").target = self
        submenu.addItem(withTitle: "Compare Fusion / Superposition", action: #selector(compareFusion), keyEquivalent: "f").target = self
        submenu.addItem(withTitle: "Compare Quote Reflections", action: #selector(compareReflections), keyEquivalent: "r").target = self
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
        if CommandLine.arguments.contains("--glass-preview") || CommandLine.arguments.contains("--photo-glass-preview") || CommandLine.arguments.contains("--fusion-preview") || (CommandLine.arguments.contains("--reflection-preview") || CommandLine.arguments.contains("--foreground-glass-preview")) {
            // A disposable visual workspace; keep installed saver preferences intact.
            let defaults = UserDefaults(suiteName: "net.literatureclock.window-preview." + UUID().uuidString)!
            defaults.register(defaults: ["theme": (CommandLine.arguments.contains("--photo-glass-preview") || CommandLine.arguments.contains("--fusion-preview") || (CommandLine.arguments.contains("--reflection-preview") || CommandLine.arguments.contains("--foreground-glass-preview"))) ? "photo-dark" : "book-light", "background-pattern": "none", "palette": "default", "custom-color": "#d24335", "photo-provider": "picsum", "photo-category": "all", "show-time": true, "time-glass": true, "quote-locales": "en-GB", "work": true, "screensaver": false, "progressbar": "glass-background"])
            clock.preferences = defaults
            clock.photoDownloadsEnabled = true
        }
        if CommandLine.arguments.contains("--fusion-preview") {
            clock.fusionPreviewEnabled = true
            clock.interactionPreviewSweep = true
            window.title = "Literature Clock — Fusion test (⌘F to compare)"
        }
        if CommandLine.arguments.contains("--reflection-preview") {
            clock.quoteReflectionPreviewEnabled = true
            clock.interactionPreviewSweep = true
            window.title = "Literature Clock — Quote reflections (⌘R to compare)"
        }
        if CommandLine.arguments.contains("--foreground-glass-preview") {
            clock.preferences.set("glass-foreground", forKey: "progressbar")
            clock.quoteReflectionPreviewEnabled = false
            clock.interactionPreviewSweep = true
            window.title = "Literature Clock — Glass over full scene"
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
            precondition(NativeAppearance.hex(NativePhotoBackground.overlayColor(dark: false)) == "#dddddd" && NativePhotoBackground.overlayColor(dark: false).alphaComponent == 0.4, "Photo light must match the web overlay")
            precondition(NativeAppearance.hex(NativePhotoBackground.overlayColor(dark: true)) == "#111111" && NativePhotoBackground.overlayColor(dark: true).alphaComponent == 0.5, "Photo dark must match the web overlay")
            let red = NativeAppearance.color("#d24335")!
            precondition(NativeAppearance.hex(NativeAppearance.background(theme: "base", dark: false, accent: red)) == "#f8e3e1", "Base light must match the web's 15% sRGB tint")
            precondition(NativeAppearance.hex(NativeAppearance.background(theme: "base", dark: true, accent: red)) == "#2f181b", "Base dark must match the web's 16% sRGB tint")
            let blue = NativeAppearance.color("#2c97df")!
            precondition(NativeAppearance.hex(NativeAppearance.background(theme: "base", dark: false, accent: blue)) == "#dfeffa", "Base tint must follow the chosen accent")
            let checker = CIFilter(name: "CICheckerboardGenerator", parameters: ["inputColor0": CIColor.black, "inputColor1": CIColor.white, "inputWidth": 8.0, "inputSharpness": 1.0])!.outputImage!
            let area = CGRect(x: 0, y: 0, width: 120, height: 80)
            guard let kernel = OpticalGlassView.kernel,
                  let lens = kernel.apply(extent: area, roiCallback: { _, rect in rect.insetBy(dx: -16, dy: -16) }, arguments: [checker, CIVector(x: 0, y: 0, z: 120, w: 80), 32.0]) else { fatalError("Optical lens shader failed to load") }
            let context = CIContext()
            var pixels = [UInt8](repeating: 0, count: 120 * 80 * 4)
            context.render(lens, toBitmap: &pixels, rowBytes: 120 * 4, bounds: area, format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
            let fringes = stride(from: 0, to: pixels.count, by: 4).filter { pixels[$0 + 3] > 250 && abs(Int(pixels[$0]) - Int(pixels[$0 + 2])) > 20 }
            precondition(!fringes.isEmpty, "Lens must disperse a neutral background into real colour fringes")
            let interior = CGRect(x: 55, y: 35, width: 10, height: 10)
            var original = [UInt8](repeating: 0, count: 400), refracted = original
            context.render(checker, toBitmap: &original, rowBytes: 40, bounds: interior, format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
            context.render(lens, toBitmap: &refracted, rowBytes: 40, bounds: interior, format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
            precondition(zip(original, refracted).allSatisfy { abs(Int($0) - Int($1)) < 5 }, "Lens interior must preserve a sharp, untinted background")
            let pane = OpticalGlassView(frame: CGRect(x: 0, y: 0, width: 60, height: 80))
            pane.source = checker
            pane.tint = NSColor.red.withAlphaComponent(0.1)
            let stacked = pane.compositedBackground()!
            let sampleArea = CGRect(x: 16, y: 32, width: 1, height: 1)
            var rawSample = [UInt8](repeating: 0, count: 4), stackedSample = rawSample
            context.render(checker, toBitmap: &rawSample, rowBytes: 4, bounds: sampleArea, format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
            context.render(stacked, toBitmap: &stackedSample, rowBytes: 4, bounds: sampleArea, format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
            precondition(rawSample != stackedSample, "Clock backdrop must include the pane tint in covered areas")
            let uncovered = CGRect(x: 90, y: 32, width: 1, height: 1)
            context.render(checker, toBitmap: &rawSample, rowBytes: 4, bounds: uncovered, format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
            context.render(stacked, toBitmap: &stackedSample, rowBytes: 4, bounds: uncovered, format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
            precondition(rawSample == stackedSample, "Clock backdrop must keep uncovered areas unchanged")
            pane.frame.size.width = 0
            let reset = pane.compositedBackground()!
            context.render(reset, toBitmap: &stackedSample, rowBytes: 4, bounds: uncovered, format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
            precondition(rawSample == stackedSample, "Minute reset must remove the progress from the clock backdrop")
            let benchTexture = checker.cropped(to: CGRect(x: 0, y: 0, width: 1920, height: 1080))
            let band = CGRect(x: 950, y: 180, width: 24, height: 650)
            for _ in 0..<8 { _ = OpticalGlassView.reflectionImage(quote: benchTexture, edge: 962, region: band) }
            let benchStart = CFAbsoluteTimeGetCurrent()
            for _ in 0..<120 { precondition(OpticalGlassView.reflectionImage(quote: benchTexture, edge: 962, region: band) != nil) }
            print(String(format: "Quote reflection pass: %.3f ms/frame (24 x 650 points, 120 warm renders)", (CFAbsoluteTimeGetCurrent() - benchStart) * 1000 / 120))
            let opticalImage = context.createCGImage(lens, from: area)!
            let opticalBitmap = NSBitmapImageRep(cgImage: opticalImage)
            try! opticalBitmap.representation(using: .png, properties: [:])!.write(to: output.appendingPathComponent("optical-dispersion.png"))
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
            // Inspect wrapped highlighter fragments in both writing directions.
            clock.preferences.set("book-light", forKey: "theme")
            clock.preferences.set("none", forKey: "background-pattern")
            clock.preferences.set("default", forKey: "palette")
            clock.preferences.set(false, forKey: "screensaver")
            for locale in ["en-GB", "ar-AE"] {
                clock.quoteLocale = locale
                let rows = clock.catalogue(locale)
                clock.quote = locale == "en-GB" ? rows["16:00"]?.first { $0.title == "Through the Looking Glass" } : rows.values.flatMap { $0 }.first { $0.time.count > 25 && $0.first.count > 30 }
                precondition(clock.quote != nil, "Missing Book highlight diagnostic passage")
                let bitmap = clock.bitmapImageRepForCachingDisplay(in: clock.bounds)!
                clock.cacheDisplay(in: clock.bounds, to: bitmap)
                try! bitmap.representation(using: .png, properties: [:])!.write(to: output.appendingPathComponent("book-highlight-" + locale + ".png"))
            }
            clock.quoteLocale = "en-GB"
            clock.lastMinute = minute
            clock.quote = clock.catalogue("en-GB")["16:00"]!.first { $0.id == "1600-017" }!
            clock.preferences.set(true, forKey: "bilingual")
            for locale in ["es-ES", "ar-AE"] {
                let catalogue = clock.catalogue(locale)
                let translated = catalogue["16:00"]!.first { $0.id == clock.quote!.id }!
                var fixture = catalogue
                // Use the current minute so the drawing diagnostic retains the
                // fixed Carroll passage rather than advancing the live clock.
                fixture[minute] = [NativeQuote(first: "Unrelated", time: "", last: "", title: "", author: "", sfw: true), translated]
                clock.cache[locale] = fixture
                clock.preferences.set(locale, forKey: "translation-locale")
                precondition(clock.bilingualContent().quote?.id == "1600-017", "Bilingual mode must match the exact quote ID")
                let bitmap = clock.bitmapImageRepForCachingDisplay(in: clock.bounds)!
                clock.cacheDisplay(in: clock.bounds, to: bitmap)
                try! bitmap.representation(using: .png, properties: [:])!.write(to: output.appendingPathComponent("bilingual-" + locale + ".png"))
                clock.cache[locale] = catalogue
            }
            clock.preferences.set("en-GB", forKey: "translation-locale")
            precondition(clock.bilingualContent().notice == clock.text("bilingual_same"), "Same language must show a notice")
            clock.preferences.set("", forKey: "translation-locale")
            precondition(clock.bilingualContent().notice == clock.text("bilingual_select_prompt"), "Unset translation language must show a prompt")
            clock.preferences.set("es-ES", forKey: "translation-locale")
            let originalSpanish = clock.catalogue("es-ES")
            var filtered = originalSpanish
            filtered[minute] = [NativeQuote(id: "1600-017", first: "Filtered diagnostic", time: "", last: "", title: "", author: "", sfw: false)]
            clock.cache["es-ES"] = filtered
            precondition(clock.bilingualContent().quote == nil && clock.bilingualContent().notice != nil, "SFW filtering must apply to translations")
            clock.cache["es-ES"] = originalSpanish
            clock.preferences.set(false, forKey: "bilingual")
            precondition(clock.bilingualContent().notice == nil, "Disabled bilingual mode must remove its content")
            clock.preferences.set(true, forKey: "show-time")
            clock.preferences.set(true, forKey: "time-glass")
            let glassShown = clock.updateGlassTime(font: .boldSystemFont(ofSize: 20), dark: false)
            if #available(macOS 26.0, *) {
                precondition(glassShown, "Supported systems must use real glass for the time")
                let glass = clock.subviews.compactMap { $0 as? OpticalGlassView }.first { $0.cornerRadius > 0 }!
                precondition(OpticalGlassView.kernel != nil, "Optical lens shader must compile")
                precondition(abs(glass.frame.midX - clock.bounds.midX) < 0.01, "Glass time must remain centred")
                precondition(glass.frame.maxY <= clock.bounds.maxY - 8, "Glass time must retain its safe top margin")
                let savedMinute = clock.lastMinute
                for minute in ["11:11", "08:08", "23:59"] {
                    clock.lastMinute = minute
                    clock.updateGlassTime(font: .boldSystemFont(ofSize: 20), dark: false)
                    let label = clock.subviews.compactMap { $0 as? NSTextField }.first { $0.stringValue == minute }!
                    let required = label.attributedStringValue.size()
                    precondition(label.frame.width >= required.width && label.frame.height >= required.height, "Every clock digit must fit without clipping")
                    precondition(label.alphaValue == 1 && glass.alphaValue == 1, "Glass intensity must not fade the clock digits")
                }
                clock.lastMinute = savedMinute
            } else { precondition(!glassShown, "Older systems must retain the plain clock") }
            let progressGlassShown = clock.updateGlassProgress(mode: "glass-background", progress: 0.5, dark: false, tint: red.withAlphaComponent(0.1))
            if #available(macOS 26.0, *) {
                precondition(progressGlassShown, "Background progress must use native glass")
                let surface = clock.subviews.compactMap { $0 as? OpticalGlassView }.first { $0.cornerRadius == 0 }!
                precondition(surface.frame.width == clock.bounds.width / 2 && surface.frame.height == clock.bounds.height, "Glass must cover the elapsed part of the background")
                precondition(surface.tint?.alphaComponent == 0.1, "Glass progress must retain its full-pane tint")
                let passage = clock.subviews.first { $0 is NSImageView }!
                precondition(clock.subviews.firstIndex(of: surface)! < clock.subviews.firstIndex(of: passage)!, "Background glass must stay below the sharp passage")
                clock.updateGlassProgress(mode: "glass-background", progress: 0, dark: true)
                precondition(surface.isHidden, "New minutes must reset the glass surface")
                clock.updateGlassProgress(mode: "glass-background", progress: 1, dark: true)
                precondition(surface.frame == clock.bounds && !surface.isHidden, "Completed minutes must fill the background")
                for mode in ["none", "top", "bottom", "background"] {
                    precondition(!clock.updateGlassProgress(mode: mode, progress: 0.5, dark: false) && surface.isHidden, "Other progress modes must hide glass")
                }
            } else { precondition(!progressGlassShown, "Older systems must retain the flat progress") }
            clock.preferences.set(false, forKey: "show-time")
            precondition(!clock.updateGlassTime(font: .boldSystemFont(ofSize: 20), dark: false), "Glass must disappear when time is hidden")
            clock.preferences.set(true, forKey: "show-time")
            clock.preferences.set(false, forKey: "time-glass")
            let first = clock.configureSheet!
            let progressMenu = clock.controls["progressbar"] as! NSPopUpButton
            let modes = progressMenu.itemArray.compactMap { $0.representedObject as? String }
            precondition(modes.contains("background") && modes.contains("glass-background") && modes.contains("glass-foreground"), "Flat and glass backgrounds must be independent options")
            first.orderOut(nil)
            let second = clock.configureSheet!
            precondition(first !== second, "Closed options sheet was reused")
            precondition(!(clock.controls["translation-locale"] as! NSPopUpButton).isEnabled, "Translation menu should be disabled without bilingual mode")
            (clock.controls["bilingual"] as! NSButton).state = .on
            clock.perform(NSSelectorFromString("bilingualControlsChanged"))
            precondition((clock.controls["translation-locale"] as! NSPopUpButton).isEnabled, "Translation menu should be enabled in bilingual mode")
            (clock.controls["time-glass"] as! NSButton).state = .on
            let well = clock.controls["custom-color"] as! NSColorWell
            well.color = NativeAppearance.color("#123456")!
            clock.perform(NSSelectorFromString("customColorChanged"))
            precondition(clock.menuValue("palette") == "custom", "Colour picker did not select custom colour")
            precondition(clock.menuValue("color-mode") == "fixed", "Custom colour must select Fixed mode")
            precondition(clock.colorEditor!.isHidden, "Editor must be collapsed initially")
            (clock.controls["color-edit"] as! NSButton).performClick(nil)
            precondition(!clock.colorEditor!.isHidden, "Edit colour must reveal the editor")
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
            precondition(clock.preferences.bool(forKey: "bilingual") && other.preferences.bool(forKey: "bilingual"), "Bilingual setting must save and reach other displays")
            precondition(clock.preferences.bool(forKey: "time-glass") && other.preferences.bool(forKey: "time-glass"), "Glass time setting must reach other displays")
            clock.preferences.set(false, forKey: "time-glass")
            precondition(other.preferences.string(forKey: "translation-locale") == "es-ES", "Translation language must reach other displays")
            clock.preferences.set(false, forKey: "bilingual")
            for palette in ["default", "pink", "green", "random"] {
                _ = clock.configureSheet
                if palette == "default" || palette == "random" {
                    let mode = clock.controls["color-mode"] as! NSPopUpButton
                    mode.select(mode.itemArray.first { $0.representedObject as? String == palette }!)
                    clock.perform(NSSelectorFromString("colorModeChanged"))
                    precondition(clock.colorSwatchesRow!.isHidden, "Fixed colours should be hidden outside Fixed mode")
                } else {
                    let mode = clock.controls["color-mode"] as! NSPopUpButton
                    mode.select(mode.itemArray.first { $0.representedObject as? String == "fixed" }!)
                    clock.perform(NSSelectorFromString("colorModeChanged"))
                    let button = clock.swatches.first { $0.value == palette }!
                    clock.perform(NSSelectorFromString("selectSwatch:"), with: button)
                    precondition(!clock.colorSwatchesRow!.isHidden, "Fixed colours should be visible")
                }
                precondition(clock.colorEditor!.isHidden, "Custom editor should remain hidden")
                precondition(clock.menuValue("palette") == palette, "Swatch did not select \(palette)")
                clock.perform(NSSelectorFromString("saveOptions"))
                precondition(clock.preferences.string(forKey: "palette") == palette, "Custom colour overrode \(palette) on Save")
                precondition(clock.preferences.string(forKey: "custom-color") == "#123456", "Switching modes must preserve the custom colour")
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
            precondition(NativeClockView.timeInset(viewFrame: screenFrame, screenFrame: screenFrame, safeTop: 32) == 50)
            precondition(NativeClockView.timeInset(viewFrame: NSRect(x: 0, y: 0, width: 1512, height: 950), screenFrame: screenFrame, safeTop: 32) == 18)
            precondition(NativeClockView.timeInset(viewFrame: screenFrame, screenFrame: screenFrame, safeTop: 0) == 18)
            print("PASS: 12 catalogues, 84 theme/locale font combinations, light/dark rendering, missing quote notice, reopening options custom colour save, preset restoration, hiding book titles, photo download throttling, caching and offline failure, automatic NASA and Commons catalogues/credits/cache, joined selectors, distinct display quotes/languages/random variants/seeds/catalogue selections/caches, notch safe area")
            clock.stopAnimation(); NSApp.terminate(nil)
        }
    }
    @objc func compareReflections() {
        clock.quoteReflectionPreviewEnabled.toggle()
        window.title = clock.quoteReflectionPreviewEnabled ? "Literature Clock — Quote reflections ON (⌘R)" : "Literature Clock — Quote reflections OFF (⌘R)"
        clock.needsDisplay = true
    }
    @objc func compareFusion() {
        clock.fusionPreviewEnabled.toggle()
        window.title = clock.fusionPreviewEnabled ? "Literature Clock — Fusion test (⌘F to compare)" : "Literature Clock — Superposition test (⌘F to compare)"
        clock.needsDisplay = true
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
