import SwiftUI
#if os(macOS)
import AppKit
#else
import UIKit
#endif
import WidgetKit

struct ClockHomeView: View {
    @Environment(\.colorScheme) private var systemColorScheme
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
    @State private var presentedSheet: ClockSheet?
    @State private var pendingSheet: ClockSheet?

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

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { timeline in
            let _ = quoteRevision
            let primaryLocale = ClockCatalogue.randomLocale(at: timeline.date, from: selectedLocales,
                defaults: ClockSettings.defaults, safeOnly: safeOnly)
            let allQuotes = ClockCatalogue.quotes(at: timeline.date, locale: primaryLocale)
            let quotes = safeOnly ? allQuotes.filter(\.sfw) : allQuotes
            let quoteIndex = ClockCatalogue.quoteIndex(at: timeline.date, locale: primaryLocale, count: quotes.count, defaults: ClockSettings.defaults)
            let quote = quotes.isEmpty ? nil : quotes[quoteIndex]
            NavigationStack {
                VStack(spacing: 22) {
                    Spacer(minLength: 0)
                    if let quote {
                        quoteView(quote)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .frame(maxHeight: .infinity, alignment: .center)
                    } else {
                        ContentUnavailableView("No quote for this minute", systemImage: "text.quote")
                            .frame(maxHeight: .infinity)
                    }
                    HStack(spacing: 10) {
                        if !fuzzy, let quote, attribution != "hidden" {
                            if attribution == "author" {
                                Text(quote.author)
                                    .font(.caption)
                                    .foregroundStyle(foreground.opacity(0.68))
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.75)
                            } else {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(quote.title)
                                    Text(quote.author)
                                }
                                .font(.caption)
                                .foregroundStyle(foreground.opacity(0.68))
                                .lineLimit(1)
                                .minimumScaleFactor(0.75)
                                .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                        Spacer(minLength: 4)
                        if quotes.count > 1 {
                            quoteNavigationButtons(count: quotes.count, index: quoteIndex, date: timeline.date, locale: primaryLocale)
                        }
                    }
                    #if os(iOS)
                    Text("Add a medium or large widget\nfrom the Home Screen’s edit menu.")
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
                .safeAreaInset(edge: .bottom, spacing: 16) {
                    if ClockSettings.progressMode != "hidden" {
                        TimelineView(.animation(minimumInterval: 1.0 / 30)) { frame in
                            SecondsProgressBar(progress: frame.date.timeIntervalSince(ClockCatalogue.minuteInterval(at: frame.date).lowerBound) / 60,
                                               accent: accent, background: background,
                                               mode: ClockSettings.progressMode)
                        }
                    }
                }
                .background(background.ignoresSafeArea())
                .navigationTitle("Literature Clock")
                .clockNavigationAppearance(background: background, dark: isDark)
                .toolbar {
                    if let quote {
                        ToolbarItem(placement: .clockLeading) {
                            Button {
                                presentShareOptions(quote, locale: primaryLocale, palette: palette,
                                                   accentHex: palette == "custom" ? customAccentHex : "",
                                                   font: quoteFont, highlight: highlight, dark: isDark, fuzzy: fuzzy,
                                                   attribution: attribution)
                            } label: {
                                Label("Share", systemImage: "square.and.arrow.up")
                            }
                        }
                    }
                    ToolbarItem(placement: .clockTrailing) {
                        NavigationLink(destination: SettingsView()) { Label("Settings", systemImage: "gearshape") }
                    }
                }
            }
        }
        .onOpenURL(perform: handleShareURL)
        .sheet(item: $presentedSheet, onDismiss: presentPendingSheet) { sheet in
            switch sheet {
            case .quote(let destination):
                WidgetQuoteDetail(destination: destination)
            case .share(let destination):
                QuoteShareOptions(quote: destination.quote, locale: destination.locale,
                                  palette: destination.palette, fontName: destination.font,
                                  highlight: destination.highlight, dark: destination.dark,
                                  fuzzy: destination.values["fuzzy"] == "1", accentHex: destination.accentHex,
                                  attribution: destination.values["attribution"] ?? "book-author")
            }
        }
        .preferredColorScheme(appearance == "system" ? nil : (appearance == "dark" ? .dark : .light))
    }

