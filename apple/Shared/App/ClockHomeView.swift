import SwiftUI
#if os(macOS)
import AppKit
#else
import UIKit
#endif
import WidgetKit

struct ClockHomeView: View {
    @Environment(\.colorScheme) private var systemColorScheme
    @Environment(\.locale) private var interfaceLocale
    @AppStorage(ClockSettings.localeKey, store: ClockSettings.defaults) private var quoteLocale = "en-US"
    @AppStorage(ClockSettings.localesKey, store: ClockSettings.defaults) private var languageSelection = ""
    @AppStorage(ClockSettings.appearanceKey, store: ClockSettings.defaults) private var appearance = "system"
    @AppStorage(ClockSettings.fontKey, store: ClockSettings.defaults) private var quoteFont = "serif"
    @AppStorage(ClockSettings.paletteKey, store: ClockSettings.defaults) private var palette = "red"
    @AppStorage(ClockSettings.customAccentKey, store: ClockSettings.defaults) private var customAccentHex = "#B36E26"
    @AppStorage(ClockSettings.highlightKey, store: ClockSettings.defaults) private var highlight = true
    @AppStorage(ClockSettings.fuzzyKey, store: ClockSettings.defaults) private var fuzzy = false
    @AppStorage(ClockSettings.safeOnlyKey, store: ClockSettings.defaults) private var safeOnly = false
    @AppStorage(ClockSettings.attributionKey, store: ClockSettings.defaults) private var attribution = "book-author"
    @AppStorage(ClockSettings.quoteRevisionKey, store: ClockSettings.defaults) private var quoteRevision = 0
    @AppStorage(ClockSettings.progressKey, store: ClockSettings.defaults) private var progressMode = "bottom"
    @State private var pausedQuoteDate: Date?
    @State private var presentedSheet: ClockSheet?
    @State private var pendingSheet: ClockSheet?
    @StateObject private var quoteLibrary = QuoteLibrary.shared
    @State private var libraryPresented = false

