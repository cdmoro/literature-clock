import AppIntents

struct CycleQuoteIntent: AppIntent {
    static var title: LocalizedStringResource = "Change quote"
    static var description = IntentDescription("Show another quote for this minute.")

    @Parameter(title: "Direction") var step: Int
    @Parameter(title: "Widget identifier") var widgetID: String
    @Parameter(title: "Quote language") var locale: String
    @Parameter(title: "Quote minute") var minuteID: Int
    @Parameter(title: "Safe for work quotes only") var safeOnly: Bool

    init() { step = 1; widgetID = ""; locale = "en-US"; minuteID = 0; safeOnly = false }
    init(step: Int, widgetID: String, locale: String, minuteID: Int, safeOnly: Bool) {
        self.step = step
        self.widgetID = widgetID
        self.locale = locale
        self.minuteID = minuteID
        self.safeOnly = safeOnly
    }

    func perform() async throws -> some IntentResult {
        let displayedMinute = Date(timeIntervalSince1970: TimeInterval(minuteID * 60 + 30))
        let allQuotes = ClockCatalogue.quotes(at: displayedMinute, locale: locale)
        let quotes = safeOnly ? allQuotes.filter(\.sfw) : allQuotes
        guard quotes.count > 1 else { return .result() }

        let key = ClockCatalogue.quoteIndexKey(at: displayedMinute, locale: locale, widgetID: widgetID)
        let defaults = ClockSettings.defaults
        let current = (defaults.object(forKey: key) as? Int)
            ?? ClockCatalogue.defaultQuoteIndex(at: displayedMinute, count: quotes.count)
        let next = (current + step + quotes.count) % quotes.count
        defaults.set(next, forKey: key)
        return .result()
    }
}
