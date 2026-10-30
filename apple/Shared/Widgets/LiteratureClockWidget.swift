import SwiftUI
import WidgetKit
import AppIntents
import OSLog

private let widgetLogger = Logger(subsystem: "net.literatureclock.app.widget", category: "Timeline")

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
        widgetLogger.notice("Snapshot requested; preview: \(context.isPreview)")
        let result = entry(at: .now, configuration: configuration, family: context.family)
        widgetLogger.notice("Snapshot ready; quote available: \(result.quote != nil)")
        return result
    }
    func timeline(for configuration: ClockWidgetConfiguration, in context: Context) async -> Timeline<ClockEntry> {
        widgetLogger.notice("Timeline requested")
        return makeTimeline(at: .now, configuration: configuration, family: context.family)
    }

    func makeTimeline(at now: Date, configuration: ClockWidgetConfiguration, family: WidgetFamily) -> Timeline<ClockEntry> {
        let minuteStart = Calendar.current.dateInterval(of: .minute, for: now)?.start ?? now
        // Timeline entries don't require launching the extension every minute.
        // Keep an hour ready and request a replacement halfway through, leaving
        // another half hour of entries if WidgetKit defers the budgeted reload.
        let entries = (0...60).map { offset in
            entry(at: minuteStart.addingTimeInterval(TimeInterval(offset * 60)),
                  configuration: configuration, family: family)
        }
        widgetLogger.notice("Timeline ready; entries: \(entries.count), with quotes: \(entries.filter { $0.quote != nil }.count)")
        return Timeline(entries: entries, policy: .after(minuteStart.addingTimeInterval(30 * 60)))
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
                          customAccentHex: ClockSettings.validAccentHex(configuration.customAccent ?? "")
                            ?? ClockSettings.defaults.string(forKey: ClockSettings.customAccentKey) ?? "#B36E26",
                          highlight: configuration.highlight, fuzzy: family == .systemSmall || configuration.fuzzy,
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
         palette == .custom ? (customAccent ?? "") : "",
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
                Text("No quote available").foregroundStyle(secondaryForegroundColor)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            }
            if family != .systemSmall {
                HStack(spacing: 8) {
                    if !isFuzzy, let quote = entry.quote, entry.attribution != "hidden" {
                        if entry.attribution == "book-author" {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(quote.title)
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.7)
                                Text(quote.author)
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.7)
                            }
                            .font(.system(size: isSpacious ? 12 : 10))
                            .foregroundStyle(secondaryForegroundColor)
                            .fixedSize(horizontal: false, vertical: true)
                            .layoutPriority(1)
                        } else if entry.attribution == "author" {
                            Text(entry.attribution == "author" ? quote.author : "\(quote.title) · \(quote.author)")
                                .font(.system(size: isSpacious ? 12 : 10))
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
                            .font(.system(size: isSpacious ? 12 : 10))
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
        }
        .padding(.horizontal, horizontalPadding)
        .padding(.top, horizontalPadding)
        .padding(.bottom, isSpacious ? 20 : (family == .systemSmall ? 12 : 16))
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
                    .padding(.horizontal, entry.progressMode == "background" ? 0 : horizontalPadding)
                    .frame(maxWidth: .infinity)
                    .frame(height: 3)
                    .padding(.bottom, 0)
                    .accessibilityLabel("Seconds progress")
                    .allowsHitTesting(false)
            }
        }
    }

    @ViewBuilder
    private func translationText(_ quote: Quote, locale: String) -> some View {
        let parts = quote.timeParts()
        if isFuzzy {
            Text(parts.time)
                .font(ClockSettings.quoteFont(entry.font, size: fuzzyQuoteSize, weight: entry.highlight ? .bold : .regular))
                .foregroundColor(entry.highlight ? accentColor : foregroundColor)
                .multilineTextAlignment(.center)
                .lineLimit(family == .systemSmall ? 4 : 3)
                .minimumScaleFactor(family == .systemSmall ? 0.5 : 0.75)
                .frame(maxWidth: .infinity, alignment: .center)
        } else {
            ReadableQuoteText(parts: parts, fontName: entry.font, foreground: foregroundColor,
                              accent: accentColor, highlight: entry.highlight,
                              maximumSize: maximumQuoteSize,
                              minimumSize: minimumQuoteSize,
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
                // Quotes are bundled public content, including the placeholder entry.
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