    @ViewBuilder
    private func quoteView(_ quote: Quote) -> some View {
        let parts = quote.timeParts()
        if fuzzy {
            Text(parts.time)
                .font(ClockSettings.quoteFont(quoteFont, size: 34, weight: highlight ? .bold : .regular))
                .foregroundColor(highlight ? accent : foreground)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, alignment: .center)
        } else {
            ReadableQuoteText(parts: parts, fontName: quoteFont, foreground: foreground,
                              accent: accent, highlight: highlight, maximumSize: 28, minimumSize: 22)
        }
    }

    private func quoteNavigationButtons(count: Int, index: Int, date: Date, locale: String) -> some View {
        HStack(spacing: 5) {
            Button {
                cycleQuote(step: -1, date: date, locale: locale, count: count, index: index)
            } label: {
                Image(systemName: "chevron.left").font(.system(size: 10, weight: .bold))
                    .frame(width: 24, height: 24)
                    .background(accent.opacity(0.14), in: Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Previous quote")
            Button {
                cycleQuote(step: 1, date: date, locale: locale, count: count, index: index)
            } label: {
                Image(systemName: "chevron.right").font(.system(size: 10, weight: .bold))
                    .frame(width: 24, height: 24)
                    .background(accent.opacity(0.14), in: Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Next quote")
        }
        .tint(accent)
    }

    private func cycleQuote(step: Int, date: Date, locale: String, count: Int, index: Int) {
        guard count > 1 else { return }
        let next = (index + step + count) % count
        ClockSettings.defaults.set(next, forKey: ClockCatalogue.quoteIndexKey(at: date, locale: locale))
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
                           fuzzy: values["fuzzy"] == "1", attribution: values["attribution"] ?? "book-author")
    }

    private func presentShareOptions(_ quote: Quote, locale: String, palette: String,
                                     accentHex: String, font: String, highlight: Bool,
                                     dark: Bool, fuzzy: Bool, attribution: String) {
        // Present the quote and its style atomically. Separate @State values can
        // leave the sheet capturing the previous widget's appearance.
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

private struct WidgetQuoteDetail: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.locale) private var interfaceLocale
    @State private var sharing = false
    let destination: WidgetQuoteDestination

    // Existing settings_attribution_position labels from src/strings/settings.json.
    private var detailTitle: String {
        let titles = [
            "en-GB": "Quote details",
            "en-US": "Quote details",
            "es-ES": "Datos de la cita",
            "pt-PT": "Dados da citação",
            "fr-FR": "Informations de la citation",
            "it-IT": "Dati della citazione",
            "de-DE": "Angaben zum Zitat",
            "el-GR": "Στοιχεία αποσπάσματος",
            "zh-CN": "引文信息",
            "ru-RU": "Данные цитаты",
            "eo": "Detaloj de la citaĵo",
            "ar-AE": "بيانات الاقتباس"
        ]
        let language = interfaceLocale.language.languageCode?.identifier ?? "en"
        let matchingLocale = titles.keys.sorted().first {
            Locale(identifier: $0).language.languageCode?.identifier == language
        }
        return matchingLocale.flatMap { titles[$0] } ?? "Quote details"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                let parts = destination.quote.timeParts()
                let foreground = ClockSettings.foreground(for: destination.background)
                VStack(alignment: .leading, spacing: 24) {
                    (Text(parts.before) +
                     Text(parts.time).fontWeight(destination.highlight ? .bold : .regular)
                        .foregroundColor(destination.highlight ? destination.accent : foreground) +
                     Text(parts.after))
                        .font(ClockSettings.quoteFont(destination.font, size: 28))
                        .lineSpacing(destination.font == "specialElite" ? 28 * 0.18 : 0)
                    if destination.values["attribution"] != "hidden" {
                        VStack(alignment: .leading, spacing: 6) {
                            if destination.values["attribution"] != "author" { Text(destination.quote.title) }
                            Text(destination.quote.author)
                        }
                        .font(.subheadline)
                    }
                }
                .foregroundStyle(foreground)
                .padding(24)
                .environment(\.locale, Locale(identifier: destination.locale))
                .environment(\.layoutDirection, Locale.Language(identifier: destination.locale).characterDirection == .rightToLeft ? .rightToLeft : .leftToRight)
            }
            .background(destination.background)
            .navigationTitle(detailTitle)
            .clockInlineTitle()
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
                ToolbarItem(placement: .clockLeading) {
                    Button { sharing = true } label: { Label("Share", systemImage: "square.and.arrow.up") }
                }
            }
            .sheet(isPresented: $sharing) {
                QuoteShareOptions(quote: destination.quote, locale: destination.locale,
                                  palette: destination.palette, fontName: destination.font,
                                  highlight: destination.highlight, dark: destination.dark,
                                  fuzzy: false, accentHex: destination.accentHex,
                                  attribution: destination.values["attribution"] ?? "book-author")
            }
        }
        #if os(macOS)
        .frame(minWidth: 500, idealWidth: 600, minHeight: 500, idealHeight: 650)
        #endif
        .preferredColorScheme(destination.dark ? .dark : .light)
    }
}