    private var isDark: Bool { appearance == "dark" || (appearance == "system" && systemColorScheme == .dark) }
    private var selectedLocales: [String] { ClockCatalogue.selectedLocales(languageSelection, fallback: quoteLocale) }
    private var background: Color {
        palette == "custom"
            ? ClockSettings.background(for: accent, dark: isDark)
            : ClockSettings.paletteBackground(palette, dark: isDark)
    }
    private var accent: Color {
        palette == "custom" ? ClockSettings.color(fromHex: customAccentHex) : ClockSettings.paletteAccent(palette)
    }
    private var foreground: Color { ClockSettings.foreground(for: background) }
    private var visibleAttribution: String { appAttributionMode(attribution) }
    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { timeline in
            let _ = quoteRevision
            let quoteDate = pausedQuoteDate ?? timeline.date
            let primaryLocale = ClockCatalogue.randomLocale(at: quoteDate, from: selectedLocales,
                safeOnly: safeOnly)
            let allQuotes = ClockCatalogue.quotes(at: quoteDate, locale: primaryLocale)
            let quotes = safeOnly ? allQuotes.filter(\.sfw) : allQuotes
            let phraseQuotes = fuzzy
                ? quotes.filter { $0.quoteTimeCase.rangeOfCharacter(from: .decimalDigits) == nil }
                : []
            let selectionPool = phraseQuotes.isEmpty ? quotes : phraseQuotes
            let quoteIndex = ClockCatalogue.quoteIndex(at: quoteDate, locale: primaryLocale,
                count: selectionPool.count, defaults: ClockSettings.defaults, fuzzy: fuzzy)
            let quote: Quote? = selectionPool.isEmpty
                ? ClockCatalogue.fallbackQuote(at: quoteDate, locale: primaryLocale)
                : selectionPool[quoteIndex]
            let displayedQuoteCount = max(selectionPool.count, 1)
            let quoteDirection: LayoutDirection = Locale.Language(identifier: primaryLocale).characterDirection == .rightToLeft ? .rightToLeft : .leftToRight
            NavigationStack {
                VStack(spacing: 16) {
                    if let quote {
                        GeometryReader { geometry in
                            let quoteSize = min(44, max(28, geometry.size.width / 28))
                            VStack(alignment: quoteDirection == .rightToLeft ? .trailing : .leading, spacing: 12) {
                                quoteView(quote, maximumSize: quoteSize)
                                if !fuzzy {
                                    attributionView(quote, size: quoteSize * 0.72)
                                        .foregroundStyle(foreground.opacity(0.68))
                                        .lineLimit(1)
                                        .minimumScaleFactor(0.75)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                            }
                            .padding(.horizontal, 36)
                            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                        .environment(\.layoutDirection, quoteDirection)
                    } else {
                        ContentUnavailableView("No quote for this minute", systemImage: "text.quote")
                            .frame(maxHeight: .infinity)
                    }
                    HStack(spacing: 0) {
                        HStack(spacing: 12) {
                            Button { pausedQuoteDate = pausedQuoteDate == nil ? timeline.date : nil } label: {
                                Image(systemName: pausedQuoteDate == nil ? "pause.fill" : "play.fill")
                                    .frame(width: 44, height: 44)
                                    .foregroundStyle(foreground)
                            }
                            .buttonStyle(.plain)
                            .disabled(quote == nil)
                            .accessibilityLabel(QuoteLibraryText.value(pausedQuoteDate == nil ? "pause" : "resume", locale: interfaceLocale.identifier))
                            .help(QuoteLibraryText.value(pausedQuoteDate == nil ? "pause" : "resume", locale: interfaceLocale.identifier))
                            if let quote, quote.id != "F-001" {
                                let quoteTime = ClockCatalogue.timeString(quoteDate, locale: primaryLocale)
                                let favorite = quoteLibrary.isFavorite(quote, locale: primaryLocale, time: quoteTime)
                                Button {
                                    quoteLibrary.toggle(quote, locale: primaryLocale, time: quoteTime)
                                } label: {
                                    Image(systemName: favorite ? "heart.fill" : "heart")
                                        .frame(width: 44, height: 44)
                                }
                                .buttonStyle(.plain)
                                .foregroundStyle(favorite ? accent : foreground)
                                .accessibilityLabel(QuoteLibraryText.value(favorite ? "removeFavorite" : "saveFavorite", locale: interfaceLocale.identifier))
                                .help(QuoteLibraryText.value(favorite ? "removeFavorite" : "saveFavorite", locale: interfaceLocale.identifier))
                            }
                            Button { libraryPresented = true } label: {
                                Image(systemName: "books.vertical")
                                    .frame(width: 44, height: 44)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel(QuoteLibraryText.value("myQuotes", locale: interfaceLocale.identifier))
                            .help(QuoteLibraryText.value("myQuotes", locale: interfaceLocale.identifier))
                            if let quote {
                                Button {
                                    presentShareOptions(quote, locale: primaryLocale, palette: palette,
                                                       accentHex: palette == "custom" ? customAccentHex : "",
                                                       font: quoteFont, highlight: highlight, dark: isDark, fuzzy: fuzzy,
                                                       attribution: visibleAttribution)
                                } label: {
                                    Image(systemName: "square.and.arrow.up")
                                        .frame(width: 44, height: 44)
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel(Text("app_share_accessibility"))
                                .help(Text("app_share_accessibility"))
                            }
                            NavigationLink(destination: SettingsView()) {
                                Image(systemName: "gearshape")
                                    .frame(width: 44, height: 44)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel(Text("app_settings"))
                            .help(Text("app_settings"))
                        }
                        .font(.system(size: 22, weight: .regular))
                        Spacer(minLength: 4)
                        if quote != nil {
                            quoteNavigationButtons(count: displayedQuoteCount, index: quoteIndex,
                                                   date: quoteDate, locale: primaryLocale, fuzzy: fuzzy)
                        }
                    }
                    #if os(macOS)
                    .padding(.bottom, 14)
                    #endif
                    #if os(iOS)
                    Text("app_help_add_widget")
                        .font(.footnote)
                        .foregroundStyle(foreground.opacity(0.6))
                        .multilineTextAlignment(.center)
                        .lineSpacing(3)
                        .frame(maxWidth: 280)
                        .frame(maxWidth: .infinity)
                        .fixedSize(horizontal: false, vertical: true)
                    #endif
                }
                .padding(.horizontal, 24)
                .padding(.top, 24)
                .foregroundStyle(foreground)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .overlay(alignment: .bottom) {
                    secondsProgressIndicator
                }
                .overlay(alignment: quoteDirection == .rightToLeft ? .bottomTrailing : .bottomLeading) {
                    if fuzzy, let quote {
                        attributionView(quote)
                            .padding(.horizontal, 24)
                            .padding(.bottom, 76)
                            .environment(\.layoutDirection, quoteDirection)
                    }
                }
                .background { clockBackground }
                .overlay(alignment: .top) {
                    if pausedQuoteDate != nil {
                        pausedStatusBanner(date: quoteDate)
                    }
                }
                .navigationTitle("Literature Clock")
                .clockNavigationAppearance(background: background, dark: isDark)
                .toolbar {
                    // Share and Settings are available in the bottom action bar.
                }
            }
            .onChange(of: quote.map { "\(primaryLocale)/\($0.id)" }, initial: true) { _, _ in
                if let quote {
                    if quote.id != "F-001" {
                        quoteLibrary.record(quote, locale: primaryLocale,
                                            time: ClockCatalogue.timeString(quoteDate, locale: primaryLocale))
                    }
                }
            }
        }
        .onOpenURL(perform: handleShareURL)
        .sheet(isPresented: $libraryPresented) {
            QuoteLibraryView(library: quoteLibrary, locale: interfaceLocale.identifier,
                             palette: palette, accentHex: palette == "custom" ? customAccentHex : "",
                             font: quoteFont, highlight: highlight, dark: isDark, attribution: visibleAttribution)
        }
        .sheet(item: $presentedSheet, onDismiss: presentPendingSheet) { sheet in
            switch sheet {
            case .quote(let destination), .share(let destination):
                QuoteShareOptions(destination: destination)
            }
        }
        .preferredColorScheme(appearance == "system" ? nil : (appearance == "dark" ? .dark : .light))
    }

    @ViewBuilder
    private func quoteView(_ quote: Quote, maximumSize: CGFloat = 28) -> some View {
        let parts = quote.timeParts()
        if fuzzy {
            Text(parts.time)
                .font(ClockSettings.quoteFont(quoteFont, size: 34))
                .foregroundColor(highlight ? accent : foreground)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, alignment: .center)
        } else {
            ReadableQuoteText(parts: parts, fontName: quoteFont, foreground: foreground,
                              accent: accent, highlight: highlight, maximumSize: maximumSize,
                              minimumSize: 22)
        }
    }

    @ViewBuilder
    private func attributionView(_ quote: Quote, size: CGFloat = 21) -> some View {
        if fuzzy {
            VStack(alignment: .leading, spacing: 2) {
                if visibleAttribution == "book-author", !quote.title.isEmpty {
                    Text(quote.title).italic()
                }
                if !quote.author.isEmpty {
                    Text(quote.author)
                }
            }
            .font(.system(size: 13))
            .foregroundStyle(foreground.opacity(0.68))
            .lineLimit(1)
            .minimumScaleFactor(0.75)
            .frame(maxWidth: .infinity, alignment: .leading)
        } else if let credit = quoteAttributionText(quote, mode: visibleAttribution) {
            credit
                .font(ClockSettings.quoteFont(quoteFont, size: size))
                .foregroundStyle(foreground.opacity(0.68))
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    @ViewBuilder
    private var secondsProgressIndicator: some View {
        let mode = progressMode
        if mode != "hidden" {
            TimelineView(.animation(minimumInterval: 1.0 / 30)) { frame in
                let progressDate = pausedQuoteDate ?? frame.date
                let minuteStart = ClockCatalogue.minuteInterval(at: progressDate).lowerBound
                let progress = progressDate.timeIntervalSince(minuteStart) / 60
                SecondsProgressBar(progress: progress, accent: accent)
            }
        }
    }

    @ViewBuilder
    private var clockBackground: some View {
        background
        .ignoresSafeArea()
    }

    private func pausedStatusBanner(date: Date) -> some View {
        let time = ClockCatalogue.timeString(date, locale: interfaceLocale.identifier)
        return HStack(spacing: 12) {
            Text("\(QuoteLibraryText.value("pausedAt", locale: interfaceLocale.identifier)) \(time)")
                .font(.caption.weight(.medium))
                .monospacedDigit()
            Spacer(minLength: 4)
            Button(QuoteLibraryText.value("resume", locale: interfaceLocale.identifier)) {
                pausedQuoteDate = nil
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(accent.opacity(0.55), lineWidth: 1))
        .padding(.horizontal, 16)
        .padding(.top, 10)
    }

    private func quoteNavigationButtons(count: Int, index: Int, date: Date, locale: String,
                                        fuzzy: Bool) -> some View {
        HStack(spacing: 5) {
            Button {
                cycleQuote(step: -1, date: date, locale: locale, count: count, index: index, fuzzy: fuzzy)
            } label: {
                    Image(systemName: "chevron.left").font(.system(size: 16, weight: .bold))
                    .frame(width: 40, height: 40)
                    .background(accent.opacity(0.14), in: Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(Text("app_previous_quote"))
            .help(Text("app_previous_quote"))
            .disabled(count < 2)
            Text("\(index + 1)/\(count)")
                .font(.body.monospacedDigit())
                .foregroundStyle(foreground.opacity(0.72))
                .frame(minWidth: 32)
                .accessibilityLabel(Text("\(index + 1)/\(count)"))
            Button {
                cycleQuote(step: 1, date: date, locale: locale, count: count, index: index, fuzzy: fuzzy)
            } label: {
                Image(systemName: "chevron.right").font(.system(size: 16, weight: .bold))
                    .frame(width: 40, height: 40)
                    .background(accent.opacity(0.14), in: Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(Text("app_next_quote"))
            .help(Text("app_next_quote"))
            .disabled(count < 2)
        }
        .tint(accent)
    }

    private func cycleQuote(step: Int, date: Date, locale: String, count: Int, index: Int, fuzzy: Bool) {
        guard count > 1 else { return }
        let next = (index + step + count) % count
        ClockSettings.defaults.set(next, forKey: ClockCatalogue.quoteIndexKey(at: date, locale: locale, fuzzy: fuzzy))
        quoteRevision += 1
    }

    private func handleShareURL(_ url: URL) {
        guard url.scheme == "literatureclock", ["share", "quote"].contains(url.host ?? ""),
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let quoteID = components.queryItems?.first(where: { $0.name == "quote" })?.value,
              let locale = components.queryItems?.first(where: { $0.name == "locale" })?.value,
              let quote = ClockCatalogue.quote(id: quoteID, locale: locale) else { return }
        let values = Dictionary((components.queryItems ?? []).compactMap { item in
            item.value.map { (item.name, $0) }
        }, uniquingKeysWith: { first, _ in first })
        if url.host == "quote" {
            presentSheet(.quote(WidgetQuoteDestination(quote: quote, locale: locale, values: values)))
            return
        }
        presentShareOptions(quote, locale: locale, palette: values["palette"] ?? "red",
                           accentHex: values["accent"] ?? "", font: values["font"] ?? "serif",
                           highlight: values["highlight"] != "0", dark: values["dark"] == "1",
                           fuzzy: values["fuzzy"] == "1",
                           attribution: appAttributionMode(values["attribution"] ?? "book-author"))
    }

    private func presentShareOptions(_ quote: Quote, locale: String, palette: String,
                                     accentHex: String, font: String, highlight: Bool,
                                     dark: Bool, fuzzy: Bool, attribution: String) {
        // Present the quote and its style atomically. Separate @State values can
        // leave the sheet capturing the previous widget's appearance.
        libraryPresented = false
        presentSheet(.share(WidgetQuoteDestination(quote: quote, locale: locale, values: [
            "palette": palette, "accent": accentHex, "font": font,
            "highlight": highlight ? "1" : "0", "dark": dark ? "1" : "0",
            "fuzzy": fuzzy ? "1" : "0", "attribution": attribution
        ])))
    }

    private func presentSheet(_ sheet: ClockSheet) {
        guard presentedSheet?.id != sheet.id else { return }
        if presentedSheet == nil, pendingSheet == nil {
            presentedSheet = sheet
        } else {
            // Wait for the active presentation to dismiss before opening a deep link.
            pendingSheet = sheet
            presentedSheet = nil
        }
    }

    private func presentPendingSheet() {
        guard let next = pendingSheet else { return }
        pendingSheet = nil
        presentedSheet = next
    }

}

private struct QuoteLibraryView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var library: QuoteLibrary
    let locale: String
    let palette: String
    let accentHex: String
    let font: String
    let highlight: Bool
    let dark: Bool
    let attribution: String
    @State private var selectedQuote: SavedQuote?
    @State private var showingRecent = false
    @State private var searchText = ""

    private var items: [SavedQuote] { showingRecent ? library.recent : library.favorites }
    private var searchQuery: String { searchText.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var filteredItems: [SavedQuote] {
        guard !searchQuery.isEmpty else { return items }
        return items.filter { item in
            let itemLocale = Locale(identifier: item.locale)
            let language = ClockCatalogue.languageName(item.locale)
            let searchableText = [
                item.quote.text(for: itemLocale), item.quote.title, item.quote.author,
                item.time, language, item.locale
            ].joined(separator: " ")
            return searchableText.range(of: searchQuery, options: [.caseInsensitive, .diacriticInsensitive]) != nil
        }
    }

    private var searchField: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)
            TextField(QuoteLibraryText.value("app_search_quotes", locale: locale), text: $searchText)
                .textFieldStyle(.plain)
                .accessibilityLabel(Text(QuoteLibraryText.value("app_search_quotes", locale: locale)))
            if !searchText.isEmpty {
                Button {
                    searchText = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(Text(QuoteLibraryText.value("app_clear_search", locale: locale)))
            }
        }
        .padding(.horizontal, 10)
        .frame(height: 36)
        .background(.quaternary.opacity(0.35), in: RoundedRectangle(cornerRadius: 10))
        .padding(.horizontal, 20)
        .padding(.bottom, 12)
    }

    private var libraryTabs: some View {
        HStack(spacing: 2) {
            ForEach([false, true], id: \.self) { recent in
                let isSelected = showingRecent == recent
                let title = QuoteLibraryText.value(recent ? "history" : "favorites", locale: locale)
                Button {
                    showingRecent = recent
                } label: {
                    Text(title)
                        .font(.system(size: 13, weight: .medium))
                        .frame(maxWidth: .infinity, minHeight: 30)
                        .foregroundStyle(isSelected ? Color.white : Color.primary.opacity(0.78))
                        .background(isSelected ? Color.accentColor : Color.clear,
                                    in: RoundedRectangle(cornerRadius: 7))
                        .contentShape(RoundedRectangle(cornerRadius: 7))
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(isSelected ? .isSelected : [])
            }
        }
        .padding(3)
        .frame(width: 160)
        .background(Color.primary.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
        .accessibilityElement(children: .contain)
        .accessibilityLabel(Text(QuoteLibraryText.value("myQuotes", locale: locale)))
        .accessibilityValue(Text(QuoteLibraryText.value(showingRecent ? "history" : "favorites", locale: locale)))
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Text(QuoteLibraryText.value("myQuotes", locale: locale))
                    .font(.title2.weight(.bold))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 20)
                    .padding(.top, 16)
                libraryTabs
                    .padding(20)
                searchField
                if filteredItems.isEmpty {
                    if searchQuery.isEmpty {
                        ContentUnavailableView(
                            QuoteLibraryText.value(showingRecent ? "noHistory" : "noFavorites", locale: locale),
                            systemImage: showingRecent ? "clock" : "heart",
                            description: Text("")
                        )
                    } else {
                        ContentUnavailableView.search(text: searchQuery)
                    }
                    Spacer()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(filteredItems) { item in
                                HStack(alignment: .top, spacing: 16) {
                                    Button { selectedQuote = item } label: {
                                        VStack(alignment: .leading, spacing: 10) {
                                            HStack {
                                                Text(item.time).monospacedDigit()
                                                Spacer()
                                                Text(ClockCatalogue.languageName(item.locale))
                                            }
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                            Text(item.quote.text(for: Locale(identifier: item.locale)))
                                                .font(.system(.body, design: .serif))
                                                .lineSpacing(4)
                                                .lineLimit(4)
                                                .foregroundStyle(.primary)
                                            VStack(alignment: .leading, spacing: 3) {
                                                Text(item.quote.title).font(.subheadline).italic()
                                                Text(item.quote.author).font(.caption)
                                            }
                                            .foregroundStyle(.secondary)
                                        }
                                        .multilineTextAlignment(.leading)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .contentShape(Rectangle())
                                        .environment(\.locale, Locale(identifier: item.locale))
                                        .environment(\.layoutDirection, Locale.Language(identifier: item.locale).characterDirection == .rightToLeft ? .rightToLeft : .leftToRight)
                                    }
                                    .buttonStyle(.plain)
                                    .help(QuoteLibraryText.value("openQuote", locale: locale))

                                    let favorite = library.isFavorite(item.quote, locale: item.locale, time: item.time)
                                    Button {
                                        library.toggle(item.quote, locale: item.locale, time: item.time)
                                    } label: {
                                        Image(systemName: showingRecent ? (favorite ? "heart.fill" : "heart") : "trash")
                                            .font(.system(size: 17))
                                            .foregroundStyle(showingRecent && favorite ? Color.pink : Color.secondary)
                                            .frame(width: 32, height: 32)
                                            .contentShape(Rectangle())
                                    }
                                    .buttonStyle(.plain)
                                    .accessibilityLabel(QuoteLibraryText.value(showingRecent && !favorite ? "saveFavorite" : "removeFavorite", locale: locale))
                                    .help(QuoteLibraryText.value(showingRecent && !favorite ? "saveFavorite" : "removeFavorite", locale: locale))
                                }
                                .padding(16)
                                .background(.quaternary.opacity(0.35), in: RoundedRectangle(cornerRadius: 12))
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(.quaternary, lineWidth: 1))
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 20)
                    }
                }
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(QuoteLibraryText.value("close", locale: locale)) { dismiss() }
                }
                if showingRecent && !library.recent.isEmpty {
                    ToolbarItem(placement: .primaryAction) {
                        Button(QuoteLibraryText.value("clearHistory", locale: locale)) { library.clearRecent() }
                    }
                }
            }
        }
        .sheet(item: $selectedQuote) { item in
            QuoteShareOptions(destination: WidgetQuoteDestination(
                quote: item.quote,
                locale: item.locale,
                values: [
                    "palette": palette,
                    "accent": accentHex,
                    "font": font,
                    "highlight": highlight ? "1" : "0",
                    "dark": dark ? "1" : "0",
                    "attribution": attribution
                ]
            ))
        }
        #if os(macOS)
        .frame(minWidth: 450, idealWidth: 560, minHeight: 450, idealHeight: 600)
        #endif
    }
}

private enum ClockSheet: Identifiable {
    case quote(WidgetQuoteDestination)
    case share(WidgetQuoteDestination)

    var id: String {
        switch self {
        case .quote(let destination): "quote|" + destination.id
        case .share(let destination): "share|" + destination.id
        }
    }
}

private struct WidgetQuoteDestination: Identifiable {
    var id: String {
        ([locale, quote.id] + values.keys.sorted().map { "\($0)=\(values[$0] ?? "")" }).joined(separator: "|")
    }
    let quote: Quote
    let locale: String
    let values: [String: String]
    var dark: Bool { values["dark"] == "1" }
    var highlight: Bool { values["highlight"] != "0" }
    var font: String { values["font"] ?? "serif" }
    var palette: String { values["palette"] ?? "red" }
    var accentHex: String { values["accent"] ?? "" }
    var accent: Color {
        palette == "custom" ? ClockSettings.color(fromHex: accentHex) : ClockSettings.paletteAccent(palette)
    }
    var background: Color { ClockSettings.background(for: accent, dark: dark) }
}

private struct QuoteShareOptions: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.locale) private var interfaceLocale
    let quote: Quote
    let locale: String
    let palette: String
    let fontName: String
    let highlight: Bool
    let dark: Bool
    private let fuzzy = false
    let accentHex: String
    @State private var attribution = "book-author"
    @State private var shareAppearanceRaw = QuoteShareAppearance.source.rawValue
    @State private var sharePalette: String
    @State private var shareFontRaw: String
    @State private var alignmentRaw: String
    @State private var customAccentHex = "#B36E26"
    #if os(macOS)
    @State private var imageToShare: NSImage?
    #else
    @State private var imageToShare: UIImage?
    #endif
    @State private var showingActivity = false
    @State private var copied = false
    @State private var copiedImage = false
    @State private var shareHighlight = true
    #if os(macOS)
    @State private var desktopTool = ShareEditorTool.colour
    #endif
    @State private var editingStyle = false
    @State private var colourOptionsExpanded = false
    @State private var textOptionsExpanded = false

    private var accent: Color {
        sharePalette == "custom"
            ? ClockSettings.color(fromHex: customAccentHex)
            : ClockSettings.paletteAccent(sharePalette)
    }
    private var background: Color { ClockSettings.background(for: accent, dark: dark) }
    private var format: QuoteShareFormat { .square }
    private var shareAppearance: QuoteShareAppearance {
        QuoteShareAppearance(rawValue: shareAppearanceRaw) ?? .source
    }
    private var shareFont: QuoteShareFont { QuoteShareFont(rawValue: shareFontRaw) ?? .serif }
    private var alignment: QuoteShareAlignment { QuoteShareAlignment(rawValue: alignmentRaw) ?? .center }
    private var cardBackground: Color { shareAppearance.background(source: background, accent: accent) }
    private var cardAccent: Color { accent }
    private var effectiveBackground: Color { cardBackground }
    private var effectiveAccent: Color { cardAccent }
    private var quoteCopyText: String {
        let credit: String
        switch attribution {
        case "author": credit = quote.author
        case "hidden": credit = ""
        default:
            if quote.title.isEmpty { credit = quote.author }
            else if quote.author.isEmpty { credit = quote.title }
            else { credit = "\(quote.title), \(quote.author)" }
        }
        let passage = quote.text(for: Locale(identifier: locale))
        return credit.isEmpty ? passage : "\(passage)\n\n— \(credit)"
    }
    private var attributionPicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("app_attribution").font(.subheadline.weight(.medium))
            Picker("app_attribution", selection: $attribution) {
                Text("app_attribution_full").tag("book-author")
                Text("app_attribution_author_short").tag("author")
                Text("app_attribution_hidden").tag("hidden")
            }
            .labelsHidden()
            .pickerStyle(.segmented)
        }
    }

