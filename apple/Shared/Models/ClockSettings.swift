import Foundation
import SwiftUI
import WidgetKit
import OSLog
#if os(macOS)
import AppKit
import CoreText
#else
import UIKit
#endif

enum ClockSettings {
    static let appGroup = Bundle.main.object(forInfoDictionaryKey: "ClockAppGroup") as? String
        ?? "group.net.literatureclock.app"
    static let defaults = UserDefaults(suiteName: appGroup)!

    // macOS does not register fonts from UIAppFonts.
    private static let bundledFontRegistration: Void = {
        #if os(macOS)
        if let url = Bundle.main.url(forResource: "SpecialElite-Regular", withExtension: "ttf") {
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        }
        #endif
    }()
    static let localeKey = "quote-locale"
    static let localesKey = "quote-locales"
    static let appearanceKey = "appearance"
    static let fontKey = "quote-font"
    static let paletteKey = "widget-palette"
    static let highlightKey = "quote-highlight"
    static let fuzzyKey = "fuzzy-clock"
    static let safeOnlyKey = "safe-quotes-only"
    static let attributionKey = "widget-attribution"
    static let quoteRevisionKey = "quote-revision"
    static let customBackgroundKey = "widget-custom-background"
    static let customAccentKey = "widget-custom-accent"
    static let progressKey = "seconds-progress"
    private static let sharingProbeKey = "widget-sharing-probe"
    private static let sharingLogger = Logger(subsystem: "net.literatureclock.app.sharing", category: "Preferences")

    // Compare values observed by the actual app and WidgetKit processes. A
    // successful build or a defaults read from Terminal cannot establish this.
    static func recordAppSharingProbe(palette: String? = nil, accent: String? = nil) {
        let token = UUID().uuidString
        defaults.set(token, forKey: sharingProbeKey)
        recordSharingEvent("SHARING_APP", token: token,
                           palette: palette ?? defaults.string(forKey: paletteKey) ?? "red",
                           accent: accent ?? defaults.string(forKey: customAccentKey) ?? "#B36E26")
    }

    static func recordWidgetSharingProbe(selection: String, appliedPalette: String) {
        recordSharingEvent("SHARING_WIDGET", token: defaults.string(forKey: sharingProbeKey) ?? "missing",
                           palette: defaults.string(forKey: paletteKey) ?? "missing",
                           accent: defaults.string(forKey: customAccentKey) ?? "#B36E26",
                           selection: selection, appliedPalette: appliedPalette)
    }

