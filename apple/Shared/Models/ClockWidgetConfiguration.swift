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
    case red, pink, green, pine, orange, purple, blue, gray

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Highlight color")
    static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [
        .red: "Red", .pink: "Pink", .green: "Green", .pine: "Pine",
        .orange: "Orange", .purple: "Purple", .blue: "Blue", .gray: "Gray"
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
    case esperanto = "eo", russian = "ru-RU", chinese = "zh-CN", arabic = "ar-AE", japanese = "ja-JP"
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Quote languages")
    static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [
        .englishUS: "English (United States)", .englishGB: "English (United Kingdom)",
        .spanish: "Español (España)", .french: "Français (France)", .german: "Deutsch (Deutschland)",
        .italian: "Italiano (Italia)", .portuguese: "Português (Portugal)", .greek: "Ελληνικά (Ελλάδα)",
        .esperanto: "Esperanto", .russian: "Русский (Россия)", .chinese: "中文（中国大陆）",
        .arabic: "العربية (الإمارات العربية المتحدة)", .japanese: "日本語 (日本)"
    ]

    static var systemDefaults: [Self] {
        let preferred = Locale.preferredLanguages.compactMap { identifier -> Self? in
            let language = Locale(identifier: identifier).language.languageCode?.identifier
            switch language {
            case "en":
                let region = Locale(identifier: identifier).region?.identifier
                return region == "GB" ? .englishGB : .englishUS
            case "es": return .spanish
            case "fr": return .french
            case "de": return .german
            case "it": return .italian
            case "pt": return .portuguese
            case "el": return .greek
            case "eo": return .esperanto
            case "ru": return .russian
            case "zh": return .chinese
            case "ar": return .arabic
            case "ja": return .japanese
            default: return nil
            }
        }
        return preferred.first.map { [$0] } ?? [.englishGB]
    }
}

struct ClockWidgetConfiguration: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Literature Clock Options"
    static var description = IntentDescription("Choose how this Literature Clock widget looks and which quotes it shows.")

    // Match declaration order to ParameterSummary: the macOS editor may use
    // the extracted parameter list rather than the family-specific summary.
    @Parameter(title: "Quote languages", default: [])
    var languages: [ClockWidgetLanguage]
    @Parameter(title: "Safe for work quotes only", default: false) var safeOnly: Bool
    @Parameter(title: "Appearance", default: .system) var appearance: ClockWidgetAppearance
    @Parameter(title: "Highlight color", description: "Clear and Tinted styles use system colors.", default: .red)
    var palette: ClockWidgetPalette?
    @Parameter(title: "Quote font", default: .serif) var font: ClockWidgetFont
    @Parameter(title: "Attribution", default: .bookAuthor) var attribution: ClockWidgetAttribution
    @Parameter(title: "settings_original_attributions", default: false) var showOriginalAttribution: Bool
    @Parameter(title: "Time fragment only", description: "Show only the part of the quote that tells the time.", default: false) var fuzzy: Bool
    @Parameter(title: "Highlight the time", default: true) var highlight: Bool

    static var parameterSummary: some ParameterSummary {
        Switch(.widgetFamily) {
            Case(.systemSmall) {
                Summary("Customize this widget") {
                    \.$languages
                    \.$safeOnly
                    \.$appearance
                    \.$palette
                    \.$font
                    \.$attribution
                    \.$showOriginalAttribution
                }
            }
            DefaultCase {
                Summary("Customize this widget") {
                    \.$languages
                    \.$safeOnly
                    \.$appearance
                    \.$palette
                    \.$font
                    \.$attribution
                    \.$showOriginalAttribution
                    \.$fuzzy
                    \.$highlight
                }
            }
        }
    }
}

