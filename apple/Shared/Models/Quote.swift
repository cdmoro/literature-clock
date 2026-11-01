import Foundation
import OSLog

struct Quote: Decodable, Identifiable {
    let id: String
    let quoteTimeCase: String
    let quoteFirst: String
    let quoteLast: String
    let title: String
    let author: String
    let sfw: Bool

    init(id: String, quoteTimeCase: String, quoteFirst: String, quoteLast: String,
         title: String, author: String, sfw: Bool) {
        self.id = id
        self.quoteTimeCase = quoteTimeCase
        self.quoteFirst = quoteFirst
        self.quoteLast = quoteLast
        self.title = title
        self.author = author
        self.sfw = sfw
    }

    enum CodingKeys: String, CodingKey {
        case id, title, author, sfw
        case quoteTimeCase = "quote_time_case"
        case quoteFirst = "quote_first"
        case quoteLast = "quote_last"
    }

    func text(for locale: Locale) -> String {
        Self.plainText(quoteFirst + quoteTimeCase + quoteLast)
    }

    func timeParts() -> (before: String, time: String, after: String) {
        (Self.plainText(quoteFirst), Self.plainText(quoteTimeCase), Self.plainText(quoteLast))
    }

    private static func plainText(_ value: String) -> String {
        value
            .replacingOccurrences(of: #"<br\s*/?>"#, with: "\n", options: [.caseInsensitive, .regularExpression])
            .replacingOccurrences(of: #"</?(?:em|i|strong|b|u)>"#, with: "", options: [.caseInsensitive, .regularExpression])
            .replacingOccurrences(of: #"<[^>]+>"#, with: "", options: .regularExpression)
            .replacingOccurrences(of: "&nbsp;", with: " ", options: .caseInsensitive)
            .replacingOccurrences(of: "&quot;", with: "\"", options: .caseInsensitive)
            .replacingOccurrences(of: "&#39;", with: "'", options: .caseInsensitive)
            .replacingOccurrences(of: "&amp;", with: "&", options: .caseInsensitive)
            .replacingOccurrences(of: "&lt;", with: "<", options: .caseInsensitive)
            .replacingOccurrences(of: "&gt;", with: ">", options: .caseInsensitive)
    }
}

enum ClockCatalogue {
    private static let logger = Logger(subsystem: "net.literatureclock.app.widget", category: "Catalogue")
    static let locales = ["en-US", "en-GB", "es-ES", "fr-FR", "de-DE", "it-IT", "pt-PT", "el-GR", "eo", "ru-RU", "zh-CN", "ar-AE"]

    static func quotes(at date: Date, locale: String) -> [Quote] {
        let catalogue = catalogue(for: locale)
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_GB")
        formatter.dateFormat = "HH_mm"
        return catalogue[formatter.string(from: date)] ?? []
    }

    // Widget timelines need only their minute window, not every quote in every
    // language. Decode one language at a time without populating the app cache.
    static func window(at dates: [Date], locales: [String]) -> [String: [String: [Quote]]] {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_GB")
        formatter.dateFormat = "HH_mm"
        let minutes = Set(dates.map { formatter.string(from: $0) })
        var result: [String: [String: [Quote]]] = [:]
        for locale in Set(locales) {
            result[locale] = autoreleasepool {
                loadCatalogue(for: locale).filter { minutes.contains($0.key) }
            }
        }
        return result
    }

    static func quote(id: String, locale: String) -> Quote? {
        catalogue(for: locale).values.lazy.flatMap { $0 }.first { $0.id == id }
    }

    static func selectedLocales(_ stored: String, fallback: String) -> [String] {
        let selected = stored.split(separator: ",").map(String.init).filter { locales.contains($0) }
        return selected.isEmpty ? [locales.contains(fallback) ? fallback : "en-US"] : selected
    }

    static func randomLocale(at date: Date, from candidates: [String], defaults: UserDefaults,
                             identity: String? = nil, safeOnly: Bool = false,
                             lookup: ((String) -> [Quote])? = nil) -> String {
        let pool = candidates.isEmpty ? ["en-US"] : candidates
        let available = pool.filter { locale in
            let quotes = lookup?(locale) ?? quotes(at: date, locale: locale)
            return safeOnly ? quotes.contains(where: \.sfw) : !quotes.isEmpty
        }
        let choices = available.isEmpty ? pool : available
        let minute = Int(date.timeIntervalSince1970 / 60)
        let identityKey = identity.map { "-\($0)" } ?? ""
        let safeKey = safeOnly ? "-safe" : ""
        let key = "random-quote-locale\(identityKey)\(safeKey)-\(minute)-\(choices.joined(separator: "_"))"
        if let saved = defaults.string(forKey: key), choices.contains(saved) { return saved }
        let locale = choices.randomElement() ?? "en-US"
        defaults.set(locale, forKey: key)
        return locale
    }

    static func languageName(_ locale: String) -> String {
        Locale(identifier: locale).localizedString(forIdentifier: locale)?.capitalized ?? locale
    }

    private static var catalogueCache: [String: [String: [Quote]]] = [:]
    private static let catalogueLock = NSLock()

    private static func catalogue(for locale: String) -> [String: [Quote]] {
        catalogueLock.lock()
        defer { catalogueLock.unlock() }
        if let cached = catalogueCache[locale] { return cached }
        let catalogue = loadCatalogue(for: locale)
        if !catalogue.isEmpty { catalogueCache[locale] = catalogue }
        return catalogue
    }

    private static func loadCatalogue(for locale: String) -> [String: [Quote]] {
        let sharedURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: ClockSettings.appGroup)?
            .appendingPathComponent("Catalogues/\(locale).json")
        let bundleURL = Bundle.main.url(forResource: locale, withExtension: "json", subdirectory: "Catalogues")
        // Prefer the catalogues packaged with this app/extension. The shared
        // container can survive reinstalls and contain an older catalogue.
        for url in [bundleURL, sharedURL].compactMap({ $0 }) {
            let started = Date()
            do {
                let data = try Data(contentsOf: url)
                let catalogue = try JSONDecoder().decode([String: [Quote]].self, from: data)
                guard !catalogue.isEmpty else {
                    logger.error("Empty catalogue: \(locale, privacy: .public)")
                    continue
                }
                logger.notice("Decoded catalogue: \(locale, privacy: .public); bytes: \(data.count); minutes: \(catalogue.count); retained locales: \(catalogueCache.count); seconds: \(Date().timeIntervalSince(started))")
                return catalogue
            } catch {
                logger.error("Catalogue read/decode failed: \(locale, privacy: .public); source: \(url.lastPathComponent, privacy: .public); error: \(String(describing: error), privacy: .public)")
            }
        }
        logger.error("No usable catalogue: \(locale, privacy: .public); bundled resource found: \(bundleURL != nil); shared URL available: \(sharedURL != nil)")
        return [:]
    }

    static func installSharedCatalogues() {
        guard let source = Bundle.main.resourceURL?.appendingPathComponent("Catalogues"),
              let shared = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: ClockSettings.appGroup)?
                .appendingPathComponent("Catalogues"),
              !FileManager.default.fileExists(atPath: shared.appendingPathComponent("en-US.json").path) else { return }
        try? FileManager.default.removeItem(at: shared)
        try? FileManager.default.copyItem(at: source, to: shared)
    }

    static func timeString(_ date: Date, locale: String) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: locale)
        formatter.timeStyle = .short
        formatter.dateStyle = .none
        return formatter.string(from: date)
    }

    static func quoteIndexKey(at date: Date, locale: String, widgetID: String? = nil) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_GB")
        formatter.dateFormat = "HH_mm"
        let widgetKey = widgetID.map { "widget-\($0)-" } ?? ""
        return "quote-index-\(widgetKey)\(locale)-\(formatter.string(from: date))"
    }

    static func quoteIndex(at date: Date, locale: String, count: Int, defaults: UserDefaults) -> Int {
        guard count > 0 else { return 0 }
        let saved = defaults.object(forKey: quoteIndexKey(at: date, locale: locale)) as? Int
            ?? defaultQuoteIndex(at: date, count: count)
        return saved % count
    }

    static func minuteInterval(at date: Date) -> ClosedRange<Date> {
        let start = Calendar.current.dateInterval(of: .minute, for: date)?.start ?? date
        let end = start.addingTimeInterval(60)
        return start...end
    }

    static func defaultQuoteIndex(at date: Date, count: Int) -> Int {
        guard count > 0 else { return 0 }
        return Calendar.current.component(.minute, from: date) % count
    }
}
