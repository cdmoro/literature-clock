import SwiftUI
import WidgetKit
import AppIntents

enum ClockWidgetAppearance: String, AppEnum {
    case system, light, dark
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Appearance")
    static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [.system: "System", .light: "Light", .dark: "Dark"]
}

enum ClockWidgetFont: String, AppEnum {
    case serif, rounded, monospaced, specialElite
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Quote font")
    static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [.serif: "Serif", .rounded: "Rounded", .monospaced: "Monospaced", .specialElite: "Special Elite"]
}

enum ClockWidgetPalette: String, AppEnum {
    case red, pink, green, orange, purple, blue, gray, custom
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Accent color")
    static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [
        .red: "Red", .pink: "Pink", .green: "Green", .orange: "Orange", .purple: "Purple", .blue: "Blue", .gray: "Gray", .custom: "Custom"
    ]
}

enum ClockWidgetAttribution: String, AppEnum {
    case bookAuthor = "book-author"
    case author
    case hidden
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Attribution")
    static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [
        .bookAuthor: "Show book and author", .author: "Show author only", .hidden: "Hide"
    ]
}

enum ClockWidgetLanguage: String, AppEnum {
    case englishUS = "en-US", englishGB = "en-GB", spanish = "es-ES", french = "fr-FR"
    case german = "de-DE", italian = "it-IT", portuguese = "pt-PT", greek = "el-GR"
    case esperanto = "eo", russian = "ru-RU", chinese = "zh-CN", arabic = "ar-AE"
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Quote languages")
    static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [
        .englishUS: "English (United States)", .englishGB: "English (United Kingdom)",
        .spanish: "Español (España)", .french: "Français (France)", .german: "Deutsch (Deutschland)",
        .italian: "Italiano (Italia)", .portuguese: "Português (Portugal)", .greek: "Ελληνικά (Ελλάδα)",
        .esperanto: "Esperanto", .russian: "Русский (Россия)", .chinese: "中文（中国大陆）",
        .arabic: "العربية (الإمارات العربية المتحدة)"
    ]
}

struct ClockWidgetConfiguration: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Literature Clock Options"
    static var description = IntentDescription("Choose how this Literature Clock widget looks and which quotes it shows.")

    @Parameter(title: "Appearance", default: .system) var appearance: ClockWidgetAppearance
    @Parameter(title: "Quote font", default: .serif) var font: ClockWidgetFont
    @Parameter(title: "Accent color", default: .red) var palette: ClockWidgetPalette
    @Parameter(title: "Custom accent (#RRGGBB)", description: "Leave empty to use the custom accent selected in the app.", default: "") var customAccent: String
    @Parameter(title: "Highlight the time", default: true) var highlight: Bool
    @Parameter(title: "Fuzzy mode", default: false) var fuzzy: Bool
    @Parameter(title: "Safe for work quotes only", default: false) var safeOnly: Bool
    @Parameter(title: "Attribution", default: .bookAuthor) var attribution: ClockWidgetAttribution
    @Parameter(title: "Quote languages", default: [.englishUS])
    var languages: [ClockWidgetLanguage]
    static var parameterSummary: some ParameterSummary {
        Summary("Customize this widget") {
            \.$appearance
            \.$font
            \.$palette
            \.$customAccent
            \.$highlight
            \.$fuzzy
            \.$safeOnly
            \.$attribution
            \.$languages
        }
    }
}

struct ClockEntry: TimelineEntry {
    let date: Date
    let minuteID: Int
    let widgetID: String
    let locale: String
    let appearance: String
    let font: String
    let palette: String
    let customAccentHex: String
    let highlight: Bool
    let fuzzy: Bool
    let safeOnly: Bool
    let attribution: String
    let progressMode: String
    let variantCount: Int
    let quote: Quote?
}

