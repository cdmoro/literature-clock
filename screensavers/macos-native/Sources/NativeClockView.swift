import AppKit
import ScreenSaver
import CoreText

struct NativeQuote: Codable {
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
    static let optionKeys = ["theme", "screensaver", "show-time", "hide-book-title", "work", "progressbar", "quote-locales", "palette", "custom-color", "background-pattern", "locale", "photo-provider", "photo-category"]
    var photoDownloadsEnabled = true
    private lazy var photoBackground = NativePhotoBackground()
    var active = false
    var lastMinute = ""
    var sheet: NSWindow?
    var controls: [String: NSControl] = [:]
    var swatches: [NativeColorSwatch] = []
    var quote: NativeQuote?
    var quoteLocale = "en-GB"
    var started = Date()
    var cache: [String: [String: [NativeQuote]]] = [:]
    private var layoutKey = ""
    private var layoutText: NSAttributedString?
    private var layoutHeight: CGFloat = 0
    private var passageImage: NSImage?
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
    func quoteFont(_ size: CGFloat) -> NSFont {
        let family = NativeAppearance.fontFamily(theme: themeName, locale: quoteLocale)
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
                                       "custom-color": "#d24335", "background-pattern": "none", "photo-provider": "picsum", "photo-category": "all"])
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
    override func stopAnimation() { active = false; photoBackground.cancel(); super.stopAnimation() }
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
        guard minute != lastMinute else { return }
        lastMinute = minute
        let selected = (preferences.string(forKey: "quote-locales") ?? "").split(separator: ",").map(String.init).filter { localeNames.contains($0) }
        let languages = selected.isEmpty ? [systemLocale] : selected
        let ordinal = (components.hour ?? 0) * 60 + (components.minute ?? 0)
        quoteLocale = languages[ordinal % languages.count]
        for locale in [quoteLocale, "en-GB"] {
            let available = (catalogue(locale)[minute] ?? []).filter { !preferences.bool(forKey: "work") || $0.sfw }
            if let chosen = available.randomElement() { quote = chosen; quoteLocale = locale; return }
        }
        // Explain missing/filtered minutes in the requested language; never
        // invent a literary quote or silently display a bare time.
        let fallbacks = (try? JSONDecoder().decode([String: NativeQuote].self, from: Data(contentsOf: resources.appendingPathComponent("fallback.json")))) ?? [:]
        let notice = fallbacks[quoteLocale] ?? fallbacks["en-GB"]
        quote = NativeQuote(first: notice?.first ?? "", time: minute, last: notice?.last ?? "", title: "", author: "", sfw: true)
    }
    static func timeInset(viewFrame: NSRect, screenFrame: NSRect, safeTop: CGFloat) -> CGFloat {
        8 + max(0, min(viewFrame.height, viewFrame.maxY - (screenFrame.maxY - safeTop)))
    }
    private var timeTopInset: CGFloat {
        guard !isPreview, let window, let screen = window.screen else { return 8 }
        let frame = window.convertToScreen(convert(bounds, to: nil))
        return Self.timeInset(viewFrame: frame, screenFrame: screen.frame, safeTop: screen.safeAreaInsets.top)
    }
    override func draw(_ dirtyRect: NSRect) {
        let now = Date()
        refreshQuote(now)
        let mode = (preferences.string(forKey: "theme") ?? "base-dark").split(separator: "-").last ?? "dark"
        let dark = mode == "dark" || (mode == "system" && effectiveAppearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua)
        let theme = themeName
        let background = NativeAppearance.background(theme: theme, dark: dark)
        background.setFill(); bounds.fill()
        NativeAppearance.drawThemeBackground(theme: theme, dark: dark, bounds: bounds, resources: resources)
        if theme == "photo" {
            if photoDownloadsEnabled { photoBackground.update(now: now, size: bounds.size, provider: preferences.string(forKey: "photo-provider") ?? "picsum", category: preferences.string(forKey: "photo-category") ?? "all") { [weak self] in self?.needsDisplay = true } }
            photoBackground.draw(in: bounds, dark: dark)
        }
        let colors = NativeAppearance.presetColors
        let palette = preferences.string(forKey: "palette") ?? "default"
        let accent: NSColor
        if palette == "custom" { accent = NativeAppearance.color(preferences.string(forKey: "custom-color") ?? "") ?? .systemRed }
        else if palette == "default" { accent = NativeAppearance.defaultAccent(theme: theme, dark: dark) }
        else if palette == "random" {
            let ordered = ["red", "pink", "green", "orange", "purple", "blue", "gray"]
            accent = colors[ordered[Int(now.timeIntervalSince1970 / 60) % ordered.count]]!
        }
        else { accent = colors[palette] ?? .systemRed }
        let scale = window?.backingScaleFactor ?? 1
        var pattern = preferences.string(forKey: "background-pattern") ?? "none"
        if pattern == "random" { pattern = ["dots", "diagonal", "grid"][Int(now.timeIntervalSince1970 / 60) % 3] }
        let newPatternKey = "\(pattern)|\(bounds.size)|\(scale)|\(accent)"
        if newPatternKey != patternKey {
            patternImage = NativeAppearance.patternImage(pattern: pattern, size: bounds.size, scale: scale, color: accent)
            patternKey = newPatternKey
        }
        patternImage?.draw(in: bounds)
        let progress = now.timeIntervalSince1970.truncatingRemainder(dividingBy: 60) / 60
        let progressMode = preferences.string(forKey: "progressbar") ?? "none"
        if progressMode != "none" {
            accent.withAlphaComponent(progressMode == "background" ? 0.12 : 0.7).setFill()
            NSRect(x: bounds.minX, y: progressMode == "top" ? bounds.maxY - 3 : bounds.minY,
                   width: bounds.width * progress, height: progressMode == "background" ? bounds.height : 3).fill()
        }
        guard bounds.width > 0, bounds.height > 0, let quote else { return }
        let foreground = theme == "terminal" ? accent.withAlphaComponent(0.8) : dark ? NSColor(calibratedWhite: 0.9, alpha: 1) : NSColor(calibratedWhite: 0.13, alpha: 1)
        if preferences.bool(forKey: "show-time") {
            let timeStyle = NSMutableParagraphStyle(); timeStyle.alignment = .center
            let font = NSFont.systemFont(ofSize: max(10, min(20, bounds.width * 0.013)), weight: .bold)
            (lastMinute as NSString).draw(in: NSRect(x: 0, y: (NSGraphicsContext.current?.isFlipped ?? isFlipped) ? timeTopInset : bounds.height - font.pointSize * 1.5 - timeTopInset, width: bounds.width, height: font.pointSize * 1.5),
                                        withAttributes: [.font: font, .foregroundColor: foreground, .paragraphStyle: timeStyle])
        }
        let width = bounds.width * 0.76
        let limit = bounds.height * 0.65
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = quoteLocale.hasPrefix("ar") ? .right : .left
        paragraph.lineBreakMode = .byWordWrapping
        paragraph.lineHeightMultiple = theme == "book" ? 1.35 : theme == "festive" ? 1.25 : theme == "terminal" ? 1.15 : 1
        paragraph.baseWritingDirection = quoteLocale.hasPrefix("ar") ? .rightToLeft : .natural
        func passage(_ size: CGFloat) -> NSAttributedString {
            let font = quoteFont(size)
            let result = NSMutableAttributedString(string: quote.first + quote.time + quote.last,
                attributes: [.font: font, .foregroundColor: foreground, .paragraphStyle: paragraph])
            let timeRange = NSRange(location: (quote.first as NSString).length, length: (quote.time as NSString).length)
            if theme == "book" {
                result.addAttribute(.backgroundColor, value: accent.withAlphaComponent(0.65), range: timeRange)
            } else { result.addAttribute(.foregroundColor, value: accent, range: timeRange) }
            let attribution = preferences.bool(forKey: "hide-book-title") ? quote.author : [quote.title, quote.author].filter { !$0.isEmpty }.joined(separator: ", ")
            if !attribution.isEmpty {
                result.append(NSAttributedString(string: "\n" + (theme == "terminal" ? "> " : "— ") + attribution, attributes: [.font: quoteFont(size * 0.55), .foregroundColor: foreground, .paragraphStyle: paragraph]))
            }
            return result
        }
        let key = "\(quote.first)\(quote.time)\(quote.last)\(quote.title)\(quote.author)|\(theme)|\(quoteLocale)|\(width)|\(limit)|\(scale)|\(dark)|\(accent)|\(lastMinute)|\(preferences.bool(forKey: "hide-book-title"))"
        if key != layoutKey {
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
            let size = NSSize(width: ceil(width), height: layoutHeight + 4)
            let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(ceil(size.width * scale)), pixelsHigh: Int(ceil(size.height * scale)), bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
            bitmap.size = size
            NSGraphicsContext.saveGraphicsState()
            NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
            NSColor.clear.setFill(); NSRect(origin: .zero, size: size).fill(using: .copy)
            layoutText!.draw(with: NSRect(x: 0, y: 2, width: width, height: layoutHeight + 2), options: [.usesLineFragmentOrigin, .usesFontLeading])
            NSGraphicsContext.restoreGraphicsState()
            let image = NSImage(size: size)
            image.addRepresentation(bitmap)
            passageImage = image
            layoutKey = key
        }
        guard let image = passageImage else { return }
        let elapsed = max(0, now.timeIntervalSince(started))
        let moving = preferences.bool(forKey: "screensaver")
        let dx = moving ? sin(elapsed / 12) * bounds.width * 0.045 : 0
        let dy = moving ? sin(elapsed / 17) * bounds.height * 0.055 : 0
        NSGraphicsContext.current?.imageInterpolation = .high
        image.draw(in: NSRect(x: (bounds.width - image.size.width) / 2 + dx, y: (bounds.height - image.size.height) / 2 + dy,
                              width: image.size.width, height: image.size.height), from: .zero, operation: .sourceOver, fraction: 1)
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
        section("settings_appearance")
        let theme = preferences.string(forKey: "theme") ?? "base-dark"
        let parts = theme.split(separator: "-").map(String.init)
        for (key, label, values) in [
            ("theme-base", "theme", NativeAppearance.themes),
            ("theme-mode", "settings_scheme", ["light", "dark", "system"]),
            ("photo-provider", "settings_photo_provider", ["picsum", "nasa", "commons"]),
            ("photo-category", "settings_photo_category", NativePhotoBackground.categories(provider: preferences.string(forKey: "photo-provider") ?? "picsum")),
            ("palette", "settings_color", ["default", "red", "pink", "green", "orange", "purple", "blue", "gray", "random", "custom"]),
            ("background-pattern", "settings_background_pattern", NativeAppearance.patterns),
            ("progressbar", "progressbar_mode", ["none", "top", "bottom", "background"])
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
                for raw in values {
                    let button = NativeColorSwatch(frame: .zero)
                    button.value = raw
                    button.swatchColor = NativeAppearance.presetColors[raw] ?? (raw == "custom" ? NativeAppearance.color(preferences.string(forKey: "custom-color") ?? "")! : .labelColor)
                    button.toolTip = menu.itemArray.first { $0.representedObject as? String == raw }?.title
                    button.setAccessibilityLabel(button.toolTip ?? raw)
                    button.target = self; button.action = #selector(selectSwatch(_:))
                    button.widthAnchor.constraint(equalToConstant: 28).isActive = true
                    button.heightAnchor.constraint(equalToConstant: 28).isActive = true
                    swatches.append(button); row.addArrangedSubview(button)
                }
                stack.addArrangedSubview(NSStackView(views: [title, row]))
                updateSwatches()
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
                stack.addArrangedSubview(NSStackView(views: [title, well, hex]))
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
                stack.addArrangedSubview(channels)
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
    private func updateSwatches() {
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
        if themeName != "photo" { photoBackground.cancel() }
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