    var body: some View {
        Group {
        #if os(macOS)
        desktopEditor
        #else
        NavigationStack {
            GeometryReader { geometry in
                let previewHeight = min(
                    max(0, geometry.size.width - 16) / format.aspectRatio,
                    max(0, geometry.size.height * (editingStyle ? 0.42 : 0.68) - 24)
                )
                let previewWidth = previewHeight * format.aspectRatio
                VStack(spacing: 0) {
                    ScrollView(.vertical) {
                        ShareQuotePreview(attribution: attribution, quote: quote, locale: locale, accent: effectiveAccent, background: effectiveBackground,
                                          font: shareFont, alignment: alignment, highlight: shareHighlight, fuzzy: fuzzy,
                                          format: format, displayWidth: previewWidth,
                                          signatureLocale: interfaceLocale.identifier)
                            .frame(width: previewWidth, height: previewWidth)
                            .frame(maxWidth: .infinity)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 8)
                    }
                    .frame(maxHeight: .infinity)

                    if editingStyle {
                        Divider()
                        Form {
                            Section {
                                DisclosureGroup(isExpanded: $colourOptionsExpanded) {
                                    Picker("app_style", selection: $shareAppearanceRaw) {
                                        ForEach(QuoteShareAppearance.allCases) { option in
                                            Text(option.label).tag(option.rawValue)
                                        }
                                    }
                                    .pickerStyle(.segmented)

                                    AccentPalettePicker(selection: $sharePalette, customAccentHex: customAccentHex)
                                    if sharePalette == "custom" {
                                        ColorPicker("app_custom_accent_color", selection: Binding(
                                            get: { ClockSettings.color(fromHex: customAccentHex) },
                                            set: { customAccentHex = ClockSettings.hex(from: $0) }
                                        ), supportsOpacity: false)
                                    }
                                    Toggle("Highlight the time", isOn: $shareHighlight)
                                } label: {
                                    shareSectionHeader("Colour", summary: "\(shareAppearance.label) · \(sharePalette.capitalized)")
                                }

                                DisclosureGroup(isExpanded: $textOptionsExpanded) {
                                    Picker("app_quote_font", selection: $shareFontRaw) {
                                        ForEach(QuoteShareFont.allCases.filter { $0 != .dyslexic || ClockSettings.dyslexicFontName != nil }) { font in
                                            Text(font.label).tag(font.rawValue)
                                        }
                                    }
                                    Picker("app_alignment", selection: $alignmentRaw) {
                                        Text("app_left").tag(QuoteShareAlignment.leading.rawValue)
                                        Text("app_center").tag(QuoteShareAlignment.center.rawValue)
                                        Text("app_right").tag(QuoteShareAlignment.trailing.rawValue)
                                    }
                                    .pickerStyle(.segmented)
                                    attributionPicker
                                } label: {
                                    shareSectionHeader("Text", summary: "\(shareFont.label) · \(alignment == .center ? "Centered" : "Left")")
                                }

                            }
                        }
                        .formStyle(.grouped)
                        .frame(maxHeight: .infinity)
                    } else {
                        Spacer(minLength: 8)
                    }
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if editingStyle {
                    Button("app_done") {
                        withAnimation(.easeInOut(duration: 0.2)) { editingStyle = false }
                    }
                    .font(.headline)
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .frame(maxWidth: .infinity)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(.bar)
                } else {
                    HStack(spacing: 16) {
                        Button {
                            copyQuoteText(quoteCopyText)
                            copied = true
                        } label: {
                            shareActionLabel(title: copied ? "app_quote_copied" : "app_copy_quote",
                                             symbol: copied ? "checkmark" : "doc.on.doc")
                        }
                        .accessibilityLabel(Text(copied ? "app_quote_copied" : "app_copy_quote"))

                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) { editingStyle = true }
                        } label: {
                            shareActionLabel(title: "app_edit_quote", symbol: "pencil")
                        }
                        .accessibilityLabel(Text("app_edit_quote"))

                        Button {
                            let renderer = ImageRenderer(content: QuoteShareCard(attribution: attribution, quote: quote, locale: locale,
                                accent: effectiveAccent, background: effectiveBackground, font: shareFont,
                                alignment: alignment, highlight: shareHighlight, fuzzy: fuzzy, format: format,
                                signatureLocale: interfaceLocale.identifier))
                            renderer.scale = 3
                            #if os(macOS)
                            imageToShare = renderer.nsImage
                            #else
                            imageToShare = renderer.uiImage
                            #endif
                            showingActivity = imageToShare != nil
                        } label: {
                            shareActionLabel(title: "app_share_quote", symbol: "square.and.arrow.up")
                        }
                        .accessibilityLabel(Text("app_share_quote"))
                    }
                    .buttonStyle(.plain)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(.bar)
                }
            }
            .navigationTitle(editingStyle ? "Edit quote" : "Share quote")
            .clockInlineTitle()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button { dismiss() } label: { Image(systemName: "xmark") }
                        .accessibilityLabel(Text("close"))
                }
            }
            .sheet(isPresented: $showingActivity) {
                if let imageToShare {
                    #if os(macOS)
                    VStack(spacing: 20) {
                        ShareLink(item: Image(nsImage: imageToShare),
                                  preview: SharePreview("Literature Clock", image: Image(nsImage: imageToShare))) {
                            Label("app_share_quote", systemImage: "square.and.arrow.up")
                        }
                        Button("app_copy_quote") { copyQuoteText(quoteCopyText) }
                        Button("app_done") { showingActivity = false }
                    }.padding(32)
                    #else
                    ActivityView(activityItems: [imageToShare], copyText: quoteCopyText)
                    #endif
                }
            }
        }
        #endif
        }
        #if os(macOS)
        .frame(minWidth: 820, idealWidth: 940, minHeight: 580, idealHeight: 700)
        #else
        .presentationDetents([.large])
        #endif
        .preferredColorScheme(dark ? .dark : .light)
    }

    init(destination: WidgetQuoteDestination) {
        self.init(quote: destination.quote, locale: destination.locale, palette: destination.palette,
                  fontName: destination.font, highlight: destination.highlight, dark: destination.dark,
                  accentHex: destination.accentHex)
    }

    init(quote: Quote, locale: String, palette: String, fontName: String,
         highlight: Bool, dark: Bool, accentHex: String) {
        self.quote = quote
        self.locale = locale
        self.palette = palette
        self.fontName = fontName
        self.highlight = highlight
        self.dark = dark
        self.accentHex = accentHex
        _sharePalette = State(initialValue: palette)
        _customAccentHex = State(initialValue: ClockSettings.validAccentHex(accentHex)
            ?? ClockSettings.defaults.string(forKey: ClockSettings.customAccentKey) ?? "#B36E26")
        #if os(macOS)
        _shareHighlight = State(initialValue: false)
        #else
        _shareHighlight = State(initialValue: highlight)
        #endif
        _attribution = State(initialValue: "book-author")
        let direction = Locale.Language(identifier: locale).characterDirection
        _alignmentRaw = State(initialValue: direction == .rightToLeft
            ? QuoteShareAlignment.trailing.rawValue
            : QuoteShareAlignment.leading.rawValue)
        let requestedFont = fontName == "sans" ? QuoteShareFont.rounded.rawValue : fontName
        let supported = QuoteShareFont(rawValue: requestedFont) != nil
            && (requestedFont != QuoteShareFont.dyslexic.rawValue || ClockSettings.dyslexicFontName != nil)
        _shareFontRaw = State(initialValue: supported ? requestedFont : QuoteShareFont.serif.rawValue)
    }

    private func shareActionLabel(title: LocalizedStringKey, symbol: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: symbol)
                .font(.system(size: 23, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 62, height: 62)
                .background(Color.accentColor, in: Circle())
            Text(title)
                .font(.caption)
                .foregroundStyle(.primary)
        }
        .frame(minWidth: 100)
        .contentShape(Rectangle())
    }

    private func shareSectionHeader(_ title: String, summary: String) -> some View {
        HStack {
            Text(title)
            Spacer()
            Text(summary).foregroundStyle(.secondary).textCase(nil)
        }
    }

    #if os(macOS)
    private enum ShareEditorTool: String, CaseIterable, Identifiable {
        case colour, text
        var id: Self { self }
        var title: LocalizedStringKey {
            switch self {
            case .colour: "app_color"
            case .text: "app_text"
            }
        }
    }

    private var shareEditorTabs: some View {
        HStack(spacing: 2) {
            ForEach(ShareEditorTool.allCases) { tool in
                let isSelected = desktopTool == tool
                Button {
                    desktopTool = tool
                } label: {
                    Text(tool.title)
                        .font(.system(size: 13, weight: .medium))
                        .frame(maxWidth: .infinity, minHeight: 30)
                        .foregroundStyle(isSelected ? Color.white : Color.primary.opacity(0.78))
                        .background(isSelected ? Color.accentColor : Color.clear,
                                    in: RoundedRectangle(cornerRadius: 7))
                        .contentShape(RoundedRectangle(cornerRadius: 7))
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(isSelected ? .isSelected : [])
            }
        }
        .padding(3)
        .frame(width: 160)
        .background(Color.primary.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
        .accessibilityElement(children: .contain)
        .accessibilityLabel(Text("app_edit_quote"))
        .accessibilityValue(Text(desktopTool.title))
    }

    private var fontChips: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("app_quote_font").font(.subheadline.weight(.medium))
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 110))], spacing: 7) {
                ForEach(QuoteShareFont.allCases.filter { $0 != .dyslexic || ClockSettings.dyslexicFontName != nil }) { option in
                    Button { shareFontRaw = option.rawValue } label: {
                        HStack(spacing: 6) {
                            Text(option.label).font(option.font(size: 14))
                                .lineLimit(1).minimumScaleFactor(0.75)
                            if shareFont == option {
                                Image(systemName: "checkmark").font(.caption.weight(.bold))
                            }
                        }
                        .frame(maxWidth: .infinity, minHeight: 38, maxHeight: 38)
                        .padding(.horizontal, 6)
                        .background(shareFont == option ? Color.accentColor.opacity(0.16) : Color.primary.opacity(0.05),
                                    in: RoundedRectangle(cornerRadius: 10))
                        .overlay {
                            RoundedRectangle(cornerRadius: 10)
                                .strokeBorder(shareFont == option ? Color.accentColor : Color.clear, lineWidth: 2)
                        }
                        .contentShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(shareFont == option ? .isSelected : [])
                }
            }
        }
    }

    private var desktopEditor: some View {
        VStack(spacing: 0) {
            HStack {
                Text("app_share_quote").font(.title2.weight(.bold))
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .semibold))
                        .frame(width: 28, height: 28)
                        .background(Color.primary.opacity(0.08), in: Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(Text("close"))
                .keyboardShortcut(.cancelAction)
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 16)
            Divider()
            HStack(spacing: 24) {
                VStack(spacing: 10) {
                    GeometryReader { geometry in
                        let width = max(0, min(geometry.size.width, geometry.size.height * format.aspectRatio))
                        ShareQuotePreview(attribution: attribution, quote: quote, locale: locale,
                                          accent: effectiveAccent, background: effectiveBackground,
                                          font: shareFont, alignment: alignment, highlight: shareHighlight,
                                          fuzzy: fuzzy, format: format, displayWidth: width,
                                          signatureLocale: interfaceLocale.identifier)
                            .frame(width: width, height: width / format.aspectRatio)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                    if !editingStyle {
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) { editingStyle = true }
                        } label: {
                            Label("app_edit_quote", systemImage: "pencil")
                                .font(.system(size: 13, weight: .medium))
                                .padding(.horizontal, 14)
                                .padding(.vertical, 7)
                                .background(Color.primary.opacity(0.08), in: RoundedRectangle(cornerRadius: 9))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(Text("app_edit_quote"))
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)

                if editingStyle {
                VStack(alignment: .leading, spacing: 20) {
                    shareEditorTabs
                    ScrollView {
                        VStack(alignment: .leading, spacing: 24) {
                            switch desktopTool {
                            case .colour:
                                VStack(alignment: .leading, spacing: 10) {
                                    Text("app_appearance").font(.subheadline.weight(.medium))
                                    Picker("app_appearance", selection: $shareAppearanceRaw) {
                                        ForEach(QuoteShareAppearance.allCases) { option in
                                            Text(option.label).tag(option.rawValue)
                                        }
                                    }
                                    .labelsHidden()
                                    .pickerStyle(.segmented)
                                }
                                AccentPalettePicker(selection: $sharePalette, customAccentHex: customAccentHex)
                                if sharePalette == "custom" {
                                    ColorPicker("app_custom_accent_color", selection: Binding(
                                        get: { ClockSettings.color(fromHex: customAccentHex) },
                                        set: { customAccentHex = ClockSettings.hex(from: $0) }
                                    ), supportsOpacity: false)
                                }
                                Divider()
                                HStack {
                                    Text("app_highlight_quote")
                                    Spacer()
                                    Toggle("app_highlight_quote", isOn: $shareHighlight)
                                        .labelsHidden()
                                        .toggleStyle(.switch)
                                        .disabled(true)
                                        .accessibilityLabel(Text("app_highlight_quote"))
                                }
                            case .text:
                                fontChips
                                Divider()
                                VStack(alignment: .leading, spacing: 10) {
                                    Text("app_alignment").font(.subheadline.weight(.medium))
                                    Picker("app_alignment", selection: $alignmentRaw) {
                                        Text("app_left").tag(QuoteShareAlignment.leading.rawValue)
                                        Text("app_center").tag(QuoteShareAlignment.center.rawValue)
                                        Text("app_right").tag(QuoteShareAlignment.trailing.rawValue)
                                    }
                                    .labelsHidden()
                                    .pickerStyle(.segmented)
                                }
                                Divider()
                                attributionPicker
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .topLeading)
                        .padding(2)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                }
                .padding(20)
                .frame(width: 320)
                .frame(maxHeight: .infinity, alignment: .topLeading)
                .background(Color.primary.opacity(0.035), in: RoundedRectangle(cornerRadius: 18))
                .transition(.move(edge: .trailing).combined(with: .opacity))
                }
            }
            .padding(24)
            Divider()
            HStack(spacing: 12) {
                Spacer()
                Button {
                    copyQuoteText(quoteCopyText)
                    copied = true
                } label: {
                    Label(copied ? "app_quote_copied" : "app_copy_quote",
                          systemImage: copied ? "checkmark" : "doc.on.doc")
                }
                .buttonStyle(.bordered)
                .buttonBorderShape(.roundedRectangle(radius: 8))
                if let imageToShare {
                    Button {
                        NSPasteboard.general.clearContents()
                        NSPasteboard.general.writeObjects([imageToShare])
                        copiedImage = true
                    } label: {
                        Label(copiedImage ? "app_quote_image_copied" : "app_copy_quote_image",
                              systemImage: copiedImage ? "checkmark" : "photo.on.rectangle")
                    }
                    .buttonStyle(.bordered)
                    .buttonBorderShape(.roundedRectangle(radius: 8))
                    ShareLink(item: Image(nsImage: imageToShare),
                              preview: SharePreview("Literature Clock", image: Image(nsImage: imageToShare))) {
                        Label("app_share_quote", systemImage: "square.and.arrow.up")
                    }
                    .buttonStyle(.borderedProminent)
                    .buttonBorderShape(.roundedRectangle(radius: 8))
                }
            }
            .controlSize(.regular)
            .padding(16)
        }
        .onChange(of: [shareAppearanceRaw, sharePalette, shareFontRaw, alignmentRaw,
                       customAccentHex, String(shareHighlight), attribution], initial: true) { _, _ in
            let renderer = ImageRenderer(content: QuoteShareCard(attribution: attribution, quote: quote, locale: locale,
                accent: effectiveAccent, background: effectiveBackground, font: shareFont,
                alignment: alignment, highlight: shareHighlight, fuzzy: fuzzy, format: format,
                signatureLocale: interfaceLocale.identifier))
            renderer.scale = 3
            imageToShare = renderer.nsImage
        }
    }
    #endif
}

private struct AccentPalettePicker: View {
    @Binding var selection: String
    let customAccentHex: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("app_accent_color").font(.subheadline)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 44), spacing: 8)], alignment: .leading, spacing: 8) {
                ForEach(ClockPalette.allCases) { option in
                    let color = option == .custom
                        ? ClockSettings.color(fromHex: customAccentHex)
                        : ClockSettings.paletteAccent(option.rawValue)
                    Button { selection = option.rawValue } label: {
                        Circle()
                            .fill(color)
                            .frame(width: 30, height: 30)
                            .overlay {
                                if selection == option.rawValue {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundStyle(ClockSettings.foreground(for: color))
                                } else if option == .custom {
                                    Image(systemName: "slider.horizontal.3")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundStyle(ClockSettings.foreground(for: color))
                                }
                            }
                            .padding(4)
                            .overlay { Circle().strokeBorder(selection == option.rawValue ? Color.primary : Color.clear, lineWidth: 2) }
                            .frame(width: 44, height: 44)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(Text(option.label))
                    .accessibilityAddTraits(selection == option.rawValue ? .isSelected : [])
                    .id(option.rawValue)
                }
            }
            .padding(.horizontal, 2)
        }
    }
}

