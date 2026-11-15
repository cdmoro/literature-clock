import SwiftUI
import WidgetKit
import AppIntents
import OSLog

private let widgetLogger = Logger(subsystem: "net.literatureclock.app.widget", category: "Timeline")

struct ClockEntry: TimelineEntry {
    let date: Date
    let locale: String
    let appearance: String
    let font: String
    let palette: String
    let highlight: Bool
    let fuzzy: Bool
    let attribution: String
    let showOriginalAttribution: Bool
    let quote: Quote?
    let isPlaceholder: Bool
}

struct ClockProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> ClockEntry {
        // This synchronous path is used before WidgetKit has a timeline.
        ClockEntry(date: .now, locale: ClockWidgetLanguage.systemDefaults[0].rawValue,
                   appearance: "system", font: "serif", palette: "red", highlight: true,
                   fuzzy: context.family == .systemSmall, attribution: "hidden", showOriginalAttribution: false, quote: nil,
                   isPlaceholder: true)
    }

    func snapshot(for configuration: ClockWidgetConfiguration, in context: Context) async -> ClockEntry {
        let now = Date()
        let locales = configuration.configuredLocales
        let window = ClockCatalogue.window(at: [now], locales: locales)
        return entry(at: now, minuteKey: minuteKeyFormatter.string(from: now),
                     configuration: configuration, family: context.family,
                     locales: locales, window: window)
    }

    func timeline(for configuration: ClockWidgetConfiguration, in context: Context) async -> Timeline<ClockEntry> {
        let settings = configuration.stateIdentity(family: context.family)
        widgetLogger.notice("Timeline requested; configuration: \(settings, privacy: .public)")
        return makeTimeline(at: .now, configuration: configuration, family: context.family)
    }

    func makeTimeline(at now: Date, configuration: ClockWidgetConfiguration, family: WidgetFamily) -> Timeline<ClockEntry> {
        let started = Date()
        let requestID = UUID().uuidString
        let minuteStart = Calendar.current.dateInterval(of: .minute, for: now)?.start ?? now
        let reloadDate = minuteStart.addingTimeInterval(30 * 60)
        widgetLogger.debug("Building timeline \(requestID, privacy: .public); family: \(String(describing: family), privacy: .public); languages: \(configuration.languages.map(\.rawValue).joined(separator: ","), privacy: .public); start: \(minuteStart.timeIntervalSince1970)")
        // Timeline entries don't require launching the extension every minute.
        // Keep an hour ready and request a replacement halfway through, leaving
        // another half hour of entries if WidgetKit defers the budgeted reload.
        let dates = (0...60).map { minuteStart.addingTimeInterval(TimeInterval($0 * 60)) }
        let locales = configuration.configuredLocales
        let window = ClockCatalogue.window(at: dates, locales: locales)
        let formatter = minuteKeyFormatter
        let entries = dates.map { date in
            entry(at: date, minuteKey: formatter.string(from: date), configuration: configuration,
                  family: family, locales: locales, window: window)
        }
        widgetLogger.notice("Timeline ready \(requestID, privacy: .public); entries: \(entries.count); with quotes: \(entries.filter { $0.quote != nil }.count); last: \(entries.last!.date.timeIntervalSince1970); reload after: \(reloadDate.timeIntervalSince1970); seconds: \(Date().timeIntervalSince(started))")
        return Timeline(entries: entries, policy: .after(reloadDate))
    }

    private var minuteKeyFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_GB")
        formatter.dateFormat = "HH_mm"
        return formatter
    }

    private func entry(at date: Date, minuteKey: String, configuration: ClockWidgetConfiguration,
                       family: WidgetFamily, locales: [String], window: [String: [String: [Quote]]]) -> ClockEntry {
        let lookup: (String) -> [Quote] = { window[$0]?[minuteKey] ?? [] }
        let widgetID = configuration.stateIdentity(family: family)
        let locale = ClockCatalogue.randomLocale(at: date, from: locales,
                                                identity: widgetID, safeOnly: configuration.safeOnly, lookup: lookup)
        let allQuotes = lookup(locale)
        let quotes = configuration.safeOnly ? allQuotes.filter(\.sfw) : allQuotes
        let fuzzyMode = family == .systemSmall || configuration.fuzzy
        let phraseQuotes = fuzzyMode
            ? quotes.filter { !$0.timeParts().time.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                && $0.quoteTimeCase.rangeOfCharacter(from: .decimalDigits) == nil }
            : []
        let selectionPool = phraseQuotes.isEmpty ? quotes : phraseQuotes
        // Fuzzy-only modes prefer written-out time phrases. A stable random
        // index keeps the quote fixed for this widget and minute without storing
        // another per-minute preference.
        let index = fuzzyMode
            ? ClockCatalogue.stableRandomIndex(at: date, count: selectionPool.count,
                                               identity: "\(widgetID)|\(locale)")
            : ClockCatalogue.defaultQuoteIndex(at: date, count: selectionPool.count)
        return ClockEntry(date: date, locale: locale,
                          appearance: configuration.appearance.rawValue, font: configuration.font.rawValue,
                          palette: configuration.palette?.rawValue ?? "red",
                          highlight: configuration.highlight, fuzzy: fuzzyMode,
                          attribution: configuration.attribution.rawValue,
                          showOriginalAttribution: configuration.showOriginalAttribution,
                          quote: selectionPool.isEmpty ? nil : selectionPool[index].displayingAttribution(original: configuration.showOriginalAttribution),
                          isPlaceholder: false)
    }
}