    private static func recordSharingEvent(_ event: String, token: String, palette: String, accent: String,
                                           selection: String? = nil, appliedPalette: String? = nil) {
        var values: [String: String] = [
            "token": token, "palette": palette, "accent": accent,
            "group": appGroup,
            "version": Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown",
            "build": Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "unknown",
            "container": FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup) == nil ? "unavailable" : "available"
        ]
        values["selection"] = selection
        values["appliedPalette"] = appliedPalette
        guard let data = try? JSONSerialization.data(withJSONObject: values, options: .sortedKeys),
              let json = String(data: data, encoding: .utf8) else { return }
        sharingLogger.notice("\(event, privacy: .public) \(json, privacy: .public)")
    }

    static var dyslexicFontName: String? {
        #if os(macOS)
        let names = NSFontManager.shared.availableFonts
            .filter { $0.lowercased().filter(\.isLetter).contains("opendyslexic") }
        #else
        let names = UIFont.familyNames
            .filter { $0.lowercased().filter(\.isLetter).contains("opendyslexic") }
            .flatMap { UIFont.fontNames(forFamilyName: $0) }
        #endif
        return names.first { $0.lowercased().contains("regular") } ?? names.first
    }

    static func quoteFont(_ name: String, size: CGFloat, weight: Font.Weight = .regular) -> Font {
        let _ = bundledFontRegistration
        return switch name {
        case "rounded": .system(size: size, weight: weight, design: .rounded)
        case "monospaced": .system(size: size, weight: weight, design: .monospaced)
        case "specialElite": .custom("SpecialElite-Regular", size: size, relativeTo: .body)
        case "dyslexic":
            if let dyslexicFontName {
                .custom(dyslexicFontName, size: size, relativeTo: .body)
            } else {
                .system(size: size, weight: weight, design: .serif)
            }
        default: .system(size: size, weight: weight, design: .serif)
        }
    }

    static func validAccentHex(_ value: String) -> String? {
        let hex = value.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        guard hex.count == 6, UInt32(hex, radix: 16) != nil else { return nil }
        return "#" + hex.uppercased()
    }

    static func color(fromHex hex: String) -> Color {
        let value = UInt64(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0xF7F5F1
        return Color(
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255
        )
    }

    static func hex(from color: Color) -> String {
        guard let (red, green, blue) = components(color) else { return "#F7F5F1" }
        return String(format: "#%02X%02X%02X", Int((red * 255).rounded()), Int((green * 255).rounded()), Int((blue * 255).rounded()))
    }

    static func paletteBackground(_ palette: String, dark: Bool) -> Color {
        background(for: paletteAccent(palette), dark: dark)
    }

    static func background(for accent: Color, dark: Bool) -> Color {
        let base = dark ? Color(red: 16 / 255, green: 16 / 255, blue: 22 / 255) : .white
        return mix(base, accent, amount: dark ? 0.16 : 0.15)
    }

    static func paletteAccent(_ palette: String) -> Color {
        switch palette {
        case "pink": Color(red: 1.0, green: 0x89 / 255, blue: 0xD8 / 255)
        case "green": Color(red: 0x2E / 255, green: 0xCC / 255, blue: 0x71 / 255)
        case "pine": Color(red: 0x15 / 255, green: 0x9D / 255, blue: 0x3E / 255)
        case "orange": Color(red: 0xF3 / 255, green: 0x9C / 255, blue: 0x12 / 255)
        case "purple": Color(red: 0x9B / 255, green: 0x59 / 255, blue: 0xB6 / 255)
        case "blue": Color(red: 0x2C / 255, green: 0x97 / 255, blue: 0xDF / 255)
        case "gray": Color(red: 0x80 / 255, green: 0x86 / 255, blue: 0x86 / 255)
        default: Color(red: 0xD2 / 255, green: 0x43 / 255, blue: 0x35 / 255)
        }
    }

    private static func mix(_ base: Color, _ tint: Color, amount: Double) -> Color {
        guard let (br, bg, bb) = components(base),
              let (tr, tg, tb) = components(tint) else { return tint }
        return Color(red: Double(br) * (1 - amount) + Double(tr) * amount,
                     green: Double(bg) * (1 - amount) + Double(tg) * amount,
                     blue: Double(bb) * (1 - amount) + Double(tb) * amount)
    }

    static func foreground(for background: Color) -> Color {
        guard let (red, green, blue) = components(background) else { return .white }
        let luminance = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue)
        return luminance > 0.52 ? Color(red: 0.12, green: 0.12, blue: 0.12) : .white
    }

    private static func components(_ color: Color) -> (CGFloat, CGFloat, CGFloat)? {
        #if os(macOS)
        guard let rgb = NSColor(color).usingColorSpace(.sRGB) else { return nil }
        return (rgb.redComponent, rgb.greenComponent, rgb.blueComponent)
        #else
        var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 0
        guard UIColor(color).getRed(&red, green: &green, blue: &blue, alpha: &alpha) else { return nil }
        return (red, green, blue)
        #endif
    }

    static var locale: String {
        let storedLocales = defaults.string(forKey: localesKey) ?? ""
        let fallback = defaults.string(forKey: localeKey) ?? Locale.current.identifier
        let candidates = ClockCatalogue.selectedLocales(storedLocales, fallback: fallback)
        return ClockCatalogue.randomLocale(at: .now, from: candidates,
                                           safeOnly: defaults.bool(forKey: safeOnlyKey))
    }

    static var appearance: String { defaults.string(forKey: appearanceKey) ?? "system" }
}