private enum ClockPalette: String, CaseIterable, Identifiable {
    case red, pink, green, pine, orange, purple, blue, gray, custom
    var id: String { rawValue }
    var label: String {
        switch self {
        case .red: "Red"
        case .pink: "Pink"
        case .green: "Green"
        case .pine: "Pine"
        case .orange: "Orange"
        case .purple: "Purple"
        case .blue: "Blue"
        case .gray: "Gray"
        case .custom: "Custom"
        }
    }
}

private enum QuoteShareAppearance: String, CaseIterable, Identifiable {
    case source, light, dark
    var id: String { rawValue }
    var label: String {
        switch self {
        case .source: "System"
        case .light: "Light"
        case .dark: "Dark"
        }
    }
    func background(source: Color, accent: Color) -> Color {
        switch self {
        case .source: source
        case .light: ClockSettings.background(for: accent, dark: false)
        case .dark: ClockSettings.background(for: accent, dark: true)
        }
    }
}

private enum QuoteShareFont: String, CaseIterable, Identifiable {
    case serif, rounded, monospaced, specialElite, dyslexic
    var id: String { rawValue }
    var label: String {
        switch self {
        case .serif: "Serif"
        case .rounded: "Rounded"
        case .monospaced: "Monospaced"
        case .specialElite: "Special Elite"
        case .dyslexic: "OpenDyslexic"
        }
    }
    func font(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        switch self {
        case .serif: .system(size: size, weight: weight, design: .serif)
        case .rounded: .system(size: size, weight: weight, design: .rounded)
        case .monospaced: .system(size: size, weight: weight, design: .monospaced)
        case .specialElite: .custom("SpecialElite-Regular", size: size, relativeTo: .body)
        case .dyslexic:
            if let dyslexicFontName = ClockSettings.dyslexicFontName {
                .custom(dyslexicFontName, size: size, relativeTo: .body)
            } else {
                .system(size: size, weight: weight, design: .serif)
            }
        }
    }
}

