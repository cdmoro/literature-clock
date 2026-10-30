import AppKit
import ScreenSaver
import CoreText
import CoreImage


/// Transparent optical lens: sample the actual background separately for RGB.
/// Only the bevel refracts; the interior stays sharp and untinted.
final class OpticalGlassView: NSView {
    var cornerRadius: CGFloat = 0
    var fullEdgeEnabled = true
    var tint: NSColor? { didSet { needsDisplay = true } }
    var source: CIImage? { didSet { needsDisplay = true } }
    private static let context = CIContext(options: [.cacheIntermediates: false])
    static let kernel: CIKernel? = {
        let url = Bundle(for: NativeClockView.self).url(forResource: "OpticalGlass", withExtension: "metallib")
        guard let url, let data = try? Data(contentsOf: url) else { return nil }
        return try? CIKernel(functionName: "lens", fromMetalLibraryData: data)
    }()
    static func tinted(_ source: CIImage, rect: CGRect, color: NSColor?) -> CIImage {
        guard let color, let ciColor = CIColor(color: color), rect.width > 0, rect.height > 0 else { return source }
        return CIImage(color: ciColor).cropped(to: rect).composited(over: source).cropped(to: source.extent)
    }
    func compositedBackground() -> CIImage? {
        guard let source else { return nil }
        return refractedBands().reduce(Self.tinted(source, rect: frame, color: tint)) { $1.composited(over: $0) }
    }
    private func refractedBands() -> [CIImage] {
        guard let source, let kernel = Self.kernel, frame.width > 0 else { return [] }
        // A full-height pane only changes a narrow band at its moving edge.
        let region = NSRect(x: max(frame.minX, frame.maxX - max(36, cornerRadius + 18)), y: frame.minY,
                                               width: min(max(36, cornerRadius + 18), frame.width), height: frame.height)
        let rect = CIVector(x: frame.minX, y: frame.minY, z: frame.width, w: frame.height)
        var regions = [region]
        if fullEdgeEnabled, region.minX > frame.minX {
            let height = min(18, frame.height / 2)
            regions.append(CGRect(x: frame.minX, y: frame.minY, width: region.minX - frame.minX, height: height))
            regions.append(CGRect(x: frame.minX, y: frame.maxY - height, width: region.minX - frame.minX, height: height))
        }
        return regions.compactMap { region in
            kernel.apply(extent: region, roiCallback: { _, area in area.insetBy(dx: -20, dy: -20) }, arguments: [Self.tinted(source, rect: frame, color: tint).clampedToExtent(), rect, cornerRadius, fullEdgeEnabled ? 1.0 : 0.0])
        }
    }
    override func draw(_ dirtyRect: NSRect) {
        // Paint the tint once, keeping the undistorted interior on the original backdrop.
        NSGraphicsContext.saveGraphicsState()
        defer { NSGraphicsContext.restoreGraphicsState() }
        if cornerRadius > 0 {
            let clip = NSBezierPath(roundedRect: bounds, xRadius: cornerRadius, yRadius: cornerRadius)
            clip.appendRect(NSRect(x: 0, y: 0, width: max(0, bounds.width - cornerRadius), height: bounds.height))
            clip.addClip()
        }
        if let tint { tint.setFill(); bounds.fill() }
        for output in refractedBands() {
            guard let cg = Self.context.createCGImage(output, from: output.extent) else { continue }
            let region = output.extent
            NSImage(cgImage: cg, size: region.size).draw(in: NSRect(x: region.minX - frame.minX, y: region.minY - frame.minY, width: region.width, height: region.height))
        }
    }
}

// Match Book's web highlighter: opaque colour, horizontal padding and
// rounded corners on each wrapped fragment, without changing text spacing.
final class BookHighlightLayoutManager: NSLayoutManager {
    override func fillBackgroundRectArray(_ rectArray: UnsafePointer<NSRect>, count rectCount: Int, forCharacterRange charRange: NSRange, color: NSColor) {
        let font = textStorage?.attribute(.font, at: charRange.location, effectiveRange: nil) as? NSFont
        let padding = (font?.pointSize ?? 0) * 0.2
        for index in 0..<rectCount {
            let rect = rectArray[index].insetBy(dx: -padding, dy: 0)
            NSBezierPath(roundedRect: rect, xRadius: 3, yRadius: 3).fill()
        }
    }
}

struct NativeQuote: Codable {
    var id: String? = nil
    let first: String
    let time: String
    let last: String
    let title: String
    let author: String
    let sfw: Bool
}

