import AppKit
import ScreenSaver
import CoreText
import CoreImage


/// Transparent optical lens: sample the actual background separately for RGB.
/// Only the bevel refracts; the interior stays sharp and untinted.
final class OpticalGlassView: NSView {
    var cornerRadius: CGFloat = 0
    var fullEdgePreview = false
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
        if fullEdgePreview, region.minX > frame.minX {
            let height = min(18, frame.height / 2)
            regions.append(CGRect(x: frame.minX, y: frame.minY, width: region.minX - frame.minX, height: height))
            regions.append(CGRect(x: frame.minX, y: frame.maxY - height, width: region.minX - frame.minX, height: height))
        }
        return regions.compactMap { region in
            kernel.apply(extent: region, roiCallback: { _, area in area.insetBy(dx: -20, dy: -20) }, arguments: [Self.tinted(source, rect: frame, color: tint).clampedToExtent(), rect, cornerRadius, fullEdgePreview ? 1.0 : 0.0])
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
    var resources: URL { Bundle(for: NativeClockView.self).resourceURL! }
    static let optionKeys = ["theme", "screensaver", "show-time", "hide-book-title", "work", "progressbar", "quote-locales", "palette", "custom-color", "background-pattern", "locale", "photo-provider", "photo-category", "bilingual", "translation-locale"]
    var photoDownloadsEnabled = true
    var interactionPreviewSweep = false
    var fullProgressPreviewSweep = false
    var fullEdgePreview = false
    private var photoScreen: NSScreen? { window?.screen ?? NSScreen.screens.first }
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
    var swatches: [NativeColorSwatch] = []
    private var fixedPalette = "red"
    var colorSwatchesRow: NSStackView?
    var colorEditor: NSStackView?
    var quote: NativeQuote?
    var quoteLocale = "en-GB"
    var started = Date()
    var cache: [String: [String: [NativeQuote]]] = [:]
    private var layoutKey = ""
    private var layoutText: NSAttributedString?
    private var layoutHeight: CGFloat = 0
    private var passageImage: NSImage?
    private var passageOpticalSource: CIImage?
    private var timeLabel: NSTextField?
    private var plainTimeImage: NSImage?
    private var plainTimeImageKey = ""
    private var glassProgressView: NSView?
    private var passageView: NSImageView?
    private var opticalSource: CIImage?
    private var opticalSourceKey = ""
    private var patternKey = ""
    private var patternImage: NSImage?
    var themeName: String { (preferences.string(forKey: "theme") ?? "base-dark").split(separator: "-").first.map(String.init) ?? "base" }
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
    private func setup() {
        preferences.register(defaults: ["theme": "base-dark", "screensaver": true, "show-time": true,
                                       "hide-book-title": false, "work": true, "progressbar": "background", "quote-locales": "", "palette": "default",
                                       "custom-color": "#d24335", "background-pattern": "none", "photo-provider": "picsum", "photo-category": "all", "bilingual": false, "translation-locale": ""])
        _ = Self.bundledFonts
        animationTimeInterval = 1.0 / 60.0
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
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { false }
    override func hitTest(_ point: NSPoint) -> NSView? { self }
    override var acceptsFirstResponder: Bool { false }
    func catalogue(_ locale: String) -> [String: [NativeQuote]] {
        if let saved = cache[locale] { return saved }
        let result = (try? JSONDecoder().decode([String: [NativeQuote]].self, from: Data(contentsOf: resources.appendingPathComponent("Quotes/\(locale).json")))) ?? [:]
        cache[locale] = result
        return result
    }
    func refreshQuote(_ now: Date) {
        let components = Calendar.current.dateComponents([.hour, .minute], from: now)
        let minute = String(format: "%02d:%02d", components.hour ?? 0, components.minute ?? 0)
        let displayIndex = photoDisplayIndex
        guard minute != lastMinute || (lastDisplayIndex != nil && lastDisplayIndex != displayIndex) else { return }
        lastMinute = minute
        lastDisplayIndex = displayIndex
        let selected = (preferences.string(forKey: "quote-locales") ?? "").split(separator: ",").map(String.init).filter { localeNames.contains($0) }
        let languages = selected.isEmpty ? [systemLocale] : selected
        let ordinal = (components.hour ?? 0) * 60 + (components.minute ?? 0)
        quoteLocale = languages[Self.variantIndex(count: languages.count, minute: ordinal, displayIndex: displayIndex)]
        for locale in [quoteLocale, "en-GB"] {
            let available = (catalogue(locale)[minute] ?? []).filter { !preferences.bool(forKey: "work") || $0.sfw }
            if !available.isEmpty {
                quote = available[Self.variantIndex(count: available.count, minute: Int(now.timeIntervalSince1970 / 60), displayIndex: displayIndex)]
                quoteLocale = locale; return
            }
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
            glass.fullEdgePreview = fullEdgePreview
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
            let ordered = ["red", "pink", "green", "orange", "purple", "blue", "gray"]
            accent = colors[randomValue(ordered, at: now)]!
        }
        else { accent = colors[palette] ?? .systemRed }
        let background = NativeAppearance.background(theme: theme, dark: dark, accent: accent)
        background.setFill(); bounds.fill()
        NativeAppearance.drawThemeBackground(theme: theme, dark: dark, bounds: bounds, resources: resources)
        if theme == "photo" {
            if photoDownloadsEnabled { photoBackground.update(now: now, size: bounds.size, provider: preferences.string(forKey: "photo-provider") ?? "picsum", category: preferences.string(forKey: "photo-category") ?? "all", displayID: photoDisplayID, displayIndex: photoDisplayIndex) { [weak self] in self?.needsDisplay = true } }
            photoBackground.draw(in: bounds, dark: dark)
        }
        let foreground = NativeAppearance.foreground(theme: theme, dark: dark, accent: accent)
        let scale = window?.backingScaleFactor ?? 1
        var pattern = preferences.string(forKey: "background-pattern") ?? "none"
        if pattern == "random" { pattern = randomValue(Array(NativeAppearance.patterns.dropFirst(2)), at: now) }
        let newPatternKey = "\(pattern)|\(bounds.size)|\(scale)|\(accent)"
        if newPatternKey != patternKey {
            patternImage = NativeAppearance.patternImage(pattern: pattern, size: bounds.size, scale: scale, color: accent, resources: resources)
            patternKey = newPatternKey
        }
        patternImage?.draw(in: bounds)
        let photoKey = theme == "photo" ? photoBackground.image.map { String(describing: ObjectIdentifier($0)) } ?? "none" : "none"
        let opticalKey = "\(theme)|\(dark)|\(bounds.size)|\(newPatternKey)|\(photoKey)"
        if opticalKey != opticalSourceKey && bounds.width > 0 && bounds.height > 0 {
            let backgroundImage = NSImage(size: bounds.size, flipped: false) { [self] rect in
                background.setFill(); rect.fill()
                NativeAppearance.drawThemeBackground(theme: theme, dark: dark, bounds: rect, resources: resources)
                if theme == "photo" { photoBackground.draw(in: rect, dark: dark) }
                patternImage?.draw(in: rect)
                return true
            }
            opticalSource = backgroundImage.tiffRepresentation.flatMap { CIImage(data: $0) }
            opticalSourceKey = opticalKey
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
            label.stringValue = lastMinute
            label.textColor = foreground
            label.sizeToFit()
            label.frame.origin = NSPoint(x: bounds.midX - label.frame.width / 2,
                                         y: isFlipped ? timeTopInset + 8 : bounds.maxY - timeTopInset - 8 - label.frame.height)
            let key = "\(lastMinute)|\(label.font!.pointSize)|\(foreground)|\(scale)"
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
        let progress = fullProgressPreviewSweep ? now.timeIntervalSince(started).truncatingRemainder(dividingBy: 12) / 12 : interactionPreviewSweep ? 0.5 + sin(now.timeIntervalSince(started) / 3) * 0.13 : now.timeIntervalSince1970.truncatingRemainder(dividingBy: 60) / 60
        let progressMode = preferences.string(forKey: "progressbar") ?? "none"
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
        let width = bounds.width * 0.76
        let limit = bounds.height * 0.65
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = quoteLocale.hasPrefix("ar") ? .right : .left
        paragraph.lineBreakMode = .byWordWrapping
        paragraph.lineHeightMultiple = theme == "book" ? 1.35 : theme == "festive" ? 1.25 : theme == "terminal" ? 1.15 : 1
        paragraph.baseWritingDirection = quoteLocale.hasPrefix("ar") ? .rightToLeft : .natural
        let translation = bilingualContent()
        func passage(_ size: CGFloat) -> NSAttributedString {
            let result = NSMutableAttributedString()
            func append(_ item: NativeQuote, locale: String, size: CGFloat, gap: CGFloat) {
                let style = paragraph.mutableCopy() as! NSMutableParagraphStyle
                style.alignment = locale.hasPrefix("ar") ? .right : .left
                style.baseWritingDirection = locale.hasPrefix("ar") ? .rightToLeft : .natural
                style.paragraphSpacingBefore = gap
                let font = quoteFont(size, locale: locale)
                let text = NSMutableAttributedString(string: item.first + item.time + item.last,
                    attributes: [.font: font, .foregroundColor: foreground, .paragraphStyle: style])
                let range = NSRange(location: (item.first as NSString).length, length: (item.time as NSString).length)
                text.addAttribute(theme == "book" ? .backgroundColor : .foregroundColor, value: accent, range: range)
                result.append(text)
                let attribution = preferences.bool(forKey: "hide-book-title") ? item.author : [item.title, item.author].filter { !$0.isEmpty }.joined(separator: ", ")
                if !attribution.isEmpty {
                    result.append(NSAttributedString(string: "\n", attributes: [.font: font, .paragraphStyle: style]))
                    let citationStyle = style.mutableCopy() as! NSMutableParagraphStyle
                    citationStyle.paragraphSpacingBefore = theme == "book" ? (bounds.width <= 750 ? 16 : 24) : size * 0.35
                    result.append(NSAttributedString(string: (theme == "terminal" ? "> " : "— ") + attribution,
                        attributes: [.font: quoteFont(size * 0.55, locale: locale), .foregroundColor: foreground, .paragraphStyle: citationStyle]))
                }
            }
            append(quote, locale: quoteLocale, size: size, gap: 0)
            if let translated = translation.quote {
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
        let key = "\(quote.first)\(quote.time)\(quote.last)\(quote.title)\(quote.author)|\(theme)|\(quoteLocale)|\(width)|\(limit)|\(scale)|\(dark)|\(accent)|\(lastMinute)|\(preferences.bool(forKey: "hide-book-title"))"
        let bilingualKey = key + "|\(quote.id ?? "")|\(preferences.bool(forKey: "bilingual"))|\(preferences.string(forKey: "translation-locale") ?? "")|\(preferences.bool(forKey: "work"))"
        if bilingualKey != layoutKey {
            var low: CGFloat = 1, high = min(bounds.width * 0.043, bounds.height * 0.12)
            for _ in 0..<16 {
                let size = (low + high) / 2
                let measured = passage(size).boundingRect(with: NSSize(width: width, height: .greatestFiniteMagnitude), options: [.usesLineFragmentOrigin, .usesFontLeading])
                if measured.height <= limit && measured.width <= width { low = size } else { high = size }
            }
            layoutText = passage(low)
            layoutHeight = ceil(layoutText!.boundingRect(with: NSSize(width: width, height: .greatestFiniteMagnitude), options: [.usesLineFragmentOrigin, .usesFontLeading]).height)
            // Rasterize the entire passage once at the display's pixel density.
            // Translating this image keeps all glyphs together; drawing text at
            // a new fractional origin every frame independently snaps glyphs.
            let highlightPadding = theme == "book" ? low * 0.2 : 0
            // Leave room for the 25-point Photo halo on every side of the cache.
            let shadowPadding: CGFloat = theme == "photo" ? 50 : 0
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
                if theme == "photo" {
                    let shadow = NSShadow()
                    shadow.shadowOffset = .zero
                    shadow.shadowBlurRadius = 25
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
        let dy = moving ? sin(elapsed / 17) * bounds.height * 0.055 : 0
        // Keep the cached passage above the glass so only the background refracts.
        if passageView == nil {
            let view = NSImageView()
            view.imageScaling = .scaleNone
            addSubview(view)
            passageView = view
        }
        passageView?.image = image
        passageView?.frame = NSRect(x: (bounds.width - image.size.width) / 2 + dx,
                                    y: (bounds.height - image.size.height) / 2 + dy,
                                    width: image.size.width, height: image.size.height)
        passageView?.isHidden = false
        if foregroundGlass, glassProgress, let pane = glassProgressView as? OpticalGlassView,
           let texture = passageOpticalSource, let frame = passageView?.frame, var scene = progressSource {
            // Feed the normal lens the same scene that is drawn beneath it.
            let positionedQuote = texture.transformed(by: CGAffineTransform(scaleX: frame.width / texture.extent.width, y: frame.height / texture.extent.height))
                .transformed(by: CGAffineTransform(translationX: frame.minX, y: frame.minY))
            scene = positionedQuote.composited(over: scene)
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
        let theme = preferences.string(forKey: "theme") ?? "base-dark"
        let parts = theme.split(separator: "-").map(String.init)
        for (key, label, values) in [
            ("theme-base", "theme", NativeAppearance.themes),
            ("theme-mode", "settings_scheme", ["system", "light", "dark"]),
            ("photo-provider", "settings_photo_provider", ["picsum", "nasa", "commons"]),
            ("photo-category", "settings_photo_category", NativePhotoBackground.categories(provider: preferences.string(forKey: "photo-provider") ?? "picsum")),
            ("palette", "settings_color", ["default", "red", "pink", "green", "orange", "purple", "blue", "gray", "random", "custom"]),
            ("background-pattern", "settings_background_pattern", NativeAppearance.patterns),
            ("progressbar", "progressbar_mode", ["none", "top", "bottom", "background", "glass-background", "glass-foreground"])
        ] {
            if key == "transition" { section("settings_behavior") }
            let menu = NSPopUpButton()
            let value = key == "theme-base" ? parts.first : key == "theme-mode" ? parts.last : preferences.string(forKey: key)
            for raw in values {
                let labelKey = key == "photo-category" ? "settings_photo_" + raw : key == "background-pattern" ? "settings_pattern_" + raw : key == "progressbar" ? "settings_progress_" + raw :
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
            if key == "theme-base" || key == "photo-provider" { menu.target = self; menu.action = #selector(photoControlsChanged) }
            controls[key] = menu
            let title = NSTextField(labelWithString: text(label))
            title.widthAnchor.constraint(equalToConstant: 180).isActive = true
            menu.widthAnchor.constraint(equalToConstant: key.hasPrefix("photo-") ? 180 : 260).isActive = true
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
        section("settings_behavior")
        for (key, label) in [("screensaver", "movement"), ("show-time", "time_mode"), ("hide-book-title", "settings_hide_book_title"), ("work", "work_mode_title")] {
            let check = NSButton(checkboxWithTitle: text(label), target: nil, action: nil)
            check.state = preferences.bool(forKey: key) ? .on : .off
            controls[key] = check
            stack.addArrangedSubview(check)
        }
        let version = Bundle(for: Self.self).object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "development"
        let versionLink = NSButton(title: "Literature Clock for macOS · v" + version, target: self, action: #selector(openVersionRelease))
        versionLink.isBordered = false
        stack.addArrangedSubview(versionLink)
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
    @objc private func openVersionRelease() {
        let version = Bundle(for: Self.self).object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0.1.0"
        if let url = URL(string: "https://github.com/cdmoro/literature-clock/releases/tag/macos-native-v" + version) { NSWorkspace.shared.open(url) }
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
        for (key, control) in controls {
            if key.hasPrefix("quote-locale:") || key.hasPrefix("theme-") || key.hasPrefix("color-") { continue }
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
    @objc private func photoControlsChanged() {
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
            menu.isEnabled = menuValue("theme-base") == "photo"
        }
        controls["photo-provider"]?.isEnabled = menuValue("theme-base") == "photo"
    }
    func applyOptions(_ values: [String: Any]) {
        for key in Self.optionKeys {
            if let value = values[key] { preferences.set(value, forKey: key) }
        }
        preferences.synchronize()
        if themeName != "photo" { photoBackgroundStorage?.cancel() }
        lastMinute = ""
        layoutKey = ""
        patternKey = ""
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
