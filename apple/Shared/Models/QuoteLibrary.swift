import Foundation
import SwiftUI

enum QuoteLibraryText {
    static func value(_ key: String, locale: String) -> String {
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
}

struct SavedQuote: Codable, Identifiable, Equatable {
    let id: String
    let locale: String
    let time: String
    let quoteID: String
    let quoteTimeCase: String
    let quoteFirst: String
    let quoteLast: String
    let title: String
    let author: String
    let sfw: Bool

    init(quote: Quote, locale: String, time: String? = nil) {
        self.time = time ?? String(quote.id.prefix(5))
        id = "\(locale)/\(self.time)/\(quote.id)"
        self.locale = locale
        quoteID = quote.id
        quoteTimeCase = quote.quoteTimeCase
        quoteFirst = quote.quoteFirst
        quoteLast = quote.quoteLast
        title = quote.title
        author = quote.author
        sfw = quote.sfw
    }

    var quote: Quote {
        Quote(id: quoteID, quoteTimeCase: quoteTimeCase, quoteFirst: quoteFirst,
              quoteLast: quoteLast, title: title, author: author, sfw: sfw)
    }
}

@MainActor
final class QuoteLibrary: ObservableObject {
    static let shared = QuoteLibrary()
    @Published private(set) var favorites: [SavedQuote] = []
    @Published private(set) var recent: [SavedQuote] = []
    private let defaults = ClockSettings.defaults
    private let favoritesKey = "literature-clock.favorites.v1"
    private let historyKey = "literature-clock.history.v1"
    private let obsoletePreferencesCleanupKey = "literature-clock.obsolete-preferences-cleaned.v1"
    private struct CollectionEnvelope: Codable {
        let version: Int
        let items: [SavedQuote]
    }
    private init() {
        favorites = load(favoritesKey, limit: 500)
        recent = load(historyKey, limit: 100)
        removeObsoleteTimelinePreferences()
    }

    func isFavorite(_ quote: Quote, locale: String, time: String? = nil) -> Bool {
        let expectedTime = time ?? String(quote.id.prefix(5))
        return favorites.contains { $0.id == "\(locale)/\(expectedTime)/\(quote.id)" }
    }

    func toggle(_ quote: Quote, locale: String, time: String? = nil) {
        let item = SavedQuote(quote: quote, locale: locale, time: time)
        if let index = favorites.firstIndex(where: { $0.id == item.id }) {
            favorites.remove(at: index)
        } else if favorites.count < 500 {
            favorites.insert(item, at: 0)
        }
        save(favorites, key: favoritesKey)
    }

    func record(_ quote: Quote, locale: String, time: String) {
        let item = SavedQuote(quote: quote, locale: locale, time: time)
        recent.removeAll { $0.id == item.id }
        recent.insert(item, at: 0)
        recent = Array(recent.prefix(100))
        save(recent, key: historyKey)
    }

    func clearRecent() {
        recent = []
        try? FileManager.default.removeItem(at: fileURL(for: historyKey))
        defaults.removeObject(forKey: historyKey)
    }

    private func load(_ key: String, limit: Int) -> [SavedQuote] {
        let url = fileURL(for: key)
        if let data = try? Data(contentsOf: url),
           let items = decodedItems(from: data, limit: limit) {
            return items
        }
        guard let legacyData = defaults.data(forKey: key),
              let items = decodedItems(from: legacyData, limit: limit) else { return [] }
        save(items, key: key, removeLegacyPreference: false)
        return items
    }

    private func decodedItems(from data: Data, limit: Int) -> [SavedQuote]? {
        guard let envelope = try? JSONDecoder().decode(CollectionEnvelope.self, from: data),
              envelope.version == 1 else { return nil }
        var seen = Set<String>()
        return envelope.items.filter { seen.insert($0.id).inserted }.prefix(limit).map { $0 }
    }

    @discardableResult
    private func save(_ items: [SavedQuote], key: String, removeLegacyPreference: Bool = true) -> Bool {
        guard let data = try? JSONEncoder().encode(CollectionEnvelope(version: 1, items: items)) else {
            return false
        }
        let url = fileURL(for: key)
        do {
            try FileManager.default.createDirectory(
                at: url.deletingLastPathComponent(), withIntermediateDirectories: true
            )
            try data.write(to: url, options: .atomic)
            if removeLegacyPreference { defaults.removeObject(forKey: key) }
            return true
        } catch {
            NSLog("Could not save quote collection %@: %@", key, error.localizedDescription)
            return false
        }
    }

    private func fileURL(for key: String) -> URL {
        let supportDirectory = FileManager.default.urls(
            for: .applicationSupportDirectory, in: .userDomainMask
        )[0]
        return supportDirectory
            .appendingPathComponent("LiteratureClock", isDirectory: true)
            .appendingPathComponent("\(key).json", isDirectory: false)
    }

    private func removeObsoleteTimelinePreferences() {
        guard !defaults.bool(forKey: obsoletePreferencesCleanupKey),
              var domain = defaults.persistentDomain(forName: ClockSettings.appGroup) else { return }
        let obsoletePrefixes = ["random-quote-locale", "quote-index-widget-"]
        var keysToRemove = domain.keys.filter { key in
            obsoletePrefixes.contains { key.hasPrefix($0) }
        }
        for (key, limit) in [(favoritesKey, 500), (historyKey, 100)]
        where FileManager.default.fileExists(atPath: fileURL(for: key).path) {
            if let data = try? Data(contentsOf: fileURL(for: key)),
               decodedItems(from: data, limit: limit) != nil {
                keysToRemove.append(key)
            }
        }
        guard !keysToRemove.isEmpty else {
            defaults.set(true, forKey: obsoletePreferencesCleanupKey)
            return
        }
        keysToRemove.forEach { domain.removeValue(forKey: $0) }
        defaults.setPersistentDomain(domain, forName: ClockSettings.appGroup)
        defaults.set(true, forKey: obsoletePreferencesCleanupKey)
    }
}