@objc(NativeClockView)
final class NativeClockView: ScreenSaverView, NSTextFieldDelegate {
    static let instances = NSHashTable<NativeClockView>.weakObjects()
    static let settingsChanged = Notification.Name("net.literatureclock.native-saver.settingsChanged")
    var preferences: UserDefaults = ScreenSaverDefaults(forModuleWithName: "net.literatureclock.native-saver")!
    var resourceURLOverride: URL? // Isolated render diagnostics only.
    var resources: URL { resourceURLOverride ?? Bundle(for: NativeClockView.self).resourceURL! }
    static let optionKeys = ["font", "theme", "screensaver", "show-time", "fuzzy-clock", "hide-book-title", "quote-attribution", "work", "progressbar", "quote-locales", "palette", "custom-color", "background", "background-pattern", "pattern-size", "background-effect", "locale", "photo-provider", "photo-category", "bilingual", "translation-locale"]
    var photoDownloadsEnabled = true
    var interactionPreviewSweep = false
    var fullProgressPreviewSweep = false
    var fullEdgeEnabled = true
    static func displayIndex(viewRect: CGRect, screens: [CGRect], fallback: Int) -> Int {
        let areas = screens.map { screen -> CGFloat in
            let intersection = viewRect.intersection(screen)
            return intersection.isNull ? 0 : intersection.width * intersection.height
        }
        guard let largest = areas.max(), largest > 0 else { return fallback }
        if areas.indices.contains(fallback), areas[fallback] == largest { return fallback }
        return areas.firstIndex(of: largest) ?? fallback
    }
    private var photoScreen: NSScreen? {
        let screens = NSScreen.screens
        guard let window else { return screens.first }
        let rect = window.convertToScreen(convert(bounds, to: nil))
        let fallback = screens.firstIndex { $0 == window.screen } ?? 0
        let index = Self.displayIndex(viewRect: rect, screens: screens.map { $0.frame }, fallback: fallback)
        return screens.indices.contains(index) ? screens[index] : window.screen
    }
    private var photoDisplayID: String { (photoScreen?.deviceDescription[NSDeviceDescriptionKey(rawValue: "NSScreenNumber")] as? NSNumber)?.stringValue ?? "0" }
    // Synthetic display ordinals are used only by the standalone diagnostic.
    var displayIndexOverride: Int?
    private var photoDisplayIndex: Int {
        if let index = displayIndexOverride { return index }
        let id = photoDisplayID
        return NSScreen.screens.firstIndex { ($0.deviceDescription[NSDeviceDescriptionKey(rawValue: "NSScreenNumber")] as? NSNumber)?.stringValue == id } ?? 0
    }
    private var lastDisplayIndex: Int?
    static func variantIndex(count: Int, minute: Int, displayIndex: Int) -> Int {
        let count = max(1, count)
        return ((minute + max(0, displayIndex)) % count + count) % count
    }
    func randomValue(_ values: [String], at now: Date) -> String {
        values[Self.variantIndex(count: values.count, minute: Int(now.timeIntervalSince1970 / 60), displayIndex: photoDisplayIndex)]
    }
    private var photoCacheDisplayID = ""
    private var photoBackgroundStorage: NativePhotoBackground?
    private var photoBackground: NativePhotoBackground {
        let id = photoDisplayID
        if photoBackgroundStorage == nil || photoCacheDisplayID != id {
            photoBackgroundStorage?.cancel()
            photoBackgroundStorage = NativePhotoBackground(cacheURL: NativePhotoBackground.cacheURL(displayID: id))
            photoCacheDisplayID = id
        }
        return photoBackgroundStorage!
    }
    var active = false
    var lastMinute = ""
    var sheet: NSWindow?
    var controls: [String: NSControl] = [:]
    private var selectedBackground = "default"
    var swatches: [NativeColorSwatch] = []
    private var fixedPalette = "red"
    var colorSwatchesRow: NSStackView?
    var colorEditor: NSStackView?
    var quote: NativeQuote?
    var quoteLocale = "en-GB"
    var started = Date()
    var previewQuoteDate: Date?
    var previewProgressDuration: TimeInterval?
    var previewProgressPausedElapsed: TimeInterval?
    var cache: [String: [String: [NativeQuote]]] = [:]
    var catalogueRetryAfter: [String: Date] = [:]
    private var layoutKey = ""
    private var fuzzyClock: Bool { preferences.bool(forKey: "fuzzy-clock") }
    private var layoutText: NSAttributedString?
    private var layoutHeight: CGFloat = 0
    private var passageImage: NSImage?
    private var passageOpticalSource: CIImage?
    private var fuzzyCreditOpticalSource: CIImage?
    private var fuzzyCreditOpticalKey = ""
    private var timeLabel: NSTextField?
    private var plainTimeImage: NSImage?
    private var plainTimeImageKey = ""
    private var fuzzyCreditLabel: NSTextField?
    private var fuzzyCreditKey = ""
    private var glassProgressView: NSView?
    private var passageView: NSImageView?
    private var opticalSource: CIImage?
    private var opticalSourceKey = ""
    private var previousPhotoOpticalSource: CIImage?
    private var finalPhotoOpticalSource: CIImage?
    private var patternKey = ""
    private var patternImage: NSImage?
    private var effectStarted = Date()
    var themeName: String { (preferences.string(forKey: "theme") ?? "base-dark").split(separator: "-").first.map(String.init) ?? "base" }
    var backgroundName: String { NativeAppearance.resolvedBackground(theme: themeName, selected: preferences.string(forKey: "background")) }
    private static let bundledFonts: [String: String] = {
        let root = Bundle(for: NativeClockView.self).resourceURL!.appendingPathComponent("Fonts")
        var names: [String: String] = [:]
        let files = FileManager.default.enumerator(at: root, includingPropertiesForKeys: nil)
        while let file = files?.nextObject() as? URL {
            guard file.pathExtension == "ttf" else { continue }
            CTFontManagerRegisterFontsForURL(file as CFURL, .process, nil)
            if let descriptors = CTFontManagerCreateFontDescriptorsFromURL(file as CFURL) as? [CTFontDescriptor],
               let descriptor = descriptors.first,
               let name = CTFontDescriptorCopyAttribute(descriptor, kCTFontNameAttribute) as? String {
                names[file.deletingLastPathComponent().lastPathComponent] = name
            }
        }
        return names
    }()
    func quoteFont(_ size: CGFloat, locale: String? = nil) -> NSFont {
        switch preferences.string(forKey: "font") ?? "default" {
        case "serif":
            let descriptor = NSFont.systemFont(ofSize: size).fontDescriptor.withDesign(.serif)
            return descriptor.flatMap { NSFont(descriptor: $0, size: size) } ?? NSFont(name: "Times New Roman", size: size) ?? .systemFont(ofSize: size)
        case "sans-serif": return .systemFont(ofSize: size)
        case "monospace": return .monospacedSystemFont(ofSize: size, weight: .regular)
        default: break
        }
        let family = NativeAppearance.fontFamily(theme: themeName, locale: locale ?? quoteLocale)
        return Self.bundledFonts[family].flatMap { NSFont(name: $0, size: size) } ?? NSFont.systemFont(ofSize: size)
    }
    var localeNames: [String] {
        (try? JSONDecoder().decode([String].self, from: Data(contentsOf: resources.appendingPathComponent("locales.json")))) ?? ["en-GB"]
    }
    var systemLocale: String { ClockLocale.resolve(Locale.preferredLanguages.first ?? "en-GB", supported: localeNames) }
    lazy var labels: [String: [String: String]] = {
        (try? JSONDecoder().decode([String: [String: String]].self, from: Data(contentsOf: resources.appendingPathComponent("settings.json")))) ?? [:]
    }()
    func text(_ key: String) -> String { labels[systemLocale]?[key] ?? labels["en-GB"]?[key] ?? key }
    func menuValue(_ key: String) -> String? { (controls[key] as? NSPopUpButton)?.selectedItem?.representedObject as? String }
    override init?(frame: NSRect, isPreview: Bool) { super.init(frame: frame, isPreview: isPreview); setup() }
    required init?(coder: NSCoder) { super.init(coder: coder); setup() }
    private func updateAnimationTimeInterval() {
        let effect = preferences.string(forKey: "background-effect") ?? "none"
        let needsLowerRate = ["snow", "dust", "dust-v2", "stars"].contains(effect)
            && NativeAppearance.supportsPattern(theme: themeName)
        animationTimeInterval = needsLowerRate ? 1.0 / 30.0 : 1.0 / 60.0
    }
    private func setup() {
        preferences.register(defaults: ["font": "default", "theme": "base-dark", "screensaver": true, "show-time": true, "fuzzy-clock": false,
                                       "hide-book-title": false, "quote-attribution": "below", "work": true, "progressbar": "background", "quote-locales": "", "palette": "default",
                                       "custom-color": "#d24335", "background": "default", "background-pattern": "none", "pattern-size": 1.0, "background-effect": "none", "photo-provider": "picsum", "photo-category": "all", "bilingual": false, "translation-locale": ""])
        _ = Self.bundledFonts
        updateAnimationTimeInterval()
        Self.instances.add(self)
        DistributedNotificationCenter.default().addObserver(self, selector: #selector(settingsDidChange), name: Self.settingsChanged, object: nil)
    }
    deinit { DistributedNotificationCenter.default().removeObserver(self) }
    override func startAnimation() {
        preferences.synchronize()
        active = true
        started = Date()
        lastMinute = ""
        super.startAnimation()
        needsDisplay = true
    }
    override func stopAnimation() { active = false; photoBackgroundStorage?.cancel(); super.stopAnimation() }
    override func animateOneFrame() { needsDisplay = true }
    private func drawAnimatedEffect(name: String, dark: Bool, accent: NSColor) {
        guard ["rain", "snow", "dust", "dust-v2", "stars"].contains(name),
              NativeAppearance.supportsPattern(theme: themeName) else { return }
        let width = bounds.width, height = bounds.height
        guard width > 0, height > 0 else { return }
        let elapsed = Date().timeIntervalSince(effectStarted)
        let density = name == "rain" ? 6800.0 : name == "snow" ? 3500.0 : name == "dust" ? 6000.0 : 4500.0
        let count = min(360, max(24, Int(width * height / density)))
        let particleColor = (name == "snow" || name == "stars") ? NativeAppearance.foreground(theme: themeName, dark: dark, accent: accent) : NSColor(calibratedRed: 1, green: 0.827, blue: 0.569, alpha: 1)
        for index in 0..<count {
            var seed = UInt64(index + 1) &* 0x9e3779b97f4a7c15
            func random(_ limit: Double) -> Double {
                seed = seed &+ 0x9e3779b97f4a7c15
                var value = seed
                value = (value ^ (value >> 30)) &* 0xbf58476d1ce4e5b9
                value = (value ^ (value >> 27)) &* 0x94d049bb133111eb
                value ^= value >> 31
                return Double(value >> 11) / 9007199254740992.0 * limit
            }
            let x0 = random(width), y0 = random(height), phase = random(Double.pi * 2)
            let flickerSpeed = 2.2 + random(2.4)
            let size = name == "snow" ? 1.1 + random(1.9) : name == "dust" ? 0.9 + random(2) : name == "dust-v2" ? 0.6 + pow(random(1), 2) * 7 : name == "stars" ? 0.55 + pow(random(1), 2.5) * 3.8 : 0.7 + random(0.8)
            let speed = name == "snow" ? 18 + random(38) : name == "dust" ? random(22) - 11 : name == "dust-v2" ? random(28) - 14 : name == "stars" ? 0.03 + random(0.12) : 260 + random(360)
            let drift = name == "snow" ? random(36) - 18 : name == "dust" ? random(70) - 35 : name == "dust-v2" ? random(40) - 20 : name == "stars" ? random(0.2) - 0.1 : speed * 0.12
            let opacity = name == "snow" ? 0.28 : name == "stars" ? 0.48 + random(0.48) : name == "dust" ? 0.18 + random(0.2) : name == "dust-v2" ? 0.12 + random(0.22) : 0.12 + random(0.24)
            let rawX = x0 + drift * elapsed + (name == "dust" ? sin(elapsed * 0.77 + phase) * 12 : name == "dust-v2" ? sin(elapsed * 0.59 + phase) * 20 : name == "stars" ? sin(elapsed * 0.59 + phase) * 0.25 : 0)
            let x = (rawX.truncatingRemainder(dividingBy: width) + width).truncatingRemainder(dividingBy: width)
            let rawY = y0 + speed * elapsed + (name == "dust-v2" ? sin(elapsed * 0.91 + phase) * 7 : name == "stars" ? sin(elapsed * 0.48 + phase) * 0.18 : 0)
            let y = (rawY.truncatingRemainder(dividingBy: height) + height).truncatingRemainder(dividingBy: height)
            if name == "rain" {
                particleColor.withAlphaComponent(opacity).setStroke()
                let streak = NSBezierPath(); streak.move(to: CGPoint(x: x, y: height - y)); streak.line(to: CGPoint(x: x - size * 2, y: height - y + size * 12)); streak.lineWidth = max(0.5, size * 0.65); streak.lineCapStyle = .round; streak.stroke()
            } else {
                let twinkle = name == "stars" ? 0.12 + 0.88 * (sin(elapsed * flickerSpeed + phase) + 1) / 2 : name == "snow" ? opacity + 0.08 : opacity
                particleColor.withAlphaComponent(twinkle).setFill()
                let dot = NSBezierPath(ovalIn: CGRect(x: x, y: height - y, width: size * 2, height: size * 2)); dot.fill()
                if name == "dust-v2" || name == "stars" { NSGraphicsContext.saveGraphicsState(); let shadow = NSShadow(); shadow.shadowBlurRadius = name == "stars" ? size * 2.4 : max(0, size - 1.5) * 1.8; shadow.shadowColor = particleColor.withAlphaComponent(0.55); shadow.set(); dot.fill(); NSGraphicsContext.restoreGraphicsState() }
                if name == "stars" && size > 2.1 {
                    particleColor.withAlphaComponent(twinkle * 0.65).setStroke()
                    let glint = NSBezierPath(); glint.move(to: CGPoint(x: x + size * 0.1, y: height - y + size)); glint.line(to: CGPoint(x: x + size * 1.9, y: height - y + size)); glint.move(to: CGPoint(x: x + size, y: height - y + size * 0.1)); glint.line(to: CGPoint(x: x + size, y: height - y + size * 1.9)); glint.lineWidth = max(0.35, size * 0.16); glint.stroke()
                }
            }
        }
    }
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { false }
    override func hitTest(_ point: NSPoint) -> NSView? { self }
    override var acceptsFirstResponder: Bool { false }
    func catalogue(_ locale: String) -> [String: [NativeQuote]] {
        if let saved = cache[locale] { return saved }
        if let retry = catalogueRetryAfter[locale], retry > Date() { return [:] }
        do {
            let data = try Data(contentsOf: resources.appendingPathComponent("Quotes/\(locale).json"))
            let result = try JSONDecoder().decode([String: [NativeQuote]].self, from: data)
            guard !result.isEmpty else { throw CocoaError(.fileReadCorruptFile) }
            cache[locale] = result
            catalogueRetryAfter.removeValue(forKey: locale)
            return result
        } catch {
            // A removed/replaced bundle must not poison this process's catalogue cache.
            catalogueRetryAfter[locale] = Date().addingTimeInterval(5)
            NSLog("Literature Clock: could not read catalogue %@ at %@: %@", locale, resources.path, error.localizedDescription)
            return [:]
        }
    }
    func refreshQuote(_ now: Date) {
        let now = previewQuoteDate ?? now
        let components = Calendar.current.dateComponents([.hour, .minute], from: now)
        let minute = String(format: "%02d:%02d", components.hour ?? 0, components.minute ?? 0)
        let displayIndex = photoDisplayIndex
        let retryDue = catalogueRetryAfter.values.contains { $0 <= Date() }
        guard minute != lastMinute || retryDue || (lastDisplayIndex != nil && lastDisplayIndex != displayIndex) else { return }
        if retryDue { catalogueRetryAfter = catalogueRetryAfter.filter { $0.value > Date() } }
        lastMinute = minute
        lastDisplayIndex = displayIndex
        let selected = (preferences.string(forKey: "quote-locales") ?? "").split(separator: ",").map(String.init).filter { localeNames.contains($0) }
        let candidates = selected.isEmpty ? [systemLocale] : selected
        let availableLanguages = candidates.filter { locale in
            (catalogue(locale)[minute] ?? []).contains { !preferences.bool(forKey: "work") || $0.sfw }
        }
        let languages = availableLanguages.isEmpty ? candidates : availableLanguages
        let ordinal = (components.hour ?? 0) * 60 + (components.minute ?? 0)
        quoteLocale = languages[Self.variantIndex(count: languages.count, minute: ordinal, displayIndex: displayIndex)]
        for locale in [quoteLocale, "en-GB"] {
            let available = (catalogue(locale)[minute] ?? []).filter { !preferences.bool(forKey: "work") || $0.sfw }
            if !available.isEmpty {
                quote = available[Self.variantIndex(count: available.count, minute: Int(now.timeIntervalSince1970 / 60), displayIndex: displayIndex)]
                quoteLocale = locale; return
            }
        }
        if !catalogueRetryAfter.isEmpty {
            let notice = text("native_resources_unavailable")
            quote = NativeQuote(first: notice == "native_resources_unavailable" ? "Quote resources could not be loaded. Reinstall Literature Clock from its .saver file." : notice, time: "", last: "", title: "", author: "", sfw: true)
            return
        }
        // Explain missing/filtered minutes in the requested language; never
        // invent a literary quote or silently display a bare time.
        let fallbacks = (try? JSONDecoder().decode([String: NativeQuote].self, from: Data(contentsOf: resources.appendingPathComponent("fallback.json")))) ?? [:]
        let notice = fallbacks[quoteLocale] ?? fallbacks["en-GB"]
        quote = NativeQuote(first: notice?.first ?? "", time: minute, last: notice?.last ?? "", title: "", author: "", sfw: true)
    }
    func bilingualContent() -> (quote: NativeQuote?, locale: String, notice: String?) {
        guard preferences.bool(forKey: "bilingual") else { return (nil, "", nil) }
        let locale = preferences.string(forKey: "translation-locale") ?? ""
        guard localeNames.contains(locale) else { return (nil, systemLocale, text("bilingual_select_prompt")) }
        guard locale != quoteLocale else { return (nil, systemLocale, text("bilingual_same")) }
        guard let id = quote?.id,
              let translated = catalogue(locale)[lastMinute]?.first(where: { $0.id == id && (!preferences.bool(forKey: "work") || $0.sfw) }) else {
            return (nil, systemLocale, text("bilingual_unavailable"))
        }
        return (translated, locale, nil)
    }
    static func timeInset(viewFrame: NSRect, screenFrame: NSRect, safeTop: CGFloat) -> CGFloat {
        18 + max(0, min(viewFrame.height, viewFrame.maxY - (screenFrame.maxY - safeTop)))
    }
    static func passageArea(bounds: NSRect, clockFrame: NSRect?) -> NSRect {
        guard let clockFrame else { return bounds }
        return NSRect(x: bounds.minX, y: bounds.minY, width: bounds.width,
                      height: max(0, min(bounds.maxY, clockFrame.minY - 16) - bounds.minY))
    }
    static func highlightedRange(for quote: NativeQuote, text: String, fuzzy: Bool) -> NSRange {
        if fuzzy { return NSRange(location: 0, length: (text as NSString).length) }
        return NSRange(location: (quote.first as NSString).length, length: (quote.time as NSString).length)
    }
    static func balancedLines(_ value: String, font: NSFont, width: CGFloat) -> String {
        let words = value.split(whereSeparator: \.isWhitespace).map(String.init)
        guard words.count > 2, width > 0 else { return value }
        func measured(_ start: Int, _ end: Int) -> CGFloat {
            words[start..<end].joined(separator: " ").size(withAttributes: [.font: font]).width
        }
        let total = measured(0, words.count)
        guard total > width else { return value }
        for lineCount in 2...words.count {
            let target = total / CGFloat(lineCount)
            var memo: [String: (CGFloat, [String])?] = [:]
            func best(_ start: Int, _ remaining: Int) -> (CGFloat, [String])? {
                if remaining == 1 {
                    let lineWidth = measured(start, words.count)
                    return lineWidth <= width ? (pow(lineWidth - target, 2), [words[start...].joined(separator: " ")]) : nil
                }
                let key = "\(start):\(remaining)"
                if let cached = memo[key] { return cached }
                var result: (CGFloat, [String])?
                let lastEnd = words.count - remaining + 1
                if start < lastEnd {
                    for end in (start + 1)...lastEnd {
                        let lineWidth = measured(start, end)
                        if lineWidth > width { break }
                        guard let tail = best(end, remaining - 1) else { continue }
                        let cost = pow(lineWidth - target, 2) + tail.0
                        if result == nil || cost < result!.0 { result = (cost, [words[start..<end].joined(separator: " ")] + tail.1) }
                    }
                }
                memo[key] = result
                return result
            }
            if let lines = best(0, lineCount)?.1 { return lines.joined(separator: "\n") }
        }
        return value
    }
    private var timeTopInset: CGFloat {
        guard !isPreview, let window, let screen = window.screen else { return 18 }
        let frame = window.convertToScreen(convert(bounds, to: nil))
        return Self.timeInset(viewFrame: frame, screenFrame: screen.frame, safeTop: screen.safeAreaInsets.top)
    }
    static func progressCornerRadius(progress: Double, size: NSSize) -> CGFloat {
        let p = min(1, max(0, progress))
        let t = min(1, max(0, (p - 0.92) / 0.08))
        let fade = 1 - t * t * (3 - 2 * t)
        return min(28, size.height / 2, size.width * p / 2) * fade
    }
    @discardableResult
    func updateGlassProgress(mode: String, progress: Double, dark: Bool, tint: NSColor? = nil) -> Bool {
        guard mode == "glass-background" || mode == "glass-foreground" else { glassProgressView?.isHidden = true; return false }
        if #available(macOS 26.0, *) {
            let glass: OpticalGlassView
            if let existing = glassProgressView as? OpticalGlassView { glass = existing }
            else {
                glass = OpticalGlassView()
                glass.cornerRadius = 0
                // Keep the time capsule above the moving glass surface.
                addSubview(glass, positioned: .below, relativeTo: nil)
                glassProgressView = glass
            }
            // Reuse one surface and move its leading edge continuously each frame.
            glass.fullEdgeEnabled = fullEdgeEnabled
            glass.tint = tint
            glass.frame = NSRect(x: bounds.minX, y: bounds.minY,
                                 width: bounds.width * min(1, max(0, progress)), height: bounds.height)
            glass.cornerRadius = Self.progressCornerRadius(progress: progress, size: bounds.size)
            glass.source = opticalSource
            glass.needsDisplay = true
            glass.appearance = NSAppearance(named: dark ? .darkAqua : .aqua)
            glass.isHidden = glass.frame.width <= 0
            return true
        }
        glassProgressView?.isHidden = true
        return false
    }
    override func draw(_ dirtyRect: NSRect) {
        let now = Date()
        refreshQuote(now)
        let mode = (preferences.string(forKey: "theme") ?? "base-dark").split(separator: "-").last ?? "dark"
        let dark = mode == "dark" || (mode == "system" && effectiveAppearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua)
        let theme = themeName
        let colors = NativeAppearance.presetColors
        let palette = preferences.string(forKey: "palette") ?? "default"
        let accent: NSColor
        if palette == "custom" { accent = NativeAppearance.color(preferences.string(forKey: "custom-color") ?? "") ?? .systemRed }
        else if palette == "default" { accent = NativeAppearance.defaultAccent(theme: theme, dark: dark) }
        else if palette == "random" {
            let ordered = ["red", "pink", "green", "orange", "purple", "blue", "gray", "pine"]
            accent = colors[randomValue(ordered, at: now)]!
        }
        else { accent = colors[palette] ?? .systemRed }
        let backgroundMode = backgroundName
        let usesPhoto = backgroundMode == "photo"
        let background = NativeAppearance.background(theme: theme, dark: dark, accent: accent, selected: backgroundMode)
        if usesPhoto && photoDownloadsEnabled {
            photoBackground.update(now: now, size: bounds.size, provider: preferences.string(forKey: "photo-provider") ?? "picsum", category: preferences.string(forKey: "photo-category") ?? "all", displayID: photoDisplayID, displayIndex: photoDisplayIndex) { [weak self] in self?.needsDisplay = true }
        }
        let photoOverlay = NativePhotoBackground.overlayColor(dark: dark)
        func drawBackdrop(in rect: NSRect, finalOnly: Bool = false) {
            background.setFill(); rect.fill()
            if usesPhoto { photoBackground.draw(in: rect, dark: dark, finalOnly: finalOnly, overlay: photoOverlay) }
            if backgroundMode == "default" || usesPhoto {
                NativeAppearance.drawThemeBackground(theme: theme, dark: dark, bounds: rect, resources: resources, overPhoto: usesPhoto)
            }
        }
        drawBackdrop(in: bounds)
        let foreground = NativeAppearance.foreground(theme: theme, dark: dark, accent: accent)
        let scale = window?.backingScaleFactor ?? 1
        var pattern = preferences.string(forKey: "background-pattern") ?? "none"
        if !NativeAppearance.supportsPattern(theme: theme) { pattern = "none" }
        if pattern == "random" { pattern = randomValue(Array(NativeAppearance.patterns.dropFirst(2)), at: now) }
        let hasPattern = pattern != "none"
        let outlineColor = NativeAppearance.background(theme: theme, dark: dark, accent: accent, selected: backgroundMode)
        let outlineWidth: CGFloat = 0
        let allowedSizes: [CGFloat] = [0.5, 1, 1.5, 2, 3]
        let savedSize = CGFloat(preferences.double(forKey: "pattern-size"))
        let patternScale = allowedSizes.contains(savedSize) ? savedSize : 1
        let newPatternKey = "\(pattern)|\(bounds.size)|\(scale)|\(accent)|\(patternScale)"
        if newPatternKey != patternKey {
            patternImage = NativeAppearance.patternImage(pattern: pattern, size: bounds.size, scale: scale, color: accent, resources: resources, tileScale: patternScale)
            patternKey = newPatternKey
        }
        patternImage?.draw(in: bounds)
        let photoKey = usesPhoto ? photoBackground.image.map { String(describing: ObjectIdentifier($0)) } ?? "none" : "none"
        let progressMode = preferences.string(forKey: "progressbar") ?? "none"
        let opticalKey = "\(theme)|\(backgroundMode)|\(accent)|\(dark)|\(bounds.size)|\(newPatternKey)|\(photoKey)"
        if opticalKey != opticalSourceKey && bounds.width > 0 && bounds.height > 0 {
            let backgroundImage = NSImage(size: bounds.size, flipped: false) { [self] rect in
                drawBackdrop(in: rect, finalOnly: true)
                patternImage?.draw(in: rect)
                return true
            }
            previousPhotoOpticalSource = usesPhoto && photoBackground.isTransitioning ? opticalSource : nil
            opticalSource = backgroundImage.tiffRepresentation.flatMap { CIImage(data: $0) }
            finalPhotoOpticalSource = opticalSource
            opticalSourceKey = opticalKey
        }
        drawAnimatedEffect(name: preferences.string(forKey: "background-effect") ?? "none", dark: dark, accent: accent)
        if usesPhoto, let final = finalPhotoOpticalSource {
            if photoBackground.isTransitioning, let previous = previousPhotoOpticalSource {
                opticalSource = previous.applyingFilter("CIDissolveTransition", parameters: ["inputTargetImage": final, "inputTime": photoBackground.transitionFraction])
            } else { opticalSource = final; previousPhotoOpticalSource = nil }
        }
        let timeFont = NSFont.systemFont(ofSize: max(10, min(20, bounds.width * 0.013)), weight: .bold)
        var progressSource = opticalSource
        if preferences.bool(forKey: "show-time") {
            if timeLabel == nil {
                let label = NSTextField(labelWithString: "")
                label.alignment = .center
                addSubview(label)
                timeLabel = label
            }
            let label = timeLabel!
            label.font = NSFont.monospacedDigitSystemFont(ofSize: timeFont.pointSize, weight: .bold)
            var clockAttributes: [NSAttributedString.Key: Any] = [.font: label.font!, .foregroundColor: foreground]
            if usesPhoto || hasPattern {
                clockAttributes[.strokeWidth] = outlineWidth
                clockAttributes[.strokeColor] = outlineColor
            }
            if usesPhoto {
                let shadow = NSShadow()
                shadow.shadowOffset = .zero
                shadow.shadowBlurRadius = 12
                shadow.shadowColor = NativeAppearance.color(dark ? "#1c1c1c" : "#dfdfdf")
                clockAttributes[.shadow] = shadow
            }
            label.attributedStringValue = NSAttributedString(string: lastMinute, attributes: clockAttributes)
            label.sizeToFit()
            if usesPhoto { label.setFrameSize(NSSize(width: label.frame.width + 24, height: label.frame.height + 24)) }
            label.frame.origin = NSPoint(x: bounds.midX - label.frame.width / 2,
                                         y: (isFlipped ? timeTopInset + 8 : bounds.maxY - timeTopInset - 8 - label.frame.height) - (usesPhoto ? 12 : 0))
            let key = "\(lastMinute)|\(label.font!.pointSize)|\(foreground)|\(outlineColor)|\(outlineWidth)|\(usesPhoto)|\(dark)|\(scale)"
            if key != plainTimeImageKey {
                label.isHidden = false
                let bitmap = label.bitmapImageRepForCachingDisplay(in: label.bounds)!
                label.cacheDisplay(in: label.bounds, to: bitmap)
                let image = NSImage(size: label.bounds.size)
                image.addRepresentation(bitmap)
                plainTimeImage = image
                plainTimeImageKey = key
            }
            label.isHidden = true
            plainTimeImage?.draw(in: label.frame)
            if let image = plainTimeImage, let data = image.tiffRepresentation, let clock = CIImage(data: data), let background = opticalSource {
                let positioned = clock.transformed(by: CGAffineTransform(scaleX: label.frame.width / clock.extent.width, y: label.frame.height / clock.extent.height))
                    .transformed(by: CGAffineTransform(translationX: label.frame.minX, y: label.frame.minY))
                progressSource = positioned.composited(over: background)
            }
        }
        let foregroundGlass = preferences.string(forKey: "progressbar") == "glass-foreground"
        if !foregroundGlass, let pane = glassProgressView { addSubview(pane, positioned: .below, relativeTo: nil) }
        let progress = previewProgressDuration.map { min(1, max(0, (previewProgressPausedElapsed ?? now.timeIntervalSince(started)) / $0)) } ?? (fullProgressPreviewSweep ? now.timeIntervalSince(started).truncatingRemainder(dividingBy: 12) / 12 : interactionPreviewSweep ? 0.5 + sin(now.timeIntervalSince(started) / 3) * 0.13 : now.timeIntervalSince1970.truncatingRemainder(dividingBy: 60) / 60)
        let progressColor = NativeAppearance.progressForeground(theme: theme, dark: dark, accent: accent)
        let glassProgress = updateGlassProgress(mode: progressMode, progress: progress, dark: dark, tint: progressColor.withAlphaComponent(foregroundGlass ? 0.025 : 0.1))
        (glassProgressView as? OpticalGlassView)?.source = progressSource
        if !glassProgress && progressMode != "none" {
            let backgroundProgress = progressMode == "background" || progressMode == "glass-background" || progressMode == "glass-foreground"
            let fill = backgroundProgress ? progressColor.withAlphaComponent(0.1) : accent.withAlphaComponent(0.7)
            let rect = NSRect(x: bounds.minX, y: progressMode == "top" ? bounds.maxY - 3 : bounds.minY,
                              width: bounds.width * progress, height: backgroundProgress ? bounds.height : 3)
            fill.setFill(); rect.fill()
        }
        guard bounds.width > 0, bounds.height > 0, let quote else { passageView?.isHidden = true; return }
        if fuzzyCreditLabel == nil {
            let label = NSTextField(wrappingLabelWithString: "")
            label.isBordered = false
            label.drawsBackground = false
            label.isEditable = false
            label.isSelectable = false
            addSubview(label)
            fuzzyCreditLabel = label
        }
        let attributionHidden = preferences.string(forKey: "quote-attribution") == "hidden"
        let hideTitle = preferences.bool(forKey: "hide-book-title")
        let creditParts = [hideTitle ? "" : quote.title, quote.author].filter { !$0.isEmpty }
        let creditText = !attributionHidden && (fuzzyClock || preferences.string(forKey: "quote-attribution") == "bottom-left") ? creditParts.joined(separator: "\n") : ""
        let creditKey = "\(creditText)|\(bounds.width)"
        if creditKey != fuzzyCreditKey {
            let label = fuzzyCreditLabel!
            let style = NSMutableParagraphStyle()
            style.alignment = .left
            style.lineSpacing = 2
            let shadow = NSShadow()
            shadow.shadowOffset = .zero
            shadow.shadowBlurRadius = 8
            shadow.shadowColor = NSColor.black.withAlphaComponent(0.65)
            label.attributedStringValue = NSAttributedString(string: creditText, attributes: [
                .font: NSFont.systemFont(ofSize: 11), .foregroundColor: NSColor.white,
                .paragraphStyle: style, .shadow: shadow,
            ])
            fuzzyCreditKey = creditKey
        }
        let creditLabel = fuzzyCreditLabel!
        let creditWidth = min(500, max(140, bounds.width * 0.38))
        creditLabel.frame = NSRect(x: 20, y: isFlipped ? bounds.height - 52 : 14, width: creditWidth, height: 38)
        creditLabel.isHidden = (fuzzyClock ? attributionHidden : preferences.string(forKey: "quote-attribution") != "bottom-left") || creditText.isEmpty
        addSubview(creditLabel, positioned: .above, relativeTo: nil)
        let creditTextureKey = "\(creditKey)|\(creditLabel.frame.size)"
        if !attributionHidden && (fuzzyClock || preferences.string(forKey: "quote-attribution") == "bottom-left") && !creditText.isEmpty {
            if creditTextureKey != fuzzyCreditOpticalKey {
                let wasHidden = creditLabel.isHidden
                creditLabel.isHidden = false
                if let bitmap = creditLabel.bitmapImageRepForCachingDisplay(in: creditLabel.bounds) {
                    creditLabel.cacheDisplay(in: creditLabel.bounds, to: bitmap)
                    fuzzyCreditOpticalSource = bitmap.cgImage.map { CIImage(cgImage: $0) }
                }
                creditLabel.isHidden = wasHidden
                fuzzyCreditOpticalKey = creditTextureKey
            }
        } else {
            fuzzyCreditOpticalSource = nil
            fuzzyCreditOpticalKey = ""
        }
        let width = bounds.width * 0.76
        // Reserve the clock and a gap, including the Photo shadow's cache padding.
        let area = Self.passageArea(bounds: bounds, clockFrame: preferences.bool(forKey: "show-time") ? timeLabel?.frame : nil)
        let passagePadding: CGFloat = usesPhoto ? 24 : 0
        let limit = min(bounds.height * 0.65, max(1, area.height - passagePadding * 2 - 4))
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = fuzzyClock ? .center : (quoteLocale.hasPrefix("ar") ? .right : .left)
        paragraph.lineBreakMode = .byWordWrapping
        paragraph.lineHeightMultiple = theme == "book" ? 1.35 : theme == "festive" ? 1.25 : theme == "terminal" ? 1.15 : 1
        paragraph.baseWritingDirection = quoteLocale.hasPrefix("ar") ? .rightToLeft : .natural
        let translation = bilingualContent()
        func passage(_ size: CGFloat) -> NSAttributedString {
            let result = NSMutableAttributedString()
            func append(_ item: NativeQuote, locale: String, size: CGFloat, gap: CGFloat) {
                let fuzzy = fuzzyClock
                let style = paragraph.mutableCopy() as! NSMutableParagraphStyle
                style.alignment = fuzzy ? .center : (locale.hasPrefix("ar") ? .right : .left)
                style.baseWritingDirection = locale.hasPrefix("ar") ? .rightToLeft : .natural
                style.paragraphSpacingBefore = gap
                let font = quoteFont(size, locale: locale)
                let rawText: String
                if fuzzy {
                    rawText = item.time.isEmpty ? lastMinute : item.time
                } else {
                    rawText = item.first + item.time + item.last
                }
                let textString = fuzzy ? Self.balancedLines(rawText, font: font, width: width) : rawText
                let text = NSMutableAttributedString(string: textString,
                    attributes: [.font: font, .foregroundColor: foreground, .paragraphStyle: style])
                // Highlight only the time in a quote; fuzzy mode displays just the time.
                let range = Self.highlightedRange(for: item, text: textString, fuzzy: fuzzy)
                if range.length > 0 {
                    text.addAttribute(theme == "book" ? .backgroundColor : .foregroundColor, value: accent, range: range)
                }
                result.append(text)
                if !fuzzyClock {
                    let attributionMode = preferences.string(forKey: "quote-attribution") ?? "below"
                    let attribution = attributionMode == "hidden" || attributionMode == "bottom-left" ? "" : preferences.bool(forKey: "hide-book-title") ? item.author : [item.title, item.author].filter { !$0.isEmpty }.joined(separator: ", ")
                    if !attribution.isEmpty {
                        result.append(NSAttributedString(string: "\n", attributes: [.font: font, .paragraphStyle: style]))
                        let citationStyle = style.mutableCopy() as! NSMutableParagraphStyle
                        citationStyle.paragraphSpacingBefore = theme == "book" ? (bounds.width <= 750 ? 16 : 24) : size * 0.35
                        result.append(NSAttributedString(string: (theme == "terminal" ? "> " : "— ") + attribution,
                            attributes: [.font: quoteFont(size * 0.55, locale: locale), .foregroundColor: foreground, .paragraphStyle: citationStyle]))
                    }
                }
            }
            append(quote, locale: quoteLocale, size: size, gap: 0)
            if let translated = translation.quote {
                if !fuzzyClock {
                    let separatorStyle = NSMutableParagraphStyle()
                    separatorStyle.paragraphSpacingBefore = 18
                    separatorStyle.paragraphSpacing = 12
                    let separator = NSImage(size: NSSize(width: width - 12, height: 1), flipped: false) { rect in
                        foreground.withAlphaComponent(0.25).setFill(); rect.fill(); return true
                    }
                    let attachment = NSTextAttachment()
                    attachment.image = separator
                    attachment.bounds = NSRect(x: 0, y: 0, width: width - 12, height: 1)
                    result.append(NSAttributedString(string: "\n"))
                    let line = NSMutableAttributedString(attachment: attachment)
                    line.addAttributes([.paragraphStyle: separatorStyle, .font: NSFont.systemFont(ofSize: 1)], range: NSRange(location: 0, length: line.length))
                    result.append(line)
                    result.append(NSAttributedString(string: "\n", attributes: [.paragraphStyle: separatorStyle, .font: NSFont.systemFont(ofSize: 1)]))
                    let headingStyle = NSMutableParagraphStyle()
                    headingStyle.alignment = systemLocale.hasPrefix("ar") ? .right : .left
                    headingStyle.baseWritingDirection = systemLocale.hasPrefix("ar") ? .rightToLeft : .natural
                    headingStyle.paragraphSpacing = 8
                    let name = Locale(identifier: systemLocale).localizedString(forIdentifier: translation.locale) ?? translation.locale
                    result.append(NSAttributedString(string: name + "\n", attributes: [.font: NSFont.systemFont(ofSize: max(10, size * 0.35), weight: .medium), .foregroundColor: foreground.withAlphaComponent(0.75), .paragraphStyle: headingStyle]))
                } else {
                    result.append(NSAttributedString(string: "\n\n"))
                }
                append(translated, locale: translation.locale, size: size * 0.8, gap: 0)
            } else if let notice = translation.notice {
                let style = paragraph.mutableCopy() as! NSMutableParagraphStyle
                style.alignment = translation.locale.hasPrefix("ar") ? .right : .left
                style.baseWritingDirection = translation.locale.hasPrefix("ar") ? .rightToLeft : .natural
                style.paragraphSpacingBefore = 24
                result.append(NSAttributedString(string: "\n"))
                result.append(NSAttributedString(string: notice, attributes: [.font: NSFont.systemFont(ofSize: size * 0.5), .foregroundColor: foreground.withAlphaComponent(0.75), .paragraphStyle: style]))
            }
            return result
        }
        let key = "\(preferences.string(forKey: "font") ?? "default")|\(quote.first)\(quote.time)\(quote.last)\(quote.title)\(quote.author)|\(theme)|\(backgroundMode)|\(pattern)|\(quoteLocale)|\(width)|\(limit)|\(scale)|\(dark)|\(accent)|\(lastMinute)|\(preferences.bool(forKey: "hide-book-title"))|\(fuzzyClock)"
        let bilingualKey = key + "|\(quote.id ?? "")|\(preferences.bool(forKey: "bilingual"))|\(preferences.string(forKey: "translation-locale") ?? "")|\(preferences.bool(forKey: "work"))"
        if bilingualKey != layoutKey {
            var low: CGFloat = 1, high = min(bounds.width * 0.043, bounds.height * 0.12)
            for _ in 0..<16 {
                let size = (low + high) / 2
                let measured = passage(size).boundingRect(with: NSSize(width: width, height: .greatestFiniteMagnitude), options: [.usesLineFragmentOrigin, .usesFontLeading])
                if measured.height <= limit && measured.width <= width { low = size } else { high = size }
            }
            layoutText = passage(low)
            if theme != "book" && (usesPhoto || hasPattern) && layoutText!.length > 0 {
                (layoutText as! NSMutableAttributedString).addAttributes([
                    .strokeWidth: outlineWidth, .strokeColor: outlineColor
                ], range: NSRange(location: 0, length: layoutText!.length))
            }
            layoutHeight = ceil(layoutText!.boundingRect(with: NSSize(width: width, height: .greatestFiniteMagnitude), options: [.usesLineFragmentOrigin, .usesFontLeading]).height)
            // Rasterize the entire passage once at the display's pixel density.
            // Translating this image keeps all glyphs together; drawing text at
            // a new fractional origin every frame independently snaps glyphs.
            let highlightPadding = theme == "book" ? low * 0.2 : 0
            // Leave room for the Photo halo on every side of the cache.
            let shadowPadding: CGFloat = usesPhoto ? 24 : 0
            let size = NSSize(width: ceil(width + highlightPadding * 2 + shadowPadding * 2), height: layoutHeight + 4 + shadowPadding * 2)
            let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(ceil(size.width * scale)), pixelsHigh: Int(ceil(size.height * scale)), bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
            bitmap.size = size
            NSGraphicsContext.saveGraphicsState()
            NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
            NSColor.clear.setFill(); NSRect(origin: .zero, size: size).fill(using: .copy)
            if theme == "book" {
                let storage = NSTextStorage(attributedString: layoutText!)
                let manager = BookHighlightLayoutManager()
                let container = NSTextContainer(containerSize: NSSize(width: width, height: .greatestFiniteMagnitude))
                container.lineFragmentPadding = 0
                storage.addLayoutManager(manager)
                manager.addTextContainer(container)
                let glyphs = manager.glyphRange(for: container)
                // TextKit draws in a flipped coordinate system; the cached
                // bitmap itself is drawn by ScreenSaverView as a normal image.
                let context = NSGraphicsContext.current!.cgContext
                context.translateBy(x: highlightPadding, y: size.height - 2)
                context.scaleBy(x: 1, y: -1)
                NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: true)
                manager.drawBackground(forGlyphRange: glyphs, at: .zero)
                manager.drawGlyphs(forGlyphRange: glyphs, at: .zero)
            } else {
                if usesPhoto {
                    let shadow = NSShadow()
                    shadow.shadowOffset = .zero
                    shadow.shadowBlurRadius = 12
                    shadow.shadowColor = NativeAppearance.color(dark ? "#1c1c1c" : "#dfdfdf")
                    shadow.set()
                }
                layoutText!.draw(with: NSRect(x: shadowPadding, y: 2 + shadowPadding, width: width, height: layoutHeight + 2), options: [.usesLineFragmentOrigin, .usesFontLeading])
            }
            NSGraphicsContext.restoreGraphicsState()
            let image = NSImage(size: size)
            image.addRepresentation(bitmap)
            passageImage = image
            passageOpticalSource = bitmap.cgImage.map { CIImage(cgImage: $0) }
            layoutKey = bilingualKey
        }
        guard let image = passageImage else { return }
        let elapsed = max(0, now.timeIntervalSince(started)) * (1 + Double(photoDisplayIndex) * 0.12)
        let moving = preferences.bool(forKey: "screensaver")
        let dx = moving ? sin(elapsed / 12) * bounds.width * 0.045 : 0
        let minY = area.minY
        let maxY = max(minY, area.maxY - image.size.height)
        let centreY = min(maxY, max(minY, bounds.midY - image.size.height / 2))
        // Reduce the travel smoothly instead of clipping the moving text at a limit.
        let travelY = min(bounds.height * 0.055, max(0, min(centreY - minY, maxY - centreY)))
        let dy = moving ? sin(elapsed / 17) * travelY : 0
        // Keep the cached passage above the glass so only the background refracts.
        if passageView == nil {
            let view = NSImageView()
            view.imageScaling = .scaleNone
            addSubview(view)
            passageView = view
        }
        passageView?.image = image
        passageView?.frame = NSRect(x: (bounds.width - image.size.width) / 2 + dx,
                                    y: centreY + dy,
                                    width: image.size.width, height: image.size.height)
        passageView?.isHidden = false
        if foregroundGlass, glassProgress, let pane = glassProgressView as? OpticalGlassView,
           let texture = passageOpticalSource, let frame = passageView?.frame, var scene = progressSource {
            // Feed the normal lens the same scene that is drawn beneath it.
            let positionedQuote = texture.transformed(by: CGAffineTransform(scaleX: frame.width / texture.extent.width, y: frame.height / texture.extent.height))
                .transformed(by: CGAffineTransform(translationX: frame.minX, y: frame.minY))
            scene = positionedQuote.composited(over: scene)
            if !attributionHidden, (fuzzyClock || preferences.string(forKey: "quote-attribution") == "bottom-left"), let creditTexture = fuzzyCreditOpticalSource, let label = fuzzyCreditLabel {
                let creditFrame = label.frame
                let positionedCredit = creditTexture.transformed(by: CGAffineTransform(scaleX: creditFrame.width / creditTexture.extent.width, y: creditFrame.height / creditTexture.extent.height))
                    .transformed(by: CGAffineTransform(translationX: creditFrame.minX, y: creditFrame.minY))
                scene = positionedCredit.composited(over: scene)
            }
            pane.source = scene
            addSubview(pane, positioned: .above, relativeTo: nil)

        }

    }
    override var hasConfigureSheet: Bool { true }
    override var configureSheet: NSWindow? {
        NSLog("Literature Clock: configureSheet requested")
        if let sheet, sheet.isVisible { return sheet }
        // macOS can dismiss a transported sheet without invoking our buttons.
        // Recreate closed sheets instead of returning their stale window.
        sheet = nil
        controls.removeAll()
        selectedBackground = preferences.string(forKey: "background") ?? "default"
        swatches.removeAll()
        preferences.synchronize()
        let window = NSPanel(contentRect: NSRect(x: 0, y: 0, width: 700, height: 470),
                              styleMask: [.titled], backing: .buffered, defer: false)
        window.isReleasedWhenClosed = false
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
                let check = NSButton(checkboxWithTitle: name, target: self, action: #selector(fontLanguageChanged))
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
        let bilingual = NSButton(checkboxWithTitle: text("bilingual_mode"), target: self, action: #selector(bilingualControlsChanged))
        bilingual.state = preferences.bool(forKey: "bilingual") ? .on : .off
        controls["bilingual"] = bilingual
        bilingual.widthAnchor.constraint(equalToConstant: 180).isActive = true
        let translationMenu = NSPopUpButton()
        for locale in [""] + localeNames {
            let name = locale.isEmpty ? text("bilingual_select_language") : Locale(identifier: systemLocale).localizedString(forIdentifier: locale) ?? locale
            let item = NSMenuItem(title: name, action: nil, keyEquivalent: "")
            item.representedObject = locale; translationMenu.menu?.addItem(item)
            if locale == (preferences.string(forKey: "translation-locale") ?? "") { translationMenu.select(item) }
        }
        translationMenu.widthAnchor.constraint(equalToConstant: 260).isActive = true
        translationMenu.setAccessibilityLabel(text("bilingual_language"))
        controls["translation-locale"] = translationMenu
        stack.addArrangedSubview(NSStackView(views: [bilingual, translationMenu]))
        bilingualControlsChanged()
        section("settings_appearance")
        let presetsTitle = NSTextField(labelWithString: text("settings_presets_title"))
        presetsTitle.font = .boldSystemFont(ofSize: NSFont.systemFontSize)
        presetsTitle.widthAnchor.constraint(equalToConstant: 180).isActive = true
        let presetMenu = NSPopUpButton()
        for (preset, label) in [("none", "settings_presets_choose"), ("christmas", "settings_preset_christmas"), ("halloween", "settings_preset_halloween"), ("valentine", "settings_preset_valentine")] {
            let item = NSMenuItem(title: text(label), action: nil, keyEquivalent: "")
            item.representedObject = preset
            presetMenu.menu?.addItem(item)
        }
        presetMenu.select(presetMenu.itemArray.first { $0.representedObject as? String == "none" })
        presetMenu.target = self
        presetMenu.action = #selector(applyAppearancePreset(_:))
        presetMenu.widthAnchor.constraint(equalToConstant: 260).isActive = true
        controls["appearance-preset"] = presetMenu
        stack.addArrangedSubview(NSStackView(views: [presetsTitle, presetMenu]))
        let theme = preferences.string(forKey: "theme") ?? "base-dark"
        let parts = theme.split(separator: "-").map(String.init)
        for (key, label, values) in [
            ("theme-base", "theme", NativeAppearance.themes),
            ("font", "font", ["default", "serif", "sans-serif", "monospace"]),
            ("theme-mode", "settings_scheme", ["system", "light", "dark"]),
            ("background", "settings_background", NativeAppearance.backgrounds),
            ("photo-provider", "settings_photo_provider", ["picsum", "nasa", "commons"]),
            ("photo-category", "settings_photo_category", NativePhotoBackground.categories(provider: preferences.string(forKey: "photo-provider") ?? "picsum")),
            ("palette", "settings_color", ["default", "red", "pink", "green", "orange", "purple", "blue", "gray", "pine", "random", "custom"]),
            ("background-pattern", "settings_background_pattern", NativeAppearance.patterns),
            ("pattern-size", "settings_pattern_size", ["0.5", "1", "1.5", "2", "3"]),
            ("background-effect", "settings_background_effect", ["none", "rain", "snow", "dust", "dust-v2", "stars"]),
            ("progressbar", "progressbar_mode", ["none", "top", "bottom", "background", "glass-background", "glass-foreground"])
        ] {
            if key == "transition" { section("settings_behavior") }
            let menu = NSPopUpButton()
            let value = key == "theme-base" ? parts.first : key == "theme-mode" ? parts.last : preferences.string(forKey: key)
            for raw in values {
                let labelKey = key == "font" && raw != "default" ? "settings_font_" + raw : key == "background" ? "settings_background_" + raw : key == "photo-category" ? "settings_photo_" + raw : key == "background-pattern" ? "settings_pattern_" + raw : key == "background-effect" ? "settings_effect_" + raw : key == "progressbar" ? "settings_progress_" + raw :
                    raw == "custom" ? "settings_color_customize" : raw == "default" ? "default_font" : raw == "random" ? "settings_color_random" : raw
                let label = key == "photo-provider" ? (raw == "commons" ? "Wikimedia Commons" : raw == "nasa" ? "NASA" : "Picsum") : text(labelKey)
                let item = NSMenuItem(title: label, action: nil, keyEquivalent: "")
                item.representedObject = raw
                if key == "progressbar" && (raw == "glass-background" || raw == "glass-foreground") {
                    if #available(macOS 26.0, *) {} else { item.isEnabled = false }
                }
                menu.menu?.addItem(item)
                if raw == value { menu.select(item) }
            }
            if key == "pattern-size" { menu.target = self; menu.action = #selector(patternSizeChanged) }
            if key == "background-effect" { menu.target = self; menu.action = #selector(effectChanged) }
            if key == "theme-base" || key == "background" || key == "photo-provider" { menu.target = self; menu.action = #selector(photoControlsChanged) }
            controls[key] = menu
            if key == "background-pattern" { menu.target = self; menu.action = #selector(patternChanged) }
            let title = NSTextField(labelWithString: text(label))
            title.widthAnchor.constraint(equalToConstant: 180).isActive = true
            menu.widthAnchor.constraint(equalToConstant: key.hasPrefix("photo-") || key == "background-pattern" ? 180 : key == "pattern-size" ? 100 : 260).isActive = true
            if key == "photo-category" { menu.setAccessibilityLabel(text("settings_photo_category")) }
            if key == "palette" {
                let row = NSStackView(); row.spacing = 8
                for raw in values where raw != "default" && raw != "random" {
                    let button = NativeColorSwatch(frame: .zero)
                    button.value = raw
                    button.swatchColor = NativeAppearance.presetColors[raw] ?? (raw == "custom" ? (NativeAppearance.color(preferences.string(forKey: "custom-color") ?? "") ?? .systemRed) : .labelColor)
                    button.toolTip = menu.itemArray.first { $0.representedObject as? String == raw }?.title
                    button.setAccessibilityLabel(button.toolTip ?? raw)
                    button.target = self; button.action = #selector(selectSwatch(_:))
                    button.widthAnchor.constraint(equalToConstant: 28).isActive = true
                    button.heightAnchor.constraint(equalToConstant: 28).isActive = true
                    swatches.append(button); row.addArrangedSubview(button)
                }
                let mode = NSPopUpButton()
                for raw in ["default", "fixed", "random"] {
                    let item = NSMenuItem(title: text("color_mode_" + raw), action: nil, keyEquivalent: "")
                    item.representedObject = raw; mode.menu?.addItem(item)
                }
                mode.target = self; mode.action = #selector(colorModeChanged)
                mode.widthAnchor.constraint(equalToConstant: 260).isActive = true
                controls["color-mode"] = mode
                stack.addArrangedSubview(NSStackView(views: [title, mode]))
                let edit = NSButton(title: text("color_edit"), target: self, action: #selector(toggleColorEditor))
                controls["color-edit"] = edit
                row.addArrangedSubview(edit)
                let fixedLabel = NSTextField(labelWithString: text("color_fixed"))
                fixedLabel.widthAnchor.constraint(equalToConstant: 180).isActive = true
                let fixedRow = NSStackView(views: [fixedLabel, row])
                colorSwatchesRow = fixedRow
                stack.addArrangedSubview(fixedRow)
            } else if key == "photo-category", let row = controls["photo-provider"]?.superview as? NSStackView {
                row.addArrangedSubview(menu)
            } else if key == "pattern-size", let row = controls["background-pattern"]?.superview as? NSStackView {
                menu.setAccessibilityLabel(text("settings_pattern_size"))
                row.addArrangedSubview(menu)
            } else { stack.addArrangedSubview(NSStackView(views: [title, menu])) }
            if key == "palette" {
                let well = NSColorWell()
                well.color = NativeAppearance.color(preferences.string(forKey: "custom-color") ?? "") ?? .systemRed
                // A separate NSColorPanel cannot be transported by Settings.
                // Keep the picker controls inside the configuration sheet.
                well.isEnabled = false
                controls["custom-color"] = well
                let title = NSTextField(labelWithString: text("settings_color_add"))
                title.widthAnchor.constraint(equalToConstant: 180).isActive = true
                well.widthAnchor.constraint(equalToConstant: 60).isActive = true
                let hex = NSTextField(string: NativeAppearance.hex(well.color))
                hex.widthAnchor.constraint(equalToConstant: 100).isActive = true
                hex.target = self; hex.action = #selector(customHexChanged); hex.delegate = self
                controls["color-hex"] = hex
                let editor = NSStackView()
                editor.orientation = .vertical; editor.alignment = .leading; editor.spacing = 8
                editor.addArrangedSubview(NSStackView(views: [title, well, hex]))
                colorEditor = editor
                editor.isHidden = true
                stack.addArrangedSubview(editor)
                let rgb = well.color.usingColorSpace(.sRGB)!
                let channels = NSStackView()
                channels.spacing = 8
                for (channel, value) in [("R", rgb.redComponent), ("G", rgb.greenComponent), ("B", rgb.blueComponent)] {
                    channels.addArrangedSubview(NSTextField(labelWithString: channel))
                    let slider = NSSlider(value: Double(value * 255), minValue: 0, maxValue: 255, target: self, action: #selector(customSlidersChanged))
                    slider.isContinuous = true
                    slider.widthAnchor.constraint(equalToConstant: 135).isActive = true
                    controls["color-" + channel] = slider
                    channels.addArrangedSubview(slider)
                }
                editor.addArrangedSubview(channels)
                updateSwatches()
            }
        }
        photoControlsChanged()
        patternChanged(controls["background-pattern"] as! NSPopUpButton)
        effectChanged(controls["background-effect"] as! NSPopUpButton)
        section("settings_behavior")
        for (key, label) in [("screensaver", "movement"), ("show-time", "time_mode"), ("fuzzy-clock", "settings_fuzzy_clock"), ("hide-book-title", "settings_hide_book_title"), ("work", "work_mode_title")] {
            let check = NSButton(checkboxWithTitle: text(label), target: nil, action: nil)
            check.state = preferences.bool(forKey: key) ? .on : .off
            controls[key] = check
            stack.addArrangedSubview(check)
        }
        let attributionLabel = NSTextField(labelWithString: text("settings_attribution_position"))
        attributionLabel.widthAnchor.constraint(equalToConstant: 180).isActive = true
        let attributionMenu = NSPopUpButton()
        for (value, labelKey) in [("below", "settings_attribution_below"), ("bottom-left", "settings_attribution_bottom_left"), ("hidden", "settings_attribution_hidden")] {
            let item = NSMenuItem(title: text(labelKey), action: nil, keyEquivalent: "")
            item.representedObject = value
            attributionMenu.menu?.addItem(item)
        }
        attributionMenu.select(attributionMenu.itemArray.first { $0.representedObject as? String == (preferences.string(forKey: "quote-attribution") ?? "below") })
        attributionMenu.widthAnchor.constraint(equalToConstant: 260).isActive = true
        attributionMenu.setAccessibilityLabel(text("settings_attribution_position"))
        controls["quote-attribution"] = attributionMenu
        stack.addArrangedSubview(NSStackView(views: [attributionLabel, attributionMenu]))
        let version = Bundle(for: Self.self).object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "development"
        stack.addArrangedSubview(NSTextField(labelWithString: "Literature Clock for macOS · v" + version))
        stack.addArrangedSubview(ProjectLink(title: text("native_github_project")))
        let cancel = NSButton(title: text("cancel"), target: self, action: #selector(cancelOptions))
        cancel.keyEquivalent = "\u{1b}"
        let save = NSButton(title: "OK", target: self, action: #selector(saveOptions))
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
    @objc private func patternSizeChanged(_ sender: NSPopUpButton) {
        guard let value = sender.selectedItem?.representedObject as? String, ["0.5", "1", "1.5", "2", "3"].contains(value), let number = Double(value) else { return }
        preferences.set(number, forKey: "pattern-size")
        patternKey = ""
        updateAppearancePresetSelection()
        needsDisplay = true
    }
    private func updateAppearancePresetSelection() {
        guard let presetMenu = controls["appearance-preset"] as? NSPopUpButton,
              let background = menuValue("background"), let palette = menuValue("palette"),
              let pattern = menuValue("background-pattern"), let size = menuValue("pattern-size"),
              let effect = menuValue("background-effect") else { return }
        let theme = menuValue("theme-base") ?? "base"
        let presets: [(String, String, String, String)] = [
            ("christmas", "pine", "christmas", "snow"),
            ("halloween", "purple", "halloween", "dust-v2"),
            ("valentine", "pink", "valentine", "stars")
        ]
        let match = theme == "base" && background == "default" && size == "2"
            ? presets.first { $0.1 == palette && $0.2 == pattern && $0.3 == effect }?.0
            : nil
        presetMenu.select(presetMenu.itemArray.first { ($0.representedObject as? String) == (match ?? "none") })
    }
    @objc private func applyAppearancePreset(_ sender: NSPopUpButton) {
        guard let preset = sender.selectedItem?.representedObject as? String, preset != "none" else { return }
        guard let palette = ["christmas": "pine", "halloween": "purple", "valentine": "pink"][preset],
              let pattern = ["christmas": "christmas", "halloween": "halloween", "valentine": "valentine"][preset],
              let effect = ["christmas": "snow", "halloween": "dust-v2", "valentine": "stars"][preset] else { return }
        func select(_ key: String, _ value: String) {
            guard let menu = controls[key] as? NSPopUpButton else { return }
            menu.select(menu.itemArray.first { $0.representedObject as? String == value })
        }
        select("theme-base", "base")
        select("background", "default")
        selectedBackground = "default"
        select("palette", palette)
        select("background-pattern", pattern)
        select("pattern-size", "2")
        select("background-effect", effect)
        photoControlsChanged()
        patternChanged(controls["background-pattern"] as! NSPopUpButton)
        updateSwatches()
        updateAppearancePresetSelection()
        for view in Self.instances.allObjects where view.window != nil { view.effectStarted = Date(); view.lastMinute = ""; view.needsDisplay = true }
    }
    @objc private func patternChanged(_ sender: NSPopUpButton) {
        let pattern = sender.selectedItem?.representedObject as? String ?? "none"
        let sizeControl = controls["pattern-size"] as? NSPopUpButton
        sizeControl?.isEnabled = !["none", "random"].contains(pattern) && NativeAppearance.supportsPattern(theme: themeName)
        sizeControl?.isHidden = !(sizeControl?.isEnabled ?? false)
        updateAppearancePresetSelection()
    }
    @objc private func effectChanged(_ sender: NSPopUpButton) {
        preferences.set(sender.selectedItem?.representedObject as? String ?? "none", forKey: "background-effect")
        updateAnimationTimeInterval()
        updateAppearancePresetSelection()
        needsDisplay = true
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
        sheet?.makeFirstResponder(nil)
        if let hex = controls["color-hex"] as? NSTextField,
           let color = NativeAppearance.color(hex.stringValue) {
            (controls["custom-color"] as? NSColorWell)?.color = color
        }
        let languages = localeNames.filter { (controls["quote-locale:" + $0] as? NSButton)?.state == .on }
        preferences.set(languages.joined(separator: ","), forKey: "quote-locales")
        preferences.set(languages.first ?? systemLocale, forKey: "locale")
        let base = menuValue("theme-base") ?? "base"
        let mode = menuValue("theme-mode") ?? "dark"
        preferences.set(base + "-" + mode, forKey: "theme")
        if controls["background"]?.isEnabled == true { selectedBackground = menuValue("background") ?? "default" }
        preferences.set(selectedBackground, forKey: "background")
        for (key, control) in controls {
            if key == "background" || key.hasPrefix("quote-locale:") || key.hasPrefix("theme-") || key.hasPrefix("color-") { continue }
            if control is NSPopUpButton { preferences.set(menuValue(key), forKey: key) }
            else if let well = control as? NSColorWell { preferences.set(NativeAppearance.hex(well.color), forKey: key) }
            else if let button = control as? NSButton { preferences.set(button.state == .on, forKey: key) }
        }
        preferences.synchronize()
        closeOptions()
        let values = Dictionary(uniqueKeysWithValues: Self.optionKeys.compactMap { key in
            preferences.object(forKey: key).map { (key, $0) }
        })
        for view in Self.instances.allObjects { view.applyOptions(values) }
        // Isolated diagnostic suites must never change running system hosts.
        if preferences is ScreenSaverDefaults {
            DistributedNotificationCenter.default().postNotificationName(Self.settingsChanged, object: nil,
                userInfo: values, deliverImmediately: true)
        }
        // The sheet can belong to a different view from the visible system preview.
        // Remote preview windows can report isVisible=false even while Settings
        // displays their surface. Resume attached previews after configuration;
        // detached configuration-only views stay stopped.
        DispatchQueue.main.async {
            for view in Self.instances.allObjects where view.active || (view.isPreview && view.window != nil) {
                view.lastMinute = ""
                view.startAnimation()
            }
        }
    }
    @objc private func selectSwatch(_ sender: NativeColorSwatch) {
        sheet?.makeFirstResponder(nil)
        guard let menu = controls["palette"] as? NSPopUpButton,
              let item = menu.itemArray.first(where: { $0.representedObject as? String == sender.value }) else { return }
        menu.select(item)
        updateSwatches()
    }
    @objc private func bilingualControlsChanged() {
        controls["translation-locale"]?.isEnabled = (controls["bilingual"] as? NSButton)?.state == .on
    }
    @objc private func colorModeChanged() {
        sheet?.makeFirstResponder(nil)
        let mode = menuValue("color-mode") ?? "default"
        let value = mode == "fixed" ? fixedPalette : mode
        if let menu = controls["palette"] as? NSPopUpButton {
            menu.select(menu.itemArray.first { $0.representedObject as? String == value })
        }
        updateSwatches()
    }
    @objc private func toggleColorEditor() {
        guard let editor = colorEditor else { return }
        editor.isHidden.toggle()
        resizeOptions()
    }
    private func resizeOptions() {
        guard let panel = sheet, let content = panel.contentView,
              let stack = content.subviews.first as? NSStackView else { return }
        content.layoutSubtreeIfNeeded()
        panel.setContentSize(NSSize(width: 700, height: max(470, stack.fittingSize.height + 48)))
    }
    private func updateSwatches() {
        let palette = menuValue("palette") ?? "default"
        let fixed = palette != "default" && palette != "random"
        if fixed { fixedPalette = palette }
        if let mode = controls["color-mode"] as? NSPopUpButton {
            mode.select(mode.itemArray.first { $0.representedObject as? String == (fixed ? "fixed" : palette) })
        }
        colorSwatchesRow?.isHidden = !fixed
        controls["color-edit"]?.isHidden = palette != "custom"
        if palette != "custom" { colorEditor?.isHidden = true }
        resizeOptions()
        for button in swatches {
            button.state = button.value == menuValue("palette") ? .on : .off
            if button.value == "custom", let well = controls["custom-color"] as? NSColorWell { button.swatchColor = well.color }
            button.needsDisplay = true
        }
        updateAppearancePresetSelection()
    }
    func controlTextDidChange(_ notification: Notification) {
        if notification.object as? NSTextField === controls["color-hex"] as? NSTextField,
           let hex = controls["color-hex"] as? NSTextField, NativeAppearance.color(hex.stringValue) != nil { customHexChanged() }
    }
    @objc private func customSlidersChanged() {
        func channel(_ key: String) -> CGFloat { CGFloat((controls["color-" + key] as? NSSlider)?.doubleValue ?? 0) / 255 }
        let color = NSColor(srgbRed: channel("R"), green: channel("G"), blue: channel("B"), alpha: 1)
        (controls["custom-color"] as? NSColorWell)?.color = color
        (controls["color-hex"] as? NSTextField)?.stringValue = NativeAppearance.hex(color)
        customColorChanged()
    }
    @objc private func customHexChanged() {
        guard let hex = controls["color-hex"] as? NSTextField,
              let color = NativeAppearance.color(hex.stringValue)?.usingColorSpace(.sRGB) else { NSSound.beep(); return }
        (controls["custom-color"] as? NSColorWell)?.color = color
        for (channel, value) in [("R", color.redComponent), ("G", color.greenComponent), ("B", color.blueComponent)] {
            (controls["color-" + channel] as? NSSlider)?.doubleValue = Double(value * 255)
        }
        customColorChanged()
    }
    @objc private func customColorChanged() {
        guard let menu = controls["palette"] as? NSPopUpButton,
              let item = menu.itemArray.first(where: { $0.representedObject as? String == "custom" }) else { return }
        menu.select(item)
        updateSwatches()
        if let well = controls["custom-color"] as? NSColorWell {
            (controls["color-hex"] as? NSTextField)?.stringValue = NativeAppearance.hex(well.color)
        }
    }
    @objc private func fontLanguageChanged() { updateDefaultFontLabel() }
    private func updateDefaultFontLabel() {
        guard let menu = controls["font"] as? NSPopUpButton,
              let item = menu.itemArray.first(where: { $0.representedObject as? String == "default" }) else { return }
        let theme = menuValue("theme-base") ?? themeName
        let locale = localeNames.first { (controls["quote-locale:" + $0] as? NSButton)?.state == .on } ?? systemLocale
        let key = NativeAppearance.fontFamily(theme: theme, locale: locale)
        let name = Self.bundledFonts[key].flatMap { NSFont(name: $0, size: 14)?.familyName } ?? key
        item.title = "\(text("default_font")) (\(name))"
    }
    @objc private func photoControlsChanged() {
        updateDefaultFontLabel()
        let theme = menuValue("theme-base") ?? "base"
        if let menu = controls["background"] as? NSPopUpButton {
            if menu.isEnabled { selectedBackground = menuValue("background") ?? "default" }
            menu.isEnabled = NativeAppearance.supportsBackground(theme: theme)
            let visible = menu.isEnabled ? selectedBackground : NativeAppearance.resolvedBackground(theme: theme, selected: selectedBackground)
            if let item = menu.itemArray.first(where: { $0.representedObject as? String == visible }) { menu.select(item) }
        }
        let usesPhoto = NativeAppearance.resolvedBackground(theme: theme, selected: selectedBackground) == "photo"
        controls["background-pattern"]?.isEnabled = NativeAppearance.supportsPattern(theme: theme)
        let provider = menuValue("photo-provider") ?? "picsum"
        let categories = NativePhotoBackground.categories(provider: provider)
        if let menu = controls["photo-category"] as? NSPopUpButton {
            let selected = menuValue("photo-category") ?? "all"
            menu.removeAllItems()
            for category in categories {
                let item = NSMenuItem(title: text("settings_photo_" + category), action: nil, keyEquivalent: "")
                item.representedObject = category; menu.menu?.addItem(item)
                if selected == category { menu.select(item) }
            }
            menu.isHidden = provider == "picsum"
            menu.isEnabled = usesPhoto
        }
        controls["photo-provider"]?.isEnabled = usesPhoto
        controls["photo-provider"]?.superview?.isHidden = !usesPhoto
        updateAppearancePresetSelection()
    }
    func applyOptions(_ values: [String: Any]) {
        for key in Self.optionKeys {
            if let value = values[key] { preferences.set(value, forKey: key) }
        }
        updateAnimationTimeInterval()
        preferences.synchronize()
        if backgroundName != "photo" { photoBackgroundStorage?.cancel() }
        lastMinute = ""
        catalogueRetryAfter.removeAll()
        layoutKey = ""
        patternKey = ""
        opticalSourceKey = ""
        previousPhotoOpticalSource = nil
        needsDisplay = true
    }
    @objc private func settingsDidChange(_ notification: Notification) {
        let values = notification.userInfo as? [String: Any] ?? [:]
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.applyOptions(values)
            self.preferences.synchronize()
            self.lastMinute = ""
            self.needsDisplay = true
        }
    }
    private func closeOptions() {
        guard let sheet else { return }
        (controls["custom-color"] as? NSColorWell)?.deactivate()
        if let parent = sheet.sheetParent { parent.endSheet(sheet) }
        else { sheet.orderOut(nil) }
        self.sheet = nil
        controls.removeAll()
    }
}