private enum QuoteShareAlignment: String {
    case leading, center, trailing
    var text: TextAlignment {
        switch self {
        case .leading: .leading
        case .center: .center
        case .trailing: .trailing
        }
    }
    var frame: Alignment {
        switch self {
        case .leading: .leading
        case .center: .center
        case .trailing: .trailing
        }
    }
}

private enum QuoteShareFormat {
    case square

    var canvas: CGSize {
        CGSize(width: 360, height: 360)
    }

    var aspectRatio: CGFloat { canvas.width / canvas.height }

}

private struct ShareQuotePreview: View {
    let attribution: String
    let quote: Quote
    let locale: String
    let accent: Color
    let background: Color
    let font: QuoteShareFont
    let alignment: QuoteShareAlignment
    let highlight: Bool
    let fuzzy: Bool
    let format: QuoteShareFormat
    let displayWidth: CGFloat
    let signatureLocale: String

    private var foreground: Color { ClockSettings.foreground(for: background) }
    private var iconColorScheme: ColorScheme {
        ClockSettings.hex(from: ClockSettings.foreground(for: background)) == "#1F1F1F" ? .dark : .light
    }
    private var quoteDirection: LayoutDirection {
        Locale.Language(identifier: locale).characterDirection == .rightToLeft ? .rightToLeft : .leftToRight
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ShareQuoteComposition(attribution: attribution, quote: quote, foreground: foreground, accent: accent,
                                  font: font, alignment: alignment, highlight: highlight,
                                  fuzzy: fuzzy,
                                  textSize: shareQuoteTextSize(quote: quote, locale: locale,
                                      attribution: attribution, fuzzy: fuzzy,
                                      width: displayWidth, height: displayWidth / format.aspectRatio))
                .environment(\.layoutDirection, quoteDirection)
                .frame(maxHeight: .infinity, alignment: .center)
            QuoteShareBrand.signature(locale: signatureLocale, iconSize: 24, font: .system(size: 12, weight: .semibold))
                .environment(\.colorScheme, iconColorScheme)
                .padding(.top, 8)
        }
        .padding(14)
        .foregroundStyle(foreground)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(background, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

private struct QuoteShareCard: View {
    let attribution: String
    let quote: Quote
    let locale: String
    let accent: Color
    let background: Color
    let font: QuoteShareFont
    let alignment: QuoteShareAlignment
    let highlight: Bool
    let fuzzy: Bool
    let format: QuoteShareFormat
    let signatureLocale: String

    private var iconColorScheme: ColorScheme {
        ClockSettings.hex(from: ClockSettings.foreground(for: background)) == "#1F1F1F" ? .dark : .light
    }

    var body: some View {
        let inset = min(format.canvas.width, format.canvas.height) * 0.065
        let textColor = ClockSettings.foreground(for: background)
        VStack(alignment: .leading, spacing: 0) {
            ShareQuoteComposition(attribution: attribution, quote: quote, foreground: textColor, accent: accent,
                                  font: font, alignment: alignment, highlight: highlight,
                                  fuzzy: fuzzy,
                                  textSize: shareQuoteTextSize(quote: quote, locale: locale,
                                      attribution: attribution, fuzzy: fuzzy,
                                      width: format.canvas.width, height: format.canvas.height))
                .environment(\.layoutDirection, Locale.Language(identifier: locale).characterDirection == .rightToLeft ? .rightToLeft : .leftToRight)
                .frame(maxHeight: .infinity, alignment: .center)
            QuoteShareBrand.signature(
                locale: signatureLocale,
                iconSize: min(format.canvas.width, format.canvas.height) * 0.075,
                font: .system(size: min(format.canvas.width, format.canvas.height) * 0.047, weight: .semibold)
            )
            .environment(\.colorScheme, iconColorScheme)
            .foregroundStyle(textColor.opacity(0.82))
            .padding(.top, 8)
        }
        .padding(inset)
        .frame(width: format.canvas.width, height: format.canvas.height)
        .background(background)
    }
}

private func shareQuoteTextSize(quote: Quote, locale: String, attribution: String,
                                fuzzy: Bool, width: CGFloat, height: CGFloat) -> CGFloat {
    let inset = min(width, height) * 0.065 + 14
    let availableWidth = max(1, width - inset * 2)
    let availableHeight = max(1, height - inset * 2 - 70)
    let passageLength = fuzzy
        ? quote.timeParts().time.count
        : quote.text(for: Locale(identifier: locale)).count
    let creditLength = attribution == "hidden" ? 0 : quote.title.count + quote.author.count
    let effectiveCharacters = max(1, Double(passageLength) + Double(creditLength) * 0.55)
    let fitted = sqrt(Double(availableWidth * availableHeight) / (0.7 * effectiveCharacters))
    return CGFloat(min(30, max(1, fitted)))
}

// Keep the passage and its attribution together in both preview and export.
// Keep the same punctuation and visibility rules in the clock and share popup.
private func quoteAttributionText(_ quote: Quote, mode: String) -> Text? {
    guard mode != "hidden" else { return nil }
    if mode == "author" || quote.title.isEmpty {
        return quote.author.isEmpty ? nil : Text("— \(quote.author)")
    }
    let prefix = Text("— ")
    let title = Text(quote.title).italic()
    if quote.author.isEmpty { return prefix + title }
    let suffix = Text(", \(quote.author)")
    return prefix + title + suffix
}

private func appAttributionMode(_ mode: String) -> String {
    mode == "author" || mode == "hidden" ? mode : "book-author"
}

private struct ShareQuoteComposition: View {
    let attribution: String
    let quote: Quote
    let foreground: Color
    let accent: Color
    let font: QuoteShareFont
    let alignment: QuoteShareAlignment
    let highlight: Bool
    let fuzzy: Bool
    let textSize: CGFloat

    var body: some View {
        let parts = quote.timeParts()
        let attributionFont: Font = font.font(size: textSize * 0.5)
        VStack(spacing: textSize * 0.55) {
            if fuzzy {
                Text(parts.time)
                    .font(font.font(size: textSize))
                    .lineSpacing(font == .specialElite ? textSize * 0.18 : 0)
                    .foregroundStyle(highlight ? accent : foreground)
                    .frame(maxWidth: .infinity, alignment: alignment.frame)
                    .multilineTextAlignment(alignment.text)
                    .minimumScaleFactor(0.55)
            } else {
                ShareQuoteText(parts: parts, foreground: foreground, accent: accent, font: font,
                               alignment: alignment, highlight: highlight, maximumSize: textSize)
            }
            if attribution != "hidden" {
                attributionView
                .font(attributionFont)
                .lineSpacing(font == .specialElite ? textSize * 0.5 * 0.18 : 0)
                .foregroundStyle(foreground.opacity(0.75))
                .multilineTextAlignment(alignment.text)
                .frame(maxWidth: .infinity, alignment: alignment.frame)
                .fixedSize(horizontal: false, vertical: true)
                .layoutPriority(1)
            }
        }
    }

    @ViewBuilder
    private var attributionView: some View {
        if alignment == .center {
            VStack(spacing: textSize * 0.12) {
                if attribution != "author" { Text(quote.title).italic() }
                Text(quote.author)
            }
        } else if attribution == "author" {
            Text("— \(quote.author)")
        } else {
            Text("— ") + Text(quote.title).italic() + Text(", \(quote.author)")
        }
    }
}

private struct ShareQuoteText: View {
    let parts: (before: String, time: String, after: String)
    let foreground: Color
    let accent: Color
    let font: QuoteShareFont
    let alignment: QuoteShareAlignment
    let highlight: Bool
    let maximumSize: CGFloat

    var body: some View {
        ViewThatFits(in: .vertical) {
            line(at: maximumSize)
            line(at: maximumSize * 0.8)
            line(at: maximumSize * 0.6)
            line(at: maximumSize * 0.4)
            line(at: 0.5)
        }
    }

    private func line(at size: CGFloat) -> some View {
        (Text(parts.before).foregroundColor(foreground) +
         Text(parts.time).foregroundColor(highlight ? accent : foreground) +
         Text(parts.after).foregroundColor(foreground))
            .font(font.font(size: size))
            .lineSpacing(font == .specialElite ? size * 0.18 : 0)
            .multilineTextAlignment(alignment.text)
            .frame(maxWidth: .infinity, alignment: alignment.frame)
            .fixedSize(horizontal: false, vertical: true)
            .layoutPriority(1)
    }

}

private enum QuoteShareBrand {
    static var icon: Image {
        #if os(macOS)
        return Image(nsImage: NSApp.applicationIconImage)
        #else
        return Image(systemName: "book.closed.fill")
        #endif
    }

    static func signature(locale: String, iconSize: CGFloat, font: Font) -> some View {
        HStack(spacing: iconSize * 0.35) {
            icon
                .resizable()
                .scaledToFit()
                .frame(width: iconSize, height: iconSize)
            Text(title(for: locale))
                .font(font)
        }
    }

    static func title(for locale: String) -> String {
        switch Locale(identifier: locale).language.languageCode?.identifier {
        case "es": "Reloj literario"
        case "fr": "Horloge littéraire"
        case "de": "Literatur-Uhr"
        case "it": "Orologio letterario"
        case "pt": "Relógio literário"
        case "el": "Λογοτεχνικό Ρολόι"
        case "ru": "Литературные часы"
        case "zh": "文学时钟"
        case "ar": "ساعة أدبية"
        case "eo": "Literatura Horloĝo"
        default: "Literature Clock"
        }
    }
}

#if os(iOS)
private struct ActivityView: UIViewControllerRepresentable {
    let activityItems: [Any]
    let copyText: String
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems,
                                 applicationActivities: [CopyQuoteActivity(text: copyText)])
    }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}