private struct QuoteShareOptions: View {
    @Environment(\.dismiss) private var dismiss
    let attribution: String
    let quote: Quote
    let locale: String
    let palette: String
    let fontName: String
    let highlight: Bool
    let dark: Bool
    let fuzzy: Bool
    let accentHex: String
    @AppStorage("quote-share-format") private var formatRaw = QuoteShareFormat.portrait.rawValue
    @State private var shareAppearanceRaw = QuoteShareAppearance.source.rawValue
    @State private var sharePalette: String
    @State private var shareFontRaw: String
    @AppStorage("quote-share-alignment") private var alignmentRaw = QuoteShareAlignment.center.rawValue
    @State private var customAccentHex = "#B36E26"
    #if os(macOS)
    @State private var imageToShare: NSImage?
    #else
    @State private var imageToShare: UIImage?
    #endif
    @State private var showingActivity = false
    @State private var copied = false
    @State private var shareHighlight = true

    private var accent: Color {
        sharePalette == "custom"
            ? ClockSettings.color(fromHex: customAccentHex)
            : ClockSettings.paletteAccent(sharePalette)
    }
    private var background: Color { ClockSettings.background(for: accent, dark: dark) }
    private var format: QuoteShareFormat { QuoteShareFormat(rawValue: formatRaw) ?? .portrait }
    private var shareAppearance: QuoteShareAppearance {
        QuoteShareAppearance(rawValue: shareAppearanceRaw) ?? .source
    }
    private var shareFont: QuoteShareFont { QuoteShareFont(rawValue: shareFontRaw) ?? .serif }
    private var alignment: QuoteShareAlignment { QuoteShareAlignment(rawValue: alignmentRaw) ?? .center }
    private var cardBackground: Color { shareAppearance.background(source: background, accent: accent) }
    private var cardAccent: Color { accent }
    private var effectiveBackground: Color { cardBackground }
    private var effectiveAccent: Color { cardAccent }