struct ClockProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> ClockEntry {
        entry(at: .now, configuration: ClockWidgetConfiguration(), family: context.family)
    }
    func snapshot(for configuration: ClockWidgetConfiguration, in context: Context) async -> ClockEntry {
        entry(at: .now, configuration: configuration, family: context.family)
    }
    func timeline(for configuration: ClockWidgetConfiguration, in context: Context) async -> Timeline<ClockEntry> {
        let now = Date()
        let minuteStart = Calendar.current.dateInterval(of: .minute, for: now)?.start ?? now
        let entries = (0..<6).compactMap { offset -> ClockEntry? in
            guard let date = Calendar.current.date(byAdding: .minute, value: offset, to: minuteStart) else { return nil }
            return entry(at: date, configuration: configuration, family: context.family)
        }
        return Timeline(entries: entries, policy: .atEnd)
    }

    private func entry(at date: Date, configuration: ClockWidgetConfiguration, family: WidgetFamily) -> ClockEntry {
        let locales = configuration.languages.map(\.rawValue)
        let widgetID = configuration.stateIdentity(family: family)
        let locale = ClockCatalogue.randomLocale(at: date, from: locales, defaults: ClockSettings.defaults,
                                                identity: widgetID, safeOnly: configuration.safeOnly)
        let allQuotes = ClockCatalogue.quotes(at: date, locale: locale)
        let quotes = configuration.safeOnly ? allQuotes.filter(\.sfw) : allQuotes
        let key = ClockCatalogue.quoteIndexKey(at: date, locale: locale, widgetID: widgetID)
        let index = (ClockSettings.defaults.object(forKey: key) as? Int)
            ?? ClockCatalogue.defaultQuoteIndex(at: date, count: quotes.count)
        return ClockEntry(date: date, minuteID: Int(date.timeIntervalSince1970 / 60), widgetID: widgetID, locale: locale,
                          appearance: configuration.appearance.rawValue, font: configuration.font.rawValue,
                          palette: configuration.palette.rawValue,
                          customAccentHex: ClockSettings.validAccentHex(configuration.customAccent)
                            ?? ClockSettings.defaults.string(forKey: ClockSettings.customAccentKey) ?? "#B36E26",
                          highlight: configuration.highlight, fuzzy: configuration.fuzzy,
                          safeOnly: configuration.safeOnly,
                          attribution: configuration.attribution.rawValue,
                          progressMode: ClockSettings.progressMode,
                          variantCount: quotes.count,
                          quote: quotes.isEmpty ? nil : quotes[index % quotes.count])
    }
}

private extension ClockWidgetConfiguration {
    func stateIdentity(family: WidgetFamily) -> String {
        [String(describing: family), appearance.rawValue, font.rawValue, palette.rawValue,
         palette == .custom ? customAccent : "",
         highlight ? "highlight" : "plain", fuzzy ? "fuzzy" : "full",
         safeOnly ? "safe" : "all", attribution.rawValue,
         languages.map(\.rawValue).sorted().joined(separator: ",")]
            .joined(separator: "|")
    }
}