private final class CopyQuoteActivity: UIActivity {
    private let text: String

    init(text: String) {
        self.text = text
        super.init()
    }

    override var activityTitle: String? { "Copy quote text" }
    override var activityImage: UIImage? { UIImage(systemName: "doc.on.doc") }
    override var activityType: UIActivity.ActivityType? {
        UIActivity.ActivityType(rawValue: "net.literatureclock.copy-quote")
    }
    override class var activityCategory: UIActivity.Category { .share }
    override func canPerform(withActivityItems activityItems: [Any]) -> Bool { true }
    override func perform() {
        UIPasteboard.general.string = text
        activityDidFinish(true)
    }
}

#endif

struct SettingsView: View {
    @AppStorage(ClockSettings.localeKey, store: ClockSettings.defaults) private var quoteLocale = "en-US"
    @AppStorage(ClockSettings.localesKey, store: ClockSettings.defaults) private var languageSelection = ""
    @AppStorage(ClockSettings.appearanceKey, store: ClockSettings.defaults) private var appearance = "system"
    @AppStorage(ClockSettings.fontKey, store: ClockSettings.defaults) private var quoteFont = "serif"
    @AppStorage(ClockSettings.paletteKey, store: ClockSettings.defaults) private var palette = "red"
    @AppStorage(ClockSettings.highlightKey, store: ClockSettings.defaults) private var highlight = true
    @AppStorage(ClockSettings.fuzzyKey, store: ClockSettings.defaults) private var fuzzy = false
    @AppStorage(ClockSettings.safeOnlyKey, store: ClockSettings.defaults) private var safeOnly = false
    @AppStorage(ClockSettings.attributionKey, store: ClockSettings.defaults) private var attribution = "book-author"
    @AppStorage(ClockSettings.customAccentKey, store: ClockSettings.defaults) private var customAccentHex = "#B36E26"
    @AppStorage(ClockSettings.progressKey, store: ClockSettings.defaults) private var progressMode = "bottom"

