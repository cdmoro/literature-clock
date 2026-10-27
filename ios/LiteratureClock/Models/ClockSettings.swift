import Foundation
import SwiftUI
import UIKit

enum ClockSettings {
    static let defaults = UserDefaults(suiteName: "group.net.literatureclock.app")!
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

    static var dyslexicFontName: String? {
        let names = UIFont.familyNames
            .filter { $0.lowercased().filter(\.isLetter).contains("opendyslexic") }
            .flatMap { UIFont.fontNames(forFamilyName: $0) }
        return names.first { $0.lowercased().contains("regular") } ?? names.first
    }

    static func quoteFont(_ name: String, size: CGFloat, weight: Font.Weight = .regular) -> Font {
        switch name {
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

    static var progressMode: String {
        let value = defaults.string(forKey: progressKey) ?? "bottom"
        return ["bottom", "background", "hidden"].contains(value) ? value : "bottom"
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
        let uiColor = UIColor(color)
        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        var alpha: CGFloat = 0
        guard uiColor.getRed(&red, green: &green, blue: &blue, alpha: &alpha) else { return "#F7F5F1" }
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
        case "orange": Color(red: 0xF3 / 255, green: 0x9C / 255, blue: 0x12 / 255)
        case "purple": Color(red: 0x9B / 255, green: 0x59 / 255, blue: 0xB6 / 255)
        case "blue": Color(red: 0x2C / 255, green: 0x97 / 255, blue: 0xDF / 255)
        case "gray": Color(red: 0x80 / 255, green: 0x86 / 255, blue: 0x86 / 255)
        default: Color(red: 0xD2 / 255, green: 0x43 / 255, blue: 0x35 / 255)
        }
    }

    private static func mix(_ base: Color, _ tint: Color, amount: Double) -> Color {
        let base = UIColor(base), tint = UIColor(tint)
        var br: CGFloat = 0, bg: CGFloat = 0, bb: CGFloat = 0, ba: CGFloat = 0
        var tr: CGFloat = 0, tg: CGFloat = 0, tb: CGFloat = 0, ta: CGFloat = 0
        guard base.getRed(&br, green: &bg, blue: &bb, alpha: &ba),
              tint.getRed(&tr, green: &tg, blue: &tb, alpha: &ta) else { return Color(tint) }
        return Color(red: Double(br) * (1 - amount) + Double(tr) * amount,
                     green: Double(bg) * (1 - amount) + Double(tg) * amount,
                     blue: Double(bb) * (1 - amount) + Double(tb) * amount)
    }

    static func foreground(for background: Color) -> Color {
        let uiColor = UIColor(background)
        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        var alpha: CGFloat = 0
        guard uiColor.getRed(&red, green: &green, blue: &blue, alpha: &alpha) else { return .white }
        let luminance = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue)
        return luminance > 0.52 ? Color(red: 0.12, green: 0.12, blue: 0.12) : .white
    }

    static var locale: String {
        let storedLocales = defaults.string(forKey: localesKey) ?? ""
        let fallback = defaults.string(forKey: localeKey) ?? Locale.current.identifier
        let candidates = ClockCatalogue.selectedLocales(storedLocales, fallback: fallback)
        return ClockCatalogue.randomLocale(at: .now, from: candidates, defaults: defaults,
                                           safeOnly: defaults.bool(forKey: safeOnlyKey))
    }

    static var appearance: String { defaults.string(forKey: appearanceKey) ?? "system" }
}

// Try the complete quote at readable sizes, then progressively remove context.
// Every candidate retains the complete time phrase, including the final fallback.
struct ReadableQuoteText: View {
    let parts: (before: String, time: String, after: String)
    let fontName: String
    let foreground: Color
    let accent: Color
    let highlight: Bool
    let maximumSize: CGFloat
    let minimumSize: CGFloat
    var alignment: TextAlignment = .leading

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
        let beforeCount = min(parts.before.count, context / 2)
        let afterCount = min(parts.after.count, context - beforeCount)
        let expandedBefore = min(parts.before.count, context - afterCount)
        return ((expandedBefore < parts.before.count ? "…" : "") + String(parts.before.suffix(expandedBefore)),
                parts.time,
                String(parts.after.prefix(afterCount)) + (afterCount < parts.after.count ? "…" : ""))
    }

    private func line(_ value: (before: String, time: String, after: String), size: CGFloat) -> some View {
        (Text(value.before).foregroundColor(foreground) +
         Text(value.time).fontWeight(highlight ? .bold : .regular).foregroundColor(highlight ? accent : foreground) +
         Text(value.after).foregroundColor(foreground))
            .font(ClockSettings.quoteFont(fontName, size: size))
            .lineSpacing(fontName == "specialElite" ? size * 0.18 : 0)
            .multilineTextAlignment(alignment)
            .frame(maxWidth: .infinity, alignment: alignment == .center ? .center : (alignment == .trailing ? .trailing : .leading))
            .fixedSize(horizontal: false, vertical: true)
    }
}