// Try the complete quote at readable sizes, then progressively remove context.
// Every candidate retains the complete time phrase, including the final fallback.
struct ReadableQuoteText: View {
    @Environment(\.widgetRenderingMode) private var widgetRenderingMode
    let parts: (before: String, time: String, after: String)
    let fontName: String
    let foreground: Color
    let accent: Color
    let highlight: Bool
    let maximumSize: CGFloat
    let minimumSize: CGFloat
    var emphasizeHighlight = false
    var alignment: TextAlignment = .leading

    private var usesAccentedRendering: Bool {
        widgetRenderingMode == .accented || widgetRenderingMode == .vibrant
    }

    var body: some View {
        // The parent supplies the wrapping width. Checking both axes measures
        // Text's unwrapped ideal width and can reject even a short quote.
        ViewThatFits(in: .vertical) {
            line(parts, size: maximumSize)
            line(parts, size: (maximumSize + minimumSize) / 2)
            line(parts, size: minimumSize)
            line(excerpt(context: 240), size: minimumSize)
            line(excerpt(context: 160), size: minimumSize)
            line(excerpt(context: 100), size: minimumSize)
            line(excerpt(context: 60), size: minimumSize)
            line(excerpt(context: 30), size: minimumSize)
            line(excerpt(context: 12), size: minimumSize)
            line(excerpt(context: 0), size: minimumSize)
        }
    }

    private func excerpt(context: Int) -> (before: String, time: String, after: String) {
        let beforeCount = wordBoundaryCount(in: parts.before, limit: context / 2, fromEnd: true)
        let afterCount = wordBoundaryCount(in: parts.after, limit: context - beforeCount, fromEnd: false)
        let expandedBefore = wordBoundaryCount(in: parts.before, limit: context - afterCount, fromEnd: true)
        return ((expandedBefore < parts.before.count ? "…" : "") + String(parts.before.suffix(expandedBefore)),
                parts.time,
                String(parts.after.prefix(afterCount)) + (afterCount < parts.after.count ? "…" : ""))
    }

    private func wordBoundaryCount(in text: String, limit: Int, fromEnd: Bool) -> Int {
        guard limit > 0, text.count > limit else { return min(text.count, max(limit, 0)) }
        let boundary = fromEnd
            ? text.index(text.endIndex, offsetBy: -limit)
            : text.index(text.startIndex, offsetBy: limit)
        let range = fromEnd ? text.startIndex..<boundary : boundary..<text.endIndex
        guard let whitespace = text.rangeOfCharacter(from: .whitespacesAndNewlines,
                                                      options: fromEnd ? .backwards : [],
                                                      range: range) else { return 0 }
        return fromEnd ? text.distance(from: whitespace.upperBound, to: text.endIndex)
                       : text.distance(from: text.startIndex, to: whitespace.lowerBound)
    }

    private func line(_ value: (before: String, time: String, after: String), size: CGFloat) -> some View {
        // Use standard Text runs so WidgetKit can archive the view, including
        // medium-size gallery snapshots, without a custom drawing renderer.
        let contextColor = foreground.opacity(highlight && usesAccentedRendering ? 0.70 : 1)
        let time = Text(value.time)
            .font(ClockSettings.quoteFont(fontName, size: size,
                                         weight: emphasizeHighlight && highlight ? .bold : .regular))
            .foregroundColor(highlight ? (emphasizeHighlight ? foreground : accent) : foreground)
        let quoteText = Text(value.before).foregroundColor(contextColor) + time +
            Text(value.after).foregroundColor(contextColor)

        return quoteText
            .font(ClockSettings.quoteFont(fontName, size: size))
            .fontWeight(.regular)
            .lineSpacing(fontName == "specialElite" ? size * 0.18 : 0)
            .multilineTextAlignment(alignment)
            .frame(maxWidth: .infinity, alignment: alignment == .center ? .center : (alignment == .trailing ? .trailing : .leading))
            .fixedSize(horizontal: false, vertical: true)
    }
}
