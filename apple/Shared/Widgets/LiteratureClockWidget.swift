import SwiftUI
import WidgetKit
import AppIntents
import OSLog

private let widgetLogger = Logger(subsystem: "net.literatureclock.app.widget", category: "Timeline")

private func configuredLocales(_ languages: [ClockWidgetLanguage]) -> [String] {
    let selected = languages.map(\.rawValue)
    guard selected == ["en-US"] else { return selected.isEmpty ? ClockWidgetLanguage.systemDefaults.map(\.rawValue) : selected }
    return ClockWidgetLanguage.systemDefaults.map(\.rawValue)
}

private func appDefaultedConfiguration(_ configuration: ClockWidgetConfiguration) -> ClockWidgetConfiguration {
    let result = configuration
    let defaults = ClockSettings.defaults
    // AppIntent requires literal parameter defaults. Resolve app preferences
    // here, while retaining every non-default value explicitly chosen by the user.
    if configuration.appearance == .system,
       let value = defaults.string(forKey: ClockSettings.appearanceKey),
       let appearance = ClockWidgetAppearance(rawValue: value) {
        result.appearance = appearance
    }
    if configuration.font == .serif,
       let value = defaults.string(forKey: ClockSettings.fontKey),
       let font = ClockWidgetFont(rawValue: value) {
        result.font = font
    }
    if configuration.highlight == true,
       let value = defaults.object(forKey: ClockSettings.highlightKey) as? Bool {
        result.highlight = value
    }
    if configuration.attribution == .bookAuthor,
       let value = defaults.string(forKey: ClockSettings.attributionKey),
       let attribution = ClockWidgetAttribution(rawValue: value) {
        result.attribution = attribution
    }
    if configuration.languages.map(\.rawValue) == ["en-US"] {
        result.languages = ClockWidgetLanguage.systemDefaults
    }
    return result
}

struct ClockEntry: TimelineEntry {
    let date: Date
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
    let quote: Quote?
}