    var body: some View {
        NavigationStack {
            GeometryReader { geometry in
                let previewHeight = min(
                    max(0, geometry.size.width - 16) / format.aspectRatio,
                    max(0, geometry.size.height * 0.76 - 16)
                )
                let previewWidth = previewHeight * format.aspectRatio
                VStack(spacing: 0) {
                    ShareQuotePreview(attribution: attribution, quote: quote, locale: locale, accent: effectiveAccent, background: effectiveBackground,
                                      font: shareFont, alignment: alignment, highlight: shareHighlight, fuzzy: fuzzy,
                                      format: format, displayWidth: previewWidth)
                        .aspectRatio(format.aspectRatio, contentMode: .fit)
                        .frame(width: previewWidth, height: previewHeight)
                        .frame(maxWidth: .infinity)
                        .layoutPriority(1)

                        .padding(.horizontal, 8)
                        .padding(.vertical, 8)

                    Divider()
                    Form {
                        Section("Appearance") {
                            Picker("Style", selection: $shareAppearanceRaw) {
                                ForEach(QuoteShareAppearance.allCases) { option in
                                    Text(option.label).tag(option.rawValue)
                                }
                            }
                            .pickerStyle(.segmented)

                            Picker("Quote font", selection: $shareFontRaw) {
                                ForEach(QuoteShareFont.allCases.filter { $0 != .dyslexic || ClockSettings.dyslexicFontName != nil }) { font in
                                    Text(font.label).tag(font.rawValue)
                                }
                            }
                            AccentPalettePicker(selection: $sharePalette, customAccentHex: customAccentHex)
                            if sharePalette == "custom" {
                                ColorPicker("Custom accent color", selection: Binding(
                                    get: { ClockSettings.color(fromHex: customAccentHex) },
                                    set: { customAccentHex = ClockSettings.hex(from: $0) }
                                ), supportsOpacity: false)
                            }
                            Toggle("Highlight the time", isOn: $shareHighlight)
                        }
                        Section("Alignment") {
                            Picker("Alignment", selection: $alignmentRaw) {
                                Text("Left").tag(QuoteShareAlignment.leading.rawValue)
                                Text("Center").tag(QuoteShareAlignment.center.rawValue)
                            }
                            .pickerStyle(.segmented)
                        }
                        Section("Image format") {
                            Picker("Image format", selection: $formatRaw) {
                                Text("Square").tag(QuoteShareFormat.square.rawValue)
                                Text("Portrait").tag(QuoteShareFormat.portrait.rawValue)
                            }
                            .pickerStyle(.segmented)
                        }
                    }
                    .frame(maxHeight: .infinity)
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                HStack(spacing: 44) {
                    Button {
                        let renderer = ImageRenderer(content: QuoteShareCard(attribution: attribution, quote: quote, locale: locale,
                            accent: effectiveAccent, background: effectiveBackground, font: shareFont,
                            alignment: alignment, highlight: shareHighlight, fuzzy: fuzzy, format: format))
                        renderer.scale = 3
                        #if os(macOS)
                        imageToShare = renderer.nsImage
                        #else
                        imageToShare = renderer.uiImage
                        #endif
                        showingActivity = imageToShare != nil
                    } label: {
                        shareActionLabel(title: "Share quote", symbol: "square.and.arrow.up")
                    }
                    .accessibilityLabel("Share quote")

                    Button {
                        copyQuoteText(quote.text(for: Locale(identifier: locale)))
                        copied = true
                    } label: {
                        shareActionLabel(title: copied ? "Copied" : "Copy text",
                                         symbol: copied ? "checkmark" : "doc.on.doc")
                    }
                    .accessibilityLabel(copied ? "Quote text copied" : "Copy quote text")
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(.bar)
            }
            .navigationTitle("Share quote")
            .clockInlineTitle()
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .sheet(isPresented: $showingActivity) {
                if let imageToShare {
                    #if os(macOS)
                    VStack(spacing: 20) {
                        ShareLink(item: Image(nsImage: imageToShare),
                                  preview: SharePreview("Literature Clock", image: Image(nsImage: imageToShare))) {
                            Label("Share quote", systemImage: "square.and.arrow.up")
                        }
                        Button("Copy quote text") { copyQuoteText(quote.text(for: Locale(identifier: locale))) }
                        Button("Done") { showingActivity = false }
                    }.padding(32)
                    #else
                    ActivityView(activityItems: [imageToShare], copyText: quote.text(for: Locale(identifier: locale)))
                    #endif
                }
            }
        }
        #if os(macOS)
        .frame(minWidth: 520, idealWidth: 580, minHeight: 700, idealHeight: 800)
        #else
        .presentationDetents([.large])
        #endif
    }

    init(quote: Quote, locale: String, palette: String, fontName: String,
         highlight: Bool, dark: Bool, fuzzy: Bool, accentHex: String, attribution: String) {
        self.quote = quote
        self.locale = locale
        self.palette = palette
        self.fontName = fontName
        self.highlight = highlight
        self.dark = dark
        self.fuzzy = fuzzy
        self.attribution = attribution
        self.accentHex = accentHex
        _sharePalette = State(initialValue: palette)
        _customAccentHex = State(initialValue: ClockSettings.validAccentHex(accentHex)
            ?? ClockSettings.defaults.string(forKey: ClockSettings.customAccentKey) ?? "#B36E26")
        _shareHighlight = State(initialValue: highlight)
        let requestedFont = fontName == "sans" ? QuoteShareFont.rounded.rawValue : fontName
        let supported = QuoteShareFont(rawValue: requestedFont) != nil
            && (requestedFont != QuoteShareFont.dyslexic.rawValue || ClockSettings.dyslexicFontName != nil)
        _shareFontRaw = State(initialValue: supported ? requestedFont : QuoteShareFont.serif.rawValue)
    }

    private func shareActionLabel(title: String, symbol: String) -> some View {
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
}

private struct AccentPalettePicker: View {
    @Binding var selection: String
    let customAccentHex: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Accent color").font(.subheadline)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
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
}

private enum ClockPalette: String, CaseIterable, Identifiable {
    case red, pink, green, orange, purple, blue, gray, custom
    var id: String { rawValue }
    var label: String {
        switch self {
        case .red: "Red"
        case .pink: "Pink"
        case .green: "Green"
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
    case leading, center
    var text: TextAlignment { self == .center ? .center : .leading }
    var frame: Alignment { self == .center ? .center : .leading }
}

private enum QuoteShareFormat: String {
    case square, portrait

    var canvas: CGSize {
        switch self {
        case .square: CGSize(width: 360, height: 360)
        case .portrait: CGSize(width: 360, height: 450)
        }
    }

    var aspectRatio: CGFloat { canvas.width / canvas.height }

    var label: String {
        switch self {
        case .square: "Square · 1:1"
        case .portrait: "Portrait · 4:5"
        }
    }

    var symbolName: String {
        switch self {
        case .square: "square"
        case .portrait: "rectangle.portrait"
        }
    }
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

    private var foreground: Color { ClockSettings.foreground(for: background) }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(QuoteShareBrand.title(for: locale)).font(.caption.weight(.semibold))
                Spacer()
                HStack(spacing: 5) {
                    Image(systemName: format.symbolName)
                        .font(.system(size: 11, weight: .semibold))
                    Text(format.label).font(.caption2.weight(.medium))
                }
            }
            .foregroundStyle(foreground.opacity(0.65))
            ShareQuoteComposition(attribution: attribution, quote: quote, foreground: foreground, accent: accent,
                                  font: font, alignment: alignment, highlight: highlight,
                                  fuzzy: fuzzy,
                                  textSize: min(format.canvas.width, format.canvas.height) * 0.085
                                      * displayWidth / format.canvas.width)
                .frame(maxHeight: .infinity, alignment: .center)
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

    var body: some View {
        let inset = min(format.canvas.width, format.canvas.height) * 0.065
        let textColor = ClockSettings.foreground(for: background)
        VStack(alignment: .leading, spacing: 0) {
            Text(QuoteShareBrand.title(for: locale))
                .font(.system(size: min(format.canvas.width, format.canvas.height) * 0.047, weight: .semibold))
                .foregroundStyle(textColor.opacity(0.82))
            ShareQuoteComposition(attribution: attribution, quote: quote, foreground: textColor, accent: accent,
                                  font: font, alignment: alignment, highlight: highlight,
                                  fuzzy: fuzzy,
                                  textSize: min(format.canvas.width, format.canvas.height) * 0.085)
                .frame(maxHeight: .infinity, alignment: .center)
        }
        .padding(inset)
        .frame(width: format.canvas.width, height: format.canvas.height)
        .background(background)
    }
}

// Keep the passage and its attribution together in both preview and export.
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
        VStack(spacing: textSize * 0.55) {
            if fuzzy {
                Text(parts.time)
                    .font(font.font(size: textSize, weight: highlight ? .bold : .regular))
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
                Text(verbatim: attribution == "author" ? "— \(quote.author)" : "— \(quote.title), \(quote.author)")
                .font(font.font(size: textSize * 0.5))
                .lineSpacing(font == .specialElite ? textSize * 0.5 * 0.18 : 0)
                .foregroundStyle(foreground.opacity(0.75))
                .multilineTextAlignment(alignment.text)
                .frame(maxWidth: .infinity, alignment: alignment.frame)
                .fixedSize(horizontal: false, vertical: true)
                .layoutPriority(1)
            }
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
        ReadableQuoteText(parts: parts, fontName: font.rawValue, foreground: foreground,
                          accent: accent, highlight: highlight, maximumSize: maximumSize,
                          minimumSize: maximumSize * 0.68, alignment: alignment.text)
    }

}

private enum QuoteShareBrand {
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
    @Environment(\.colorScheme) private var systemColorScheme
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

    private var isDark: Bool {
        appearance == "dark" || (appearance == "system" && systemColorScheme == .dark)
    }
    private var previewBackground: Color {
        palette == "custom"
            ? ClockSettings.background(for: previewAccent, dark: isDark)
            : ClockSettings.paletteBackground(palette, dark: isDark)
    }
    private var previewAccent: Color {
        palette == "custom"
            ? ClockSettings.color(fromHex: customAccentHex)
            : ClockSettings.paletteAccent(palette)
    }
    private var accentPicker: Binding<Color> {
        Binding(
            get: { ClockSettings.color(fromHex: customAccentHex) },
            set: { customAccentHex = ClockSettings.hex(from: $0) }
        )
    }

    var body: some View {
        Form {
            Section("Quotes") {
                NavigationLink(destination: QuoteLanguageSelectionView()) {
                    HStack {
                        Text("Quote languages")
                        Spacer()
                        Text(languageSummary).foregroundStyle(.secondary)
                    }
                }
                Text("One quote is chosen at random from these languages each minute.")
                    .font(.footnote).foregroundStyle(.secondary)
                Toggle("Safe for work quotes only", isOn: $safeOnly)
            }
            Section("Appearance") {
                Picker("Style", selection: $appearance) {
                    Text("System").tag("system")
                    Text("Light").tag("light")
                    Text("Dark").tag("dark")
                }.pickerStyle(.segmented)
                Picker("Quote font", selection: $quoteFont) {
                    Text("Serif").tag("serif")
                    Text("Rounded").tag("rounded")
                    Text("Monospaced").tag("monospaced")
                    Text("Special Elite").tag("specialElite")
                    if ClockSettings.dyslexicFontName != nil {
                        Text("OpenDyslexic").tag("dyslexic")
                    }
                }
                AccentPalettePicker(selection: $palette, customAccentHex: customAccentHex)
                if palette == "custom" {
                    ColorPicker("Custom accent color", selection: accentPicker, supportsOpacity: false)
                }
                Toggle("Highlight quote", isOn: $highlight)
                Toggle("Fuzzy mode", isOn: $fuzzy)
                Picker("Seconds progress", selection: $progressMode) {
                    Text("Bottom").tag("bottom")
                    Text("Background").tag("background")
                    Text("Hidden").tag("hidden")
                }
                .pickerStyle(.segmented)
                .onChange(of: progressMode) { _, _ in
                    WidgetCenter.shared.reloadAllTimelines()
                }

                palettePreview
            }
            Section("Attribution") {
                Picker("Show", selection: $attribution) {
                    Text("Show book and author").tag("book-author")
                    Text("Show author only").tag("author")
                    Text("Hide").tag("hidden")
                }
            }
            Section("About") {
                LabeledContent("Version", value: appVersion)
                Link(destination: URL(string: "https://github.com/cdmoro/literature-clock")!) {
                    Label("GitHub project", systemImage: "chevron.left.forwardslash.chevron.right")
                }
                Link(destination: URL(string: "https://literature-clock.com")!) {
                    Label("Project website", systemImage: "globe")
                }
            }
        }
        .onChange(of: customAccentHex) { _, _ in
            WidgetCenter.shared.reloadAllTimelines()
        }
        #if os(macOS)
        .formStyle(.grouped)
        #endif
        .navigationTitle("Settings")
    }

    private var appVersion: String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "—"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String
        return build.map { "\(version) (\($0))" } ?? version
    }

    private var palettePreview: some View {
        VStack(alignment: .leading, spacing: 10) {
            if fuzzy {
                Text("soul")
                    .font(ClockSettings.quoteFont(quoteFont, size: 22, weight: highlight ? .bold : .regular))
                    .foregroundColor(highlight ? previewAccent : previewForeground)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity, alignment: .center)
            } else {
                (Text("A room without books is like a body without a ") +
                 Text("soul").fontWeight(highlight ? .bold : .regular).foregroundColor(highlight ? previewAccent : previewForeground) +
                 Text("."))
                    .font(ClockSettings.quoteFont(quoteFont, size: 17))
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
                    if !fuzzy {
                        HStack {
                            Text("13:16")
                            Spacer()
                            if attribution == "book-author" {
                                Text("Book · Cicero")
                            } else if attribution == "author" {
                                Text("Cicero")
                            }
                        }
                        .font(.caption)
                        .foregroundStyle(previewForeground.opacity(0.7))
            }
        }
        .padding(14)
        .foregroundStyle(previewForeground)
        .background(previewBackground, in: RoundedRectangle(cornerRadius: 16))
        .overlay(alignment: .bottom) {
            if progressMode != "hidden" {
                SecondsProgressBar(progress: 0.42, accent: previewAccent,
                                   background: previewBackground, mode: progressMode)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            }
        }
        .listRowInsets(EdgeInsets())
        .listRowBackground(Color.clear)
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

    private var previewForeground: Color { ClockSettings.foreground(for: previewBackground) }
}

private struct SecondsProgressBar: View {
    let progress: Double
    let accent: Color
    let background: Color
    let mode: String

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                if mode == "background" {
                    accent.opacity(0.12)
                    accent.opacity(0.24)
                        .frame(width: geometry.size.width * min(1, max(0, progress)))
                } else {
                    Capsule().fill(accent.opacity(0.18))
                    Capsule().fill(accent)
                        .frame(width: geometry.size.width * min(1, max(0, progress)))
                }
            }
        }
        .frame(height: mode == "background" ? 5 : 3)
        .padding(.horizontal, mode == "background" ? 0 : 24)
        .padding(.bottom, mode == "background" ? 0 : 8)
        .allowsHitTesting(false)
        .accessibilityLabel("Seconds progress")
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
                .contentShape(Rectangle())
            }
            .foregroundStyle(.primary)
        }
        .navigationTitle("Quote languages")
        .clockInlineTitle()
        .safeAreaInset(edge: .bottom) {
            Text("Select one or more. One quote is chosen at random each minute.")
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
