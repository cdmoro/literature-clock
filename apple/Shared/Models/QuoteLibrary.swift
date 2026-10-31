import Foundation
import SwiftUI

enum QuoteLibraryText {
    static func value(_ key: String, locale: String) -> String {
        let bundle = Bundle.main.path(forResource: locale, ofType: "lproj")
            .flatMap(Bundle.init(path:)) ?? .main
        return bundle.localizedString(forKey: key, value: nil, table: nil)
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
    private struct CollectionEnvelope: Codable {
        let version: Int
        let items: [SavedQuote]
    }
    private init() {
        favorites = load(favoritesKey, limit: 500)
        recent = load(historyKey, limit: 100)
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
        defaults.removeObject(forKey: historyKey)
    }

    private func load(_ key: String, limit: Int) -> [SavedQuote] {
        guard let data = defaults.data(forKey: key),
              let envelope = try? JSONDecoder().decode(CollectionEnvelope.self, from: data),
              envelope.version == 1 else { return [] }
        var seen = Set<String>()
        return envelope.items.filter { seen.insert($0.id).inserted }.prefix(limit).map { $0 }
    }

    private func save(_ items: [SavedQuote], key: String) {
        guard let data = try? JSONEncoder().encode(CollectionEnvelope(version: 1, items: items)) else { return }
        defaults.set(data, forKey: key)
    }
}