    private var accentPicker: Binding<Color> {
        Binding(
            get: { ClockSettings.color(fromHex: customAccentHex) },
            set: { customAccentHex = ClockSettings.hex(from: $0) }
        )
    }

    var body: some View {
        Form {
            Section("app_quotes") {
                NavigationLink(destination: QuoteLanguageSelectionView()) {
                    HStack {
                        Text("app_select_languages")
                        Spacer()
                        Text(languageSummary).foregroundStyle(.secondary)
                    }
                }
                Text("app_random_language_help")
                    .font(.footnote).foregroundStyle(.secondary)
                Toggle("app_safe_quotes", isOn: $safeOnly)
            }
            Section("app_appearance") {
                Picker("app_style", selection: $appearance) {
                    Text("system").tag("system")
                    Text("light").tag("light")
                    Text("dark").tag("dark")
                }.pickerStyle(.segmented)
                Picker("app_quote_font", selection: $quoteFont) {
                    Text("app_font_serif").tag("serif")
                    Text("app_font_rounded").tag("rounded")
                    Text("app_font_monospaced").tag("monospaced")
                    Text("app_font_special_elite").tag("specialElite")
                    if ClockSettings.dyslexicFontName != nil {
                        Text("app_font_open_dyslexic").tag("dyslexic")
                    }
                }
                AccentPalettePicker(selection: $palette, customAccentHex: customAccentHex)
                if palette == "custom" {
                    ColorPicker("app_custom_accent_color", selection: accentPicker, supportsOpacity: false)
                }
                Toggle("app_highlight_quote", isOn: $highlight)
                Toggle("app_fuzzy_mode", isOn: $fuzzy)
                Toggle("app_seconds_progress", isOn: Binding(
                    get: { progressMode != "hidden" },
                    set: { progressMode = $0 ? "bottom" : "hidden" }
                ))
                .onChange(of: progressMode) { _, _ in
                    WidgetCenter.shared.reloadAllTimelines()
                }

            }
            Section("app_attribution") {
                Picker("settings_attribution_position", selection: $attribution) {
                    Text("app_show_book_author").tag("book-author")
                    Text("app_show_author").tag("author")
                    Text("app_attribution_hidden").tag("hidden")
                }
            }
            Section("app_about") {
                LabeledContent("app_version", value: appVersion)
                Link(destination: URL(string: "https://github.com/cdmoro/literature-clock")!) {
                    Label("app_github_project", systemImage: "chevron.left.forwardslash.chevron.right")
                }
                Link(destination: URL(string: "https://literatureclock.netlify.app/")!) {
                    Label("app_project_website", systemImage: "globe")
                }
            }
        }
        .onAppear {
            attribution = appAttributionMode(attribution)
        }
        .onChange(of: customAccentHex) { _, _ in
            WidgetCenter.shared.reloadAllTimelines()
        }
        #if os(macOS)
        .formStyle(.grouped)
        #endif
        .navigationTitle("app_settings")
    }

