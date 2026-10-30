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
    @Parameter(title: "Custom accent (#RRGGBB)", description: "Leave empty to use the custom accent selected in the app.") var customAccent: String?
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