struct ClockProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> ClockEntry {
        // WidgetKit may request this synchronously while registering/editing.
        // Keep this synchronous path independent of AppIntents and shared storage.
        // The asynchronous snapshot below applies app preferences to gallery previews.
        let sampleQuote: Quote
        if context.family == .systemSmall {
            sampleQuote = Quote(id: "placeholder", quoteTimeCase: "just after\nhalf past four",
                                quoteFirst: "", quoteLast: "", title: "The Book Title",
                                author: "Author Name", sfw: true)
        } else if context.family == .systemExtraLarge {
            sampleQuote = Quote(id: "placeholder", quoteTimeCase: "and invites us to read slowly, noticing each word",
                                quoteFirst: "A passage from a novel lingers in the mind\n",
                                quoteLast: "\nA small detail can change everything.",
                                title: "The Book Title", author: "Author Name", sfw: true)
        } else {
            sampleQuote = Quote(id: "placeholder", quoteTimeCase: "quarter past three",
                                quoteFirst: "A passage from a novel, ",
                                quoteLast: " and its surrounding words.",
                                title: "The Book Title", author: "Author Name", sfw: true)
        }
        return ClockEntry(date: .now, widgetID: "placeholder", locale: "en-US",
                   appearance: "system", font: "serif", palette: "gray",
                   customAccentHex: "#B36E26",
                   highlight: true, fuzzy: context.family == .systemSmall, safeOnly: false,
                   attribution: "book-author",
                   quote: sampleQuote)
    }
    func snapshot(for configuration: ClockWidgetConfiguration, in context: Context) async -> ClockEntry {
        widgetLogger.notice("Snapshot requested; preview: \(context.isPreview), family: \(String(describing: context.family), privacy: .public)")
        let configuration = appDefaultedConfiguration(configuration)
        ClockSettings.recordWidgetSharingProbe(selection: configuration.palette.rawValue,
                                              appliedPalette: configuration.resolvedPalette.rawValue)
        let now = Date()
        // Widget galleries request a snapshot and expect it to contain useful
        // content immediately. Apply the same default-language expansion used
        // by timelines, including when WidgetKit supplies the intent default.
        let locales = configuredLocales(configuration.languages)
        let window = ClockCatalogue.window(at: [now], locales: locales)
        let result = entry(at: now, minuteKey: minuteKeyFormatter.string(from: now),
                           configuration: configuration, family: context.family,
                           widgetID: configuration.stateIdentity(family: context.family),
                           customAccentValue: ClockSettings.defaults.string(forKey: ClockSettings.customAccentKey) ?? "#B36E26",
                           window: window)
        widgetLogger.notice("Snapshot ready; family: \(String(describing: context.family), privacy: .public), quote available: \(result.quote != nil), palette: \(result.palette, privacy: .public)")
        return result
    }
    func timeline(for configuration: ClockWidgetConfiguration, in context: Context) async -> Timeline<ClockEntry> {
        widgetLogger.notice("Timeline requested; family: \(String(describing: context.family), privacy: .public)")
        return makeTimeline(at: .now, configuration: configuration, family: context.family)
    }

    func makeTimeline(at now: Date, configuration: ClockWidgetConfiguration, family: WidgetFamily) -> Timeline<ClockEntry> {
        let storedPalette = ClockSettings.defaults.string(forKey: ClockSettings.paletteKey) ?? "unset"
        let sharedContainerAvailable = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: ClockSettings.appGroup) != nil
        let configuration = appDefaultedConfiguration(configuration)
        ClockSettings.recordWidgetSharingProbe(selection: configuration.palette.rawValue,
                                              appliedPalette: configuration.resolvedPalette.rawValue)
        widgetLogger.notice("Widget preferences: stored palette=\(storedPalette, privacy: .public), resolved palette=\(configuration.resolvedPalette.rawValue, privacy: .public), shared container available=\(sharedContainerAvailable)")
        let started = Date()
        let requestID = UUID().uuidString
        let minuteStart = Calendar.current.dateInterval(of: .minute, for: now)?.start ?? now
        let reloadDate = minuteStart.addingTimeInterval(30 * 60)
        widgetLogger.debug("Building timeline \(requestID, privacy: .public); family: \(String(describing: family), privacy: .public); languages: \(configuration.languages.map(\.rawValue).joined(separator: ","), privacy: .public); start: \(minuteStart.timeIntervalSince1970)")
        // Timeline entries don't require launching the extension every minute.
        // Keep an hour ready and request a replacement halfway through, leaving
        // another half hour of entries if WidgetKit defers the budgeted reload.
        let dates = (0...60).map { minuteStart.addingTimeInterval(TimeInterval($0 * 60)) }
        let locales = configuredLocales(configuration.languages)
        let window = ClockCatalogue.window(at: dates, locales: locales)
        let widgetID = configuration.stateIdentity(family: family)
        let customAccentValue = ClockSettings.defaults.string(forKey: ClockSettings.customAccentKey) ?? "#B36E26"
        let formatter = minuteKeyFormatter
        let entries = dates.map { date in
            entry(at: date, minuteKey: formatter.string(from: date), configuration: configuration,
                  family: family, widgetID: widgetID, customAccentValue: customAccentValue, window: window)
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
                       family: WidgetFamily, widgetID: String, customAccentValue: String,
                       window: [String: [String: [Quote]]]? = nil) -> ClockEntry {
        let locales = configuration.languages.map(\.rawValue)
        let lookup: (String) -> [Quote] = { locale in
            if let window { return window[locale]?[minuteKey] ?? [] }
            return ClockCatalogue.quotes(at: date, locale: locale)
        }
        let locale = ClockCatalogue.randomLocale(at: date, from: locales,
                                                identity: widgetID, safeOnly: configuration.safeOnly, lookup: lookup)
        let allQuotes = lookup(locale)
        let quotes = configuration.safeOnly ? allQuotes.filter(\.sfw) : allQuotes
        let displayedQuotes = quotes.isEmpty ? [ClockCatalogue.fallbackQuote(at: date, locale: locale)] : quotes
        let fuzzyMode = family == .systemSmall || configuration.fuzzy
        let phraseQuotes = fuzzyMode
            ? displayedQuotes.filter { $0.quoteTimeCase.rangeOfCharacter(from: .decimalDigits) == nil }
            : []
        let selectionPool = phraseQuotes.isEmpty ? displayedQuotes : phraseQuotes
        // Fuzzy-only modes prefer written-out time phrases. A stable random
        // index keeps the quote fixed for this widget and minute without storing
        // another per-minute preference.
        let index = fuzzyMode
            ? ClockCatalogue.stableRandomIndex(at: date, count: selectionPool.count,
                                               identity: "\(widgetID)|\(locale)")
            : ClockCatalogue.defaultQuoteIndex(at: date, count: selectionPool.count)
        return ClockEntry(date: date, widgetID: widgetID, locale: locale,
                          appearance: configuration.appearance.rawValue, font: configuration.font.rawValue,
                          palette: configuration.resolvedPalette.rawValue,
                          customAccentHex: ClockSettings.validAccentHex(customAccentValue) ?? "#B36E26",
                          highlight: configuration.highlight, fuzzy: fuzzyMode,
                          safeOnly: configuration.safeOnly,
                          attribution: configuration.attribution.rawValue,
                          quote: selectionPool[index % selectionPool.count])
    }
}