    private var appVersion: String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "—"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String
        return build.map { "\(version) (\($0))" } ?? version
    }

    private var selectedLocales: [String] { ClockCatalogue.selectedLocales(languageSelection, fallback: quoteLocale) }
    private var languageSummary: String {
        if selectedLocales.count == 1, let locale = selectedLocales.first { return ClockCatalogue.languageName(locale) }
        return "\(selectedLocales.count) selected"
    }
    private func toggleLocale(_ locale: String) {
        var locales = selectedLocales
        if locales.contains(locale) {
            guard locales.count > 1 else { return }
            locales.removeAll { $0 == locale }
        } else {
            locales.append(locale)
        }
        languageSelection = locales.joined(separator: ",")
        quoteLocale = locales.first ?? quoteLocale
    }

}

private struct SecondsProgressBar: View {
    let progress: Double
    let accent: Color

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Rectangle().fill(accent)
                    .frame(width: geometry.size.width * min(1, max(0, progress)))
            }
        }
        .frame(height: 4)
        .allowsHitTesting(false)
        .accessibilityLabel(Text("app_seconds_progress"))
        .accessibilityValue("\(Int(progress * 60)) of 60 seconds")
    }
}

private struct QuoteLanguageSelectionView: View {
    @AppStorage(ClockSettings.localeKey, store: ClockSettings.defaults) private var quoteLocale = "en-US"
    @AppStorage(ClockSettings.localesKey, store: ClockSettings.defaults) private var languageSelection = ""

    private var selectedLocales: [String] {
        ClockCatalogue.selectedLocales(languageSelection, fallback: quoteLocale)
    }

    var body: some View {
        List(ClockCatalogue.locales, id: \.self) { locale in
            Button {
                toggleLocale(locale)
            } label: {
                HStack {
                    Text(ClockCatalogue.languageName(locale))
                    Spacer()
                    if selectedLocales.contains(locale) {
                        Image(systemName: "checkmark").foregroundStyle(.tint)
                    }
                }
#if os(macOS)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.primary.opacity(0.08), in: RoundedRectangle(cornerRadius: 8))
#endif
                .contentShape(Rectangle())
            }
            .foregroundStyle(.primary)
            .buttonStyle(.plain)
#if os(macOS)
            .listRowInsets(EdgeInsets(top: 3, leading: 16, bottom: 3, trailing: 16))
            .listRowSeparator(.hidden)
            .listRowBackground(Color.clear)
#endif
        }
        .navigationTitle("app_quote_languages_title")
        .clockInlineTitle()
        .safeAreaInset(edge: .bottom) {
            Text("app_select_one_or_more")
                .font(.footnote).foregroundStyle(.secondary)
                .frame(maxWidth: .infinity).padding()
                .background(.bar)
        }
    }

    private func toggleLocale(_ locale: String) {
        var locales = selectedLocales
        if locales.contains(locale) {
            guard locales.count > 1 else { return }
            locales.removeAll { $0 == locale }
        } else {
            locales.append(locale)
        }
        languageSelection = locales.joined(separator: ",")
        quoteLocale = locales.first ?? quoteLocale
    }
}

// Keep platform adaptations here so the clock, settings and share composition stay shared.
private func copyQuoteText(_ text: String) {
    #if os(macOS)
    NSPasteboard.general.clearContents()
    NSPasteboard.general.setString(text, forType: .string)
    #else
    UIPasteboard.general.string = text
    #endif
}

private extension ToolbarItemPlacement {
    static var clockLeading: Self {
        #if os(macOS)
        .automatic
        #else
        .topBarLeading
        #endif
    }
    static var clockTrailing: Self {
        #if os(macOS)
        .primaryAction
        #else
        .topBarTrailing
        #endif
    }
}

private extension View {
    @ViewBuilder func clockInlineTitle() -> some View {
        #if os(macOS)
        self
        #else
        navigationBarTitleDisplayMode(.inline)
        #endif
    }
    @ViewBuilder func clockNavigationAppearance(background: Color, dark: Bool) -> some View {
        #if os(macOS)
        self
        #else
        toolbarColorScheme(dark ? .dark : .light, for: .navigationBar)
            .toolbarBackground(background, for: .navigationBar)
        #endif
    }
}