struct ClockWidgetView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var systemColorScheme
    let entry: ClockEntry

    private var colorScheme: ColorScheme {
        switch entry.appearance {
        case "light": .light
        case "dark": .dark
        default: systemColorScheme
        }
    }

    private var foregroundColor: Color { ClockSettings.foreground(for: backgroundColor) }
    private var secondaryForegroundColor: Color { foregroundColor.opacity(0.70) }
    private var backgroundColor: Color {
        ClockSettings.background(for: accentColor, dark: colorScheme == .dark)
    }
    private var accentColor: Color {
        entry.palette == "custom" ? ClockSettings.color(fromHex: entry.customAccentHex) : ClockSettings.paletteAccent(entry.palette)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: family == .systemLarge ? 12 : 8) {
            if let quote = entry.quote {
                translationText(quote, locale: entry.locale)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            } else {
                Text("No quote available").foregroundStyle(secondaryForegroundColor)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            }
            HStack(spacing: 8) {
                if !entry.fuzzy, let quote = entry.quote, entry.attribution != "hidden" {
                    if entry.attribution == "book-author" {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(quote.title)
                                .lineLimit(1)
                                .minimumScaleFactor(0.7)
                            Text(quote.author)
                                .lineLimit(1)
                                .minimumScaleFactor(0.7)
                        }
                        .font(.system(size: family == .systemLarge ? 12 : 10))
                        .foregroundStyle(secondaryForegroundColor)
                        .fixedSize(horizontal: false, vertical: true)
                        .layoutPriority(1)
                    } else if entry.attribution == "author" {
                        Text(entry.attribution == "author" ? quote.author : "\(quote.title) · \(quote.author)")
                            .font(.system(size: family == .systemLarge ? 12 : 10))
                            .foregroundStyle(secondaryForegroundColor)
                            .lineLimit(1)
                            .minimumScaleFactor(0.65)
                            .fixedSize(horizontal: false, vertical: true)
                            .layoutPriority(1)
                    } else {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(quote.title)
                            Text(quote.author)
                        }
                        .font(.system(size: family == .systemLarge ? 12 : 10))
                        .foregroundStyle(secondaryForegroundColor)
                        .lineLimit(1)
                        .minimumScaleFactor(0.65)
                        .fixedSize(horizontal: false, vertical: true)
                        .layoutPriority(1)
                    }
                }
                Spacer(minLength: 3)
                HStack(spacing: 5) {
                    if entry.quote != nil, entry.variantCount > 1 {
                        HStack(spacing: 4) {
                            Button(intent: CycleQuoteIntent(step: -1, widgetID: entry.widgetID, locale: entry.locale, minuteID: entry.minuteID, safeOnly: entry.safeOnly)) {
                                Image(systemName: "chevron.left").font(.system(size: 11, weight: .semibold))
                                    .frame(width: 30, height: 30)
                                    .background(foregroundColor.opacity(0.10), in: Circle())
                                    .foregroundStyle(accentColor)
                            }
                            .accessibilityLabel("Previous quote")
                            .buttonStyle(.plain)
                            Button(intent: CycleQuoteIntent(step: 1, widgetID: entry.widgetID, locale: entry.locale, minuteID: entry.minuteID, safeOnly: entry.safeOnly)) {
                                Image(systemName: "chevron.right").font(.system(size: 11, weight: .semibold))
                                    .frame(width: 30, height: 30)
                                    .background(foregroundColor.opacity(0.10), in: Circle())
                                    .foregroundStyle(accentColor)
                            }
                            .accessibilityLabel("Next quote")
                            .buttonStyle(.plain)
                        }
                        .tint(accentColor)
                        .fixedSize()
                    }
                    if let quote = entry.quote, let url = shareURL(for: quote) {
                        Link(destination: url) {
                            Image(systemName: "square.and.arrow.up")
                                .font(.system(size: 12, weight: .medium))
                                .frame(width: 30, height: 30)
                                .background(foregroundColor.opacity(0.10), in: Circle())
                                .foregroundStyle(accentColor)
                        }
                        .accessibilityLabel("Share quote")
                    }
                }
            }
        }
        .padding(.horizontal, family == .systemLarge ? 24 : 20)
        .padding(.top, family == .systemLarge ? 24 : 20)
        .padding(.bottom, family == .systemLarge ? 20 : 16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .foregroundStyle(foregroundColor)
        .environment(\.colorScheme, colorScheme)
        .widgetURL(entry.quote.flatMap { shareURL(for: $0, action: "quote") })
        .containerBackground(for: .widget) {
            backgroundColor
        }
        .overlay(alignment: .bottom) {
            if entry.progressMode != "hidden" {
                ProgressView(timerInterval: entry.date...entry.date.addingTimeInterval(60),
                             countsDown: false,
                             label: { EmptyView() },
                             currentValueLabel: { EmptyView() })
                    .progressViewStyle(.linear)
                    .tint(entry.progressMode == "background" ? accentColor.opacity(0.24) : accentColor)
                    .padding(.horizontal, entry.progressMode == "background" ? 0 : (family == .systemLarge ? 24 : 20))
                    .frame(maxWidth: .infinity)
                    .frame(height: 3)
                    .padding(.bottom, 0)
                    .accessibilityLabel("Seconds progress")
            }
        }
    }

    @ViewBuilder
    private func translationText(_ quote: Quote, locale: String) -> some View {
        let parts = quote.timeParts()
        if entry.fuzzy {
            Text(parts.time)
                .font(ClockSettings.quoteFont(entry.font, size: family == .systemLarge ? 32 : 23, weight: entry.highlight ? .bold : .regular))
                .foregroundColor(entry.highlight ? accentColor : foregroundColor)
                .multilineTextAlignment(.center)
                .lineLimit(3)
                .minimumScaleFactor(0.75)
                .frame(maxWidth: .infinity, alignment: .center)
        } else {
            ReadableQuoteText(parts: parts, fontName: entry.font, foreground: foregroundColor,
                              accent: accentColor, highlight: entry.highlight,
                              maximumSize: family == .systemLarge ? 26 : 20,
                              minimumSize: family == .systemLarge ? 20 : 16,
                              alignment: Locale.Language(identifier: locale).characterDirection == .rightToLeft ? .trailing : .leading)
        }
    }

    private func shareURL(for quote: Quote, action: String = "share") -> URL? {
        var components = URLComponents()
        components.scheme = "literatureclock"
        components.host = action
        components.queryItems = [
            URLQueryItem(name: "quote", value: quote.id),
            URLQueryItem(name: "attribution", value: entry.attribution),
            URLQueryItem(name: "locale", value: entry.locale),
            URLQueryItem(name: "palette", value: entry.palette),
            URLQueryItem(name: "accent", value: entry.palette == "custom" ? entry.customAccentHex : ""),
            URLQueryItem(name: "font", value: entry.font),
            URLQueryItem(name: "highlight", value: entry.highlight ? "1" : "0"),
            URLQueryItem(name: "dark", value: colorScheme == .dark ? "1" : "0"),
            URLQueryItem(name: "fuzzy", value: entry.fuzzy ? "1" : "0")
        ]
        return components.url
    }
}

struct LiteratureClockWidget: Widget {
    let kind = "LiteratureClockWidget"
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ClockWidgetConfiguration.self, provider: ClockProvider()) { entry in
            ClockWidgetView(entry: entry)
        }
            .contentMarginsDisabled()
            .configurationDisplayName("Literature Clock")
            .description("A literary quote for the current time.")
            .supportedFamilies([.systemMedium, .systemLarge])
    }
}

@main
struct LiteratureClockWidgetBundle: WidgetBundle {
    var body: some Widget { LiteratureClockWidget() }
}
