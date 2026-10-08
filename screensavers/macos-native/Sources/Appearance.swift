import AppKit

final class NativeColorSwatch: NSButton {
    var value = ""
    var swatchColor = NSColor.systemRed
    override func draw(_ dirtyRect: NSRect) {
        let circle = NSBezierPath(ovalIn: bounds.insetBy(dx: 4, dy: 4))
        swatchColor.setFill(); circle.fill()
        if value == "default" || value == "random" {
            let symbol = value == "default" ? "↺" : "↻"
            (symbol as NSString).draw(in: bounds.insetBy(dx: 7, dy: 4), withAttributes: [.font: NSFont.boldSystemFont(ofSize: 16), .foregroundColor: NSColor.windowBackgroundColor])
        }
        if state == .on {
            NSColor.controlAccentColor.setStroke()
            let ring = NSBezierPath(ovalIn: bounds.insetBy(dx: 1, dy: 1)); ring.lineWidth = 2; ring.stroke()
        }
    }
}

enum NativeAppearance {
    static let presetColors: [String: NSColor] = ["red": .systemRed, "pink": .systemPink, "green": .systemGreen, "orange": .systemOrange, "purple": .systemPurple, "blue": .systemBlue, "gray": .systemGray]
    private static var textures: [String: NSImage] = [:]
    static func drawThemeBackground(theme: String, dark: Bool, bounds: NSRect, resources: URL) {
        if theme == "festive" {
            NSGradient(starting: color(dark ? "#011b1b" : "#fad0c4")!, ending: color(dark ? "#43162c" : "#ffd1ff")!)!.draw(in: bounds, angle: 45)
        }
        let name = theme == "retro" ? "scanlines-bg-" + (dark ? "dark" : "light") + ".jpg" : theme == "book" ? "book-paper-seamless.webp" : ""
        if !name.isEmpty {
            if textures[name] == nil { textures[name] = NSImage(contentsOf: resources.appendingPathComponent("Backgrounds/" + name)) }
            if let image = textures[name] {
                if theme == "book" {
                    NSGraphicsContext.saveGraphicsState()
                    NSBezierPath(rect: bounds).addClip()
                    for x in stride(from: CGFloat(0), through: bounds.width, by: 420) {
                        for y in stride(from: CGFloat(0), through: bounds.height, by: 420) {
                            image.draw(in: NSRect(x: x, y: y, width: 420, height: 420), from: .zero, operation: .sourceOver, fraction: dark ? 0.22 : 0.65)
                        }
                    }
                    NSGraphicsContext.restoreGraphicsState()
                } else {
                    // The web asset is a 1 × 3 pixel scanline tile. Stretching
                    // it across a display erases the repeating CRT texture.
                    NSGraphicsContext.saveGraphicsState()
                    NSGraphicsContext.current?.imageInterpolation = .none
                    // JPEG's 300 dpi metadata would otherwise make the tile
                    // smaller than one point and flatten it during sampling.
                    image.size = NSSize(width: 1, height: 3)
                    NSColor(patternImage: image).setFill()
                    bounds.fill()
                    NSGraphicsContext.restoreGraphicsState()
                }
            }
        }
        if theme == "terminal" {
            NSColor.black.withAlphaComponent(0.13).setFill()
            for y in stride(from: CGFloat(0), through: bounds.height, by: 4) { NSRect(x: 0, y: y, width: bounds.width, height: 1).fill() }
        }
    }
    static let themes = ["base", "book", "terminal", "festive", "bohemian", "retro", "photo"]
    static let patterns = ["none", "random", "dots", "diagonal", "grid"]
    static func fontFamily(theme: String, locale: String) -> String {
        let language = locale.split(separator: "-").first.map(String.init) ?? "en"
        let main = ["base": "specialelite", "book": "librebaskerville", "terminal": "b612mono",
                    "festive": "borel", "bohemian": "comfortaa", "retro": "vt323", "photo": "abrilfatface"]
        let variants = [
            "base": ["ar": "marhey", "ru": "pangolin", "el": "sansation", "zh": "zcoolkuaile"],
            "book": ["ru": "literata", "el": "literata", "ar": "marhey", "zh": "zcoolkuaile"],
            "terminal": ["ar": "cascadiacode", "eo": "lxgwwenkaimonotc", "ru": "jetbrainsmono", "el": "victormono", "zh": "zcoolqingkehuangyou"],
            "festive": ["ar": "playpensansarabic", "eo": "playwritear", "ru": "pacifico", "el": "comicrelief", "zh": "zcoolkuaile"],
            "bohemian": ["ar": "zain", "el": "sansation", "zh": "zcoolkuaile"],
            "photo": ["ar": "lalezar", "ru": "russoone", "el": "delagothicone", "zh": "zcoolkuaile"],
            "retro": ["ar": "handjet", "ru": "dotgothic16", "el": "handjet", "zh": "zcoolqingkehuangyou"]
        ]
        return variants[theme]?[language] ?? main[theme] ?? "specialelite"
    }
    static func color(_ hex: String) -> NSColor? {
        let value = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        guard value.count == 6, let rgb = UInt32(value, radix: 16) else { return nil }
        return NSColor(srgbRed: CGFloat((rgb >> 16) & 255) / 255, green: CGFloat((rgb >> 8) & 255) / 255, blue: CGFloat(rgb & 255) / 255, alpha: 1)
    }
    static func hex(_ color: NSColor) -> String {
        let rgb = color.usingColorSpace(.sRGB) ?? .systemRed
        return String(format: "#%02x%02x%02x", Int(round(rgb.redComponent * 255)), Int(round(rgb.greenComponent * 255)), Int(round(rgb.blueComponent * 255)))
    }
    static func background(theme: String, dark: Bool, accent: NSColor? = nil) -> NSColor {
        if theme == "base" {
            let accent = (accent ?? defaultAccent(theme: theme, dark: dark)).usingColorSpace(.sRGB)!
            let neutral = color(dark ? "#101016" : "#ffffff")!.usingColorSpace(.sRGB)!
            let fraction: CGFloat = dark ? 0.16 : 0.15
            // Match CSS color-mix(in srgb), rather than blending in linear light.
            return NSColor(srgbRed: accent.redComponent * fraction + neutral.redComponent * (1 - fraction),
                           green: accent.greenComponent * fraction + neutral.greenComponent * (1 - fraction),
                           blue: accent.blueComponent * fraction + neutral.blueComponent * (1 - fraction), alpha: 1)
        }
        let colors = ["photo": dark ? "#111111" : "#dddddd", "book": dark ? "#292621" : "#f5edd9", "terminal": dark ? "#07120c" : "#edf5eb",
                      "festive": dark ? "#211323" : "#fff1f5", "bohemian": dark ? "#142323" : "#eaf4ee",
                      "retro": dark ? "#17120b" : "#f4e8ce"]
        return color(colors[theme] ?? (dark ? "#121212" : "#f2f2f2"))!
    }
    static func foreground(theme: String, dark: Bool, accent: NSColor) -> NSColor {
        if theme == "terminal" { return accent.withAlphaComponent(0.8) }
        if theme == "photo" { return color(dark ? "#eeeeee" : "#111111")! }
        if theme == "base" { return color(dark ? "#c9c9c5" : "#2f2e2c")! }
        return dark ? NSColor(calibratedWhite: 0.9, alpha: 1) : NSColor(calibratedWhite: 0.13, alpha: 1)
    }
    static func progressForeground(theme: String, dark: Bool, accent: NSColor) -> NSColor {
        if theme == "photo" { return color(dark ? "#d7d7d7" : "#282826")! }
        return foreground(theme: theme, dark: dark, accent: accent)
    }
    static func defaultAccent(theme: String, dark: Bool) -> NSColor {
        let colors = ["photo": dark ? "#fd3622" : "#e33725", "book": dark ? "#214cc6" : "#fbf719", "terminal": dark ? "#1bec1b" : "#27702b",
                      "festive": "#e74c3c", "bohemian": "#1abc9c", "retro": dark ? "#f1ba08" : "#966a00"]
        return color(colors[theme] ?? "#d24335")!
    }
    static func patternImage(pattern: String, size: NSSize, scale: CGFloat, color: NSColor) -> NSImage? {
        guard pattern != "none", size.width > 0, size.height > 0 else { return nil }
        let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(ceil(size.width * scale)), pixelsHigh: Int(ceil(size.height * scale)), bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
        bitmap.size = size
        NSGraphicsContext.saveGraphicsState(); NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
        NSColor.clear.setFill(); NSRect(origin: .zero, size: size).fill(using: .copy)
        color.withAlphaComponent(0.22).setFill(); color.withAlphaComponent(0.22).setStroke()
        if pattern == "dots" {
            for x in stride(from: CGFloat(12), through: size.width, by: 24) {
                for y in stride(from: CGFloat(12), through: size.height, by: 24) { NSBezierPath(ovalIn: NSRect(x: x, y: y, width: 3, height: 3)).fill() }
            }
        } else {
            let path = NSBezierPath(); path.lineWidth = 1
            if pattern == "grid" {
                for x in stride(from: CGFloat(0), through: size.width, by: 32) { path.move(to: NSPoint(x: x, y: 0)); path.line(to: NSPoint(x: x, y: size.height)) }
                for y in stride(from: CGFloat(0), through: size.height, by: 32) { path.move(to: NSPoint(x: 0, y: y)); path.line(to: NSPoint(x: size.width, y: y)) }
            } else {
                for x in stride(from: -size.height, through: size.width, by: 24) { path.move(to: NSPoint(x: x, y: 0)); path.line(to: NSPoint(x: x + size.height, y: size.height)) }
            }
            path.stroke()
        }
        NSGraphicsContext.restoreGraphicsState()
        let image = NSImage(size: size); image.addRepresentation(bitmap); return image
    }
}