private extension ClockWidgetConfiguration {
    var configuredLocales: [String] {
        (languages.isEmpty ? ClockWidgetLanguage.systemDefaults : languages).map(\.rawValue)
    }

    func stateIdentity(family: WidgetFamily) -> String {
        [String(describing: family), appearance.rawValue, font.rawValue, palette?.rawValue ?? "red",
         highlight ? "highlight" : "plain", (family == .systemSmall || fuzzy) ? "fuzzy" : "full",
         safeOnly ? "safe" : "all", attribution.rawValue,
         configuredLocales.sorted().joined(separator: ",")]
            .joined(separator: "|")
    }
}

struct ClockWidgetView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var systemColorScheme
    @Environment(\.redactionReasons) private var redactionReasons
    let entry: ClockEntry

    private var showsSkeleton: Bool { entry.isPlaceholder || redactionReasons.contains(.placeholder) }

    private var colorScheme: ColorScheme {
        switch entry.appearance {
        case "light": .light
        case "dark": .dark
        default: systemColorScheme
        }
    }

    private var isFuzzy: Bool { family == .systemSmall || entry.fuzzy }
    private var isExtraLarge: Bool {
        #if os(iOS)
        if #available(iOS 27.0, *), family == .systemExtraLargePortrait { return true }
        #endif
        return family == .systemExtraLarge
    }
    private var isSpacious: Bool { family == .systemLarge || isExtraLarge }
    private var horizontalPadding: CGFloat {
        if isExtraLarge { return 32 }
        switch family {
        case .systemSmall: return 14
        case .systemLarge: return 24
        default: return 20
        }
    }
    private var maximumQuoteSize: CGFloat {
        isExtraLarge ? 36 : (isSpacious ? 26 : 20)
    }
    private var minimumQuoteSize: CGFloat {
        isExtraLarge ? 26 : (isSpacious ? 20 : 16)
    }
    private var fuzzyQuoteSize: CGFloat {
        isExtraLarge ? 44 : (isSpacious ? 32 : 23)
    }
    private var excerptLimits: (context: Int, lines: Int) {
        if isExtraLarge { return (480, 8) }
        if family == .systemLarge { return (260, 10) }
        return (120, 4)
    }

    private var foregroundColor: Color { ClockSettings.foreground(for: backgroundColor) }
    private var secondaryForegroundColor: Color { foregroundColor.opacity(0.70) }
    @Environment(\.widgetRenderingMode) private var widgetRenderingMode
    private var isMonochromeRendering: Bool {
        widgetRenderingMode == .accented || widgetRenderingMode == .vibrant
    }
    private var backgroundColor: Color {
        ClockSettings.background(for: accentColor, dark: colorScheme == .dark)
    }
    private var accentColor: Color {
        ClockSettings.paletteAccent(entry.palette)
    }

    private var skeleton: some View {
        let lineHeight: CGFloat = isSpacious ? 14 : 10
        return VStack(alignment: .leading, spacing: 8) {
            VStack(alignment: .leading, spacing: isSpacious ? 12 : 8) {
                if family == .systemSmall {
                    skeletonLine(0.72, height: lineHeight, highlighted: true, anchor: .center)
                    skeletonLine(0.5, height: lineHeight, highlighted: true, anchor: .center)
                } else {
                    skeletonLine(0.91, height: lineHeight)
                    HStack(spacing: 5) {
                        skeletonLine(1, height: lineHeight)
                        skeletonLine(1, height: lineHeight, highlighted: true)
                        skeletonLine(0.75, height: lineHeight)
                    }
                    skeletonLine(0.95, height: lineHeight)
                    skeletonLine(0.58, height: lineHeight)
                }
            }
            .frame(maxHeight: .infinity)

            VStack(alignment: .leading, spacing: 4) {
                skeletonLine(family == .systemSmall ? 0.64 : 0.32, height: 6)
                skeletonLine(family == .systemSmall ? 0.46 : 0.22, height: 6)
            }
        }
        .accessibilityHidden(true)
    }

    private func skeletonLine(_ width: CGFloat, height: CGFloat,
                              highlighted: Bool = false, anchor: UnitPoint = .leading) -> some View {
        Capsule()
            .fill(highlighted && !isMonochromeRendering
                  ? accentColor.opacity(0.65) : foregroundColor.opacity(highlighted ? 0.35 : 0.18))
            .frame(height: height)
            .scaleEffect(x: width, y: 1, anchor: anchor)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: isSpacious ? 12 : 8) {
            if showsSkeleton {
                skeleton
            } else if let quote = entry.quote {
                translationText(quote, locale: entry.locale)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            } else {
                Text(ClockCatalogue.timeString(entry.date, locale: entry.locale))
                    .font(ClockSettings.quoteFont(entry.font, size: fuzzyQuoteSize))
                    .foregroundStyle(entry.highlight && !isMonochromeRendering ? accentColor : foregroundColor)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            }
            if !showsSkeleton && entry.quote != nil && entry.attribution != "hidden" {
                HStack(alignment: .bottom, spacing: 8) {
                    if let quote = entry.quote, entry.attribution != "hidden" {
                        VStack(alignment: .leading, spacing: 2) {
                            if entry.attribution == "book-author" {
                                Text(quote.title)
                                    .font(.system(size: isSpacious ? 12 : 10))
                                    .lineLimit(1)
                                    .minimumScaleFactor(1)
                                    .truncationMode(.tail)
                            }
                            Text(quote.author)
                                .font(.system(size: isSpacious ? 12 : 10))
                                .lineLimit(1)
                                .minimumScaleFactor(1)
                                .truncationMode(.tail)
                        }
                        .foregroundStyle(secondaryForegroundColor)
                        .fixedSize(horizontal: false, vertical: true)
                        .layoutPriority(1)
                    }
                    Spacer(minLength: 3)
                }
            }
        }
        .padding(.horizontal, horizontalPadding)
        .padding(.top, horizontalPadding)
        .padding(.bottom, isSpacious ? 20 : (family == .systemSmall ? 12 : 16))
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .foregroundStyle(foregroundColor)
        .widgetURL(showsSkeleton ? nil : entry.quote.flatMap { quoteURL(for: $0) })
        .containerBackground(for: .widget) {
            backgroundColor
        }

    }

    @ViewBuilder
    private func translationText(_ quote: Quote, locale: String) -> some View {
        let parts = quote.timeParts()
        if isFuzzy {
            let time = parts.time.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ? ClockCatalogue.timeString(entry.date, locale: entry.locale) : parts.time
            compactTimeText(time, locale: locale, foreground: foregroundColor,
                            highlight: entry.highlight && !isMonochromeRendering ? accentColor : foregroundColor)
                .font(ClockSettings.quoteFont(entry.font, size: fuzzyQuoteSize))
                .fontWeight(.regular)
                .multilineTextAlignment(.center)
                .lineLimit(family == .systemSmall ? 4 : 3)
                .minimumScaleFactor(family == .systemSmall ? 0.5 : 0.75)
                .frame(maxWidth: .infinity, alignment: .center)
        } else {
            ReadableQuoteText(parts: parts, locale: locale, fontName: entry.font, foreground: foregroundColor,
                              accent: accentColor, highlight: entry.highlight,
                              maximumSize: maximumQuoteSize,
                              minimumSize: minimumQuoteSize,
                              emphasizeHighlight: isMonochromeRendering,
                              alignment: Locale.Language(identifier: locale).characterDirection == .rightToLeft ? .trailing : .leading,
                              excerptLimits: excerptLimits)
        }
    }

    private func quoteURL(for quote: Quote) -> URL? {
        var components = URLComponents()
        components.scheme = "literatureclock"
        components.host = "quote"
        components.queryItems = [
            URLQueryItem(name: "quote", value: quote.id),
            URLQueryItem(name: "attribution", value: entry.attribution),
            URLQueryItem(name: "originalAttribution", value: entry.showOriginalAttribution ? "1" : "0"),
            URLQueryItem(name: "locale", value: entry.locale),
            URLQueryItem(name: "palette", value: entry.palette),
            URLQueryItem(name: "font", value: entry.font),
            URLQueryItem(name: "highlight", value: entry.highlight ? "1" : "0"),
            URLQueryItem(name: "dark", value: colorScheme == .dark ? "1" : "0"),
            URLQueryItem(name: "fuzzy", value: isFuzzy ? "1" : "0")
        ]
        return components.url
    }
}

struct LiteratureClockWidget: Widget {
    let kind = "net.literatureclock.app.configurable-clock"
    private var supportedFamilies: [WidgetFamily] {
        var families: [WidgetFamily] = [.systemSmall, .systemMedium, .systemLarge, .systemExtraLarge]
        #if os(iOS)
        if #available(iOS 27.0, *) { families.append(.systemExtraLargePortrait) }
        #endif
        return families
    }

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ClockWidgetConfiguration.self, provider: ClockProvider()) { entry in
            ClockWidgetView(entry: entry)
        }
            .contentMarginsDisabled()
            .configurationDisplayName("Literature Clock")
            .description("A literary quote for the current time.")
            .supportedFamilies(supportedFamilies)
    }
}

@main
struct LiteratureClockWidgetBundle: WidgetBundle {
    var body: some Widget { LiteratureClockWidget() }
}