private extension ClockWidgetConfiguration {
    func stateIdentity(family: WidgetFamily) -> String {
        [String(describing: family), appearance.rawValue, font.rawValue, resolvedPalette.rawValue,
         resolvedPalette == .custom
            ? (ClockSettings.defaults.string(forKey: ClockSettings.customAccentKey) ?? "") : "",
         highlight ? "highlight" : "plain", (family == .systemSmall || fuzzy) ? "fuzzy" : "full",
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
        entry.palette == "custom" ? ClockSettings.color(fromHex: entry.customAccentHex) : ClockSettings.paletteAccent(entry.palette)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: isSpacious ? 12 : 8) {
            if let quote = entry.quote {
                translationText(quote, locale: entry.locale)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            } else {
                Text(entry.widgetID == "placeholder" ? "…" : String(localized: "app_no_quote"))
                    .foregroundStyle(secondaryForegroundColor)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            }
            if entry.quote != nil && entry.attribution != "hidden" {
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
        .environment(\.colorScheme, colorScheme)
        .containerBackground(for: .widget) {
            backgroundColor
        }

    }

    @ViewBuilder
    private func translationText(_ quote: Quote, locale: String) -> some View {
        let parts = quote.timeParts()
        if isFuzzy {
            Text(parts.time)
                .font(ClockSettings.quoteFont(entry.font, size: fuzzyQuoteSize))
                .fontWeight(.regular)
                .foregroundColor(entry.highlight ? accentColor : foregroundColor)
                .widgetAccentable(false)
                .widgetURL(entry.widgetID == "placeholder" ? nil : entry.quote.flatMap { quoteURL(for: $0) })
                .multilineTextAlignment(.center)
                .lineLimit(family == .systemSmall ? 4 : 3)
                .minimumScaleFactor(family == .systemSmall ? 0.5 : 0.75)
                .frame(maxWidth: entry.widgetID == "placeholder" && family == .systemSmall ? 120 : .infinity,
                       alignment: .center)
        } else {
            ReadableQuoteText(parts: parts, fontName: entry.font, foreground: foregroundColor,
                              accent: accentColor, highlight: entry.highlight,
                              maximumSize: maximumQuoteSize,
                              minimumSize: minimumQuoteSize,
                              emphasizeHighlight: isMonochromeRendering,
                              alignment: Locale.Language(identifier: locale).characterDirection == .rightToLeft ? .trailing : .leading)
                .widgetURL(quoteURL(for: quote))
        }
    }

    private func quoteURL(for quote: Quote) -> URL? {
        guard entry.widgetID != "placeholder" else { return nil }
        var components = URLComponents()
        components.scheme = "literatureclock"
        components.host = "quote"
        components.queryItems = [
            URLQueryItem(name: "quote", value: quote.id),
            URLQueryItem(name: "attribution", value: entry.attribution),
            URLQueryItem(name: "locale", value: entry.locale),
            URLQueryItem(name: "palette", value: entry.palette),
            URLQueryItem(name: "accent", value: entry.palette == "custom" ? entry.customAccentHex : ""),
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
                .unredacted()
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
