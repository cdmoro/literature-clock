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

    static func fallbackQuote(at date: Date, locale: String) -> Quote {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_GB")
        formatter.dateFormat = "HHmm"
        return Quote(
            id: "F-001",
            quoteTimeCase: formatter.string(from: date),
            quoteFirst: localizedValue("app_fallback_error_prefix", locale: locale),
            quoteLast: localizedValue("app_fallback_error_suffix", locale: locale),
            title: localizedValue("app_fallback_error_title", locale: locale),
            author: localizedValue("app_fallback_error_author", locale: locale),
            sfw: true
        )
    }

    private static func localizedValue(_ key: String, locale: String) -> String {
        let requested = locale.replacingOccurrences(of: "_", with: "-")
        let available = Bundle.main.localizations
        let language = Locale(identifier: requested).language.languageCode?.identifier
        let resolved = available.first { $0.caseInsensitiveCompare(requested) == .orderedSame }
            ?? available.first { Locale(identifier: $0).language.languageCode?.identifier == language }
            ?? "en-US"
        let bundle = Bundle.main.path(forResource: resolved, ofType: "lproj")
            .flatMap(Bundle.init(path:)) ?? .main
        let fallback = Bundle.main.path(forResource: "en-US", ofType: "lproj")
            .flatMap(Bundle.init(path:))?.localizedString(forKey: key, value: key, table: nil) ?? key
        return bundle.localizedString(forKey: key, value: fallback, table: nil)
    }

    // Widget timelines need only their minute window, not every quote in every
    // language. Decode one language at a time without populating the app cache.
    static func window(at dates: [Date], locales: [String]) -> [String: [String: [Quote]]] {
        guard let firstDate = dates.first, let lastDate = dates.last else { return [:] }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_GB")
        formatter.dateFormat = "HH_mm"
        let minutes = Set(dates.map { formatter.string(from: $0) })
        let startMinute = Int64(firstDate.timeIntervalSince1970 / 60)
        let endMinute = Int64(lastDate.timeIntervalSince1970 / 60)
        let timeZone = TimeZone.current.identifier

        windowCacheLock.lock()
        defer { windowCacheLock.unlock() }
        var result: [String: [String: [Quote]]] = [:]
        for locale in Set(locales) {
            if let cached = windowCache[locale], cached.startMinute == startMinute,
               cached.endMinute == endMinute, cached.timeZone == timeZone {
                result[locale] = cached.quotesByMinute
                continue
            }
            let quotesByMinute = autoreleasepool {
                loadCatalogue(for: locale).filter { minutes.contains($0.key) }
            }
            windowCache[locale] = WindowCache(startMinute: startMinute, endMinute: endMinute,
                                              timeZone: timeZone, quotesByMinute: quotesByMinute)
            result[locale] = quotesByMinute
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

    static func randomLocale(at date: Date, from candidates: [String],
                             identity: String? = nil, safeOnly: Bool = false,
                             lookup: ((String) -> [Quote])? = nil) -> String {
        let pool = candidates.isEmpty ? ["en-US"] : candidates
        let available = pool.filter { locale in
            let quotes = lookup?(locale) ?? quotes(at: date, locale: locale)
            return safeOnly ? quotes.contains(where: \.sfw) : !quotes.isEmpty
        }
        let choices = available.isEmpty ? pool : available
        // Keep the selection stable for each minute without writing one
        // UserDefaults key per timeline entry. Widget timelines can contain
        // more than an hour of future entries, and those keys otherwise grow
        // without bound in the shared app-group preferences domain.
        let minute = Int64(date.timeIntervalSince1970 / 60)
        let seed = "\(identity ?? "")|\(safeOnly)|\(minute)|\(choices.joined(separator: "_"))"
        let hash = seed.utf8.reduce(UInt64(14_695_981_039_346_656_037)) { value, byte in
            (value ^ UInt64(byte)) &* 1_099_511_628_211
        }
        return choices[Int(hash % UInt64(choices.count))]
    }

    static func languageName(_ locale: String) -> String {
        Locale(identifier: locale).localizedString(forIdentifier: locale)?.capitalized ?? locale
    }

    private static var catalogueCache: [String: [String: [Quote]]] = [:]
    private static let catalogueLock = NSLock()
    private struct WindowCache {
        let startMinute: Int64
        let endMinute: Int64
        let timeZone: String
        let quotesByMinute: [String: [Quote]]
    }
    private static var windowCache: [String: WindowCache] = [:]
    private static let windowCacheLock = NSLock()

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
                logger.debug("Decoded catalogue: \(locale, privacy: .public); bytes: \(data.count); minutes: \(catalogue.count); retained locales: \(catalogueCache.count); seconds: \(Date().timeIntervalSince(started))")
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

    static func quoteIndexKey(at date: Date, locale: String, widgetID: String? = nil,
                              fuzzy: Bool = false) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_GB")
        formatter.dateFormat = "HH_mm"
        let widgetKey = widgetID.map { "widget-\($0)-" } ?? ""
        let modeKey = fuzzy ? "fuzzy-" : ""
        return "quote-index-\(widgetKey)\(modeKey)\(locale)-\(formatter.string(from: date))"
    }

    static func quoteIndex(at date: Date, locale: String, count: Int, defaults: UserDefaults,
                           fuzzy: Bool = false) -> Int {
        guard count > 0 else { return 0 }
        let defaultIndex = fuzzy
            ? stableRandomIndex(at: date, count: count, identity: "app-fuzzy|\(locale)")
            : defaultQuoteIndex(at: date, count: count)
        let saved = defaults.object(forKey: quoteIndexKey(at: date, locale: locale, fuzzy: fuzzy)) as? Int
            ?? defaultIndex
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

    static func stableRandomIndex(at date: Date, count: Int, identity: String) -> Int {
        guard count > 0 else { return 0 }
        let minute = Int64(date.timeIntervalSince1970 / 60)
        let seed = "\(identity)|\(minute)|quote"
        let hash = seed.utf8.reduce(UInt64(14_695_981_039_346_656_037)) { value, byte in
            (value ^ UInt64(byte)) &* 1_099_511_628_211
        }
        return Int(hash % UInt64(count))
    }
}
