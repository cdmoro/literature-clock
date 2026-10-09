import AppKit
import Foundation
import CoreImage

/// Downloads are independent of the animation loop. Keep one last successful
/// image on disk so an offline activation still has a photo to display.
final class NativePhotoBackground {
    private(set) var image: NSImage?
    private var requestedKey: String?
    private var loadedPhoto: Photo?
    private var loadedData: Data?
    private var previousImage: NSImage?
    private var transitionStarted: Date?
    private let prefetchEnabled: Bool
    private var preloader: NativePhotoBackground?
    private var preloadMinute: Int?
    private var activeMinute = 0
    private var activeConfiguration = ""
    var transitionFraction: CGFloat {
        guard let started = transitionStarted else { return 1 }
        let t = min(1, max(0, Date().timeIntervalSince(started) / 0.65))
        return CGFloat(t * t * (3 - 2 * t))
    }
    var isTransitioning: Bool { transitionFraction < 1 }

    private(set) var credit = ""
    private struct Photo: Codable { let url: String; let credit: String; let title: String; var source: String? = nil }
    private var catalogues: [String: (expires: Date, photos: [Photo])] = [:]
    private static let queries: [String: [String: String]] = {
        let url = Bundle(for: NativeClockView.self).resourceURL!.appendingPathComponent("photo-providers.json")
        return (try? JSONDecoder().decode([String: [String: String]].self, from: Data(contentsOf: url))) ?? [:]
    }()
    static func categories(provider: String) -> [String] { ["all"] + (queries[provider] ?? [:]).keys.sorted() }
    private static func plainText(_ html: String) -> String {
        var text = html.replacingOccurrences(of: "<[^>]*>", with: "", options: .regularExpression)
        for (entity, value) in [("&amp;", "&"), ("&quot;", "\""), ("&#39;", "'"), ("&lt;", "<"), ("&gt;", ">"), ("&nbsp;", " ")] { text = text.replacingOccurrences(of: entity, with: value) }
        return text.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    private static func commonsPhotos(_ body: [String: Any]) -> [Photo] {
        guard let query = body["query"] as? [String: Any], let pages = query["pages"] as? [[String: Any]] else { return [] }
        return pages.compactMap { page in
            guard let info = (page["imageinfo"] as? [[String: Any]])?.first,
                  let metadata = info["extmetadata"] as? [String: [String: Any]],
                  let license = metadata["LicenseShortName"]?["value"] as? String,
                  ["cc0", "cc0 1.0", "cc0 1.0 universal"].contains(license.lowercased()),
                  (metadata["AttributionRequired"]?["value"] as? String) != "true",
                  ["image/jpeg", "image/png", "image/webp"].contains(info["mime"] as? String ?? ""),
                  let url = info["thumburl"] as? String, let parsed = URL(string: url), parsed.scheme == "https",
                  ["upload.wikimedia.org", "thumb.wikimedia.org"].contains(parsed.host ?? ""),
                  let source = info["descriptionurl"] as? String, source.hasPrefix("https://commons.wikimedia.org/") else { return nil }
            let author = plainText(metadata["Artist"]?["value"] as? String ?? "Wikimedia Commons")
            return Photo(url: url, credit: "\(author) / Wikimedia Commons / \(license)", title: page["title"] as? String ?? "", source: source)
        }
    }
    private var task: URLSessionDataTask?
    private let cacheURL: URL?
    private let session: URLSession
    private let ownsSession: Bool

    init(cacheURL: URL? = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first?.appendingPathComponent("net.literatureclock.native-saver/last-photo.jpg"), session: URLSession? = nil, prefetchEnabled: Bool = true) {
        self.prefetchEnabled = prefetchEnabled
        self.cacheURL = cacheURL
        let config = URLSessionConfiguration.ephemeral
        config.httpAdditionalHeaders = ["User-Agent": "LiteratureClock/0.1 (https://github.com/cdmoro/literature-clock)"]
        config.timeoutIntervalForRequest = 10
        config.timeoutIntervalForResource = 15
        self.ownsSession = session == nil
        self.session = session ?? URLSession(configuration: config)
        if let url = cacheURL, let data = try? Data(contentsOf: url) {
            image = NSImage(data: data)
            if image != nil, let metadata = try? Data(contentsOf: url.appendingPathExtension("json")),
               let photo = try? JSONDecoder().decode(Photo.self, from: metadata) { credit = photo.credit }
        }
    }
    deinit { task?.cancel(); if ownsSession { session.invalidateAndCancel() } }

    static func cacheURL(displayID: String) -> URL? {
        FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first?.appendingPathComponent("net.literatureclock.native-saver/last-photo-" + displayID + ".jpg")
    }
    static func photoPosition(minute: Int, categoryCount: Int, allCategories: Bool, displayIndex: Int) -> Int {
        (allCategories ? minute / max(1, categoryCount) : minute) + max(0, displayIndex)
    }
    static func photoURL(minute: Int, size: NSSize, displayID: String = "0") -> URL {
        // Bound download size even on very large or Retina displays.
        let factor = min(1, 2560 / max(1, size.width), 1440 / max(1, size.height))
        let width = max(320, Int(size.width * factor))
        let height = max(240, Int(size.height * factor))
        return URL(string: "https://picsum.photos/seed/literature-clock-\(minute)-\(displayID)/\(width)/\(height)?blur=1")!
    }
    func update(now: Date, size: NSSize, provider: String = "picsum", category: String = "all", displayID: String = "0", displayIndex: Int = 0, onChange: @escaping () -> Void) {
        let minute = Int(now.timeIntervalSince1970 / 60)
        let configuration = "\(provider)/\(category)/\(displayID)/\(displayIndex)"
        activeMinute = minute
        if configuration != activeConfiguration {
            preloader?.cancel(); preloader = nil; preloadMinute = nil
            activeConfiguration = configuration
        }
        if let target = preloadMinute, target < minute {
            preloader?.cancel(); preloader = nil; preloadMinute = nil
        }
        if preloadMinute == minute, let loader = preloader {
            task?.cancel()
            requestedKey = "\(provider)/\(category)/\(minute)/\(displayID)/\(displayIndex)"
            if let photo = loader.loadedPhoto, let data = loader.loadedData, let image = loader.image {
                task?.cancel()
                requestedKey = "\(provider)/\(category)/\(minute)/\(displayID)/\(displayIndex)"
                catalogues.merge(loader.catalogues) { _, new in new }
                accept(photo: photo, data: data, image: image)
                preloader = nil; preloadMinute = nil
                onChange()
            }
            // Otherwise keep the previous photo until this same request finishes.
        } else {
            request(now: now, size: size, provider: provider, category: category, displayID: displayID, displayIndex: displayIndex, onChange: onChange)
        }
        if prefetchEnabled, now.timeIntervalSince1970.truncatingRemainder(dividingBy: 60) >= 45,
           image != nil, preloadMinute == nil {
            let target = minute + 1
            let loader = NativePhotoBackground(cacheURL: nil, session: session, prefetchEnabled: false)
            loader.catalogues = catalogues
            preloader = loader; preloadMinute = target
            loader.request(now: Date(timeIntervalSince1970: Double(target * 60)), size: size, provider: provider, category: category, displayID: displayID, displayIndex: displayIndex) { [weak self, weak loader] in
                guard let self, let loader, self.preloader === loader, self.activeConfiguration == configuration,
                      self.activeMinute == target, let photo = loader.loadedPhoto, let data = loader.loadedData, let image = loader.image else { return }
                self.task?.cancel()
                self.requestedKey = "\(provider)/\(category)/\(target)/\(displayID)/\(displayIndex)"
                self.catalogues.merge(loader.catalogues) { _, new in new }
                self.accept(photo: photo, data: data, image: image)
                self.preloader = nil; self.preloadMinute = nil
                onChange()
            }
        }
        if transitionFraction >= 1 { previousImage = nil; transitionStarted = nil }
    }
    private func request(now: Date, size: NSSize, provider: String = "picsum", category: String = "all", displayID: String = "0", displayIndex: Int = 0, onChange: @escaping () -> Void) {
        let minute = Int(now.timeIntervalSince1970 / 60)
        let key = "\(provider)/\(category)/\(minute)/\(displayID)/\(displayIndex)"
        guard key != requestedKey, size.width > 0, size.height > 0 else { return }
        requestedKey = key
        task?.cancel()
        if provider != "nasa" && provider != "commons" {
            download(Photo(url: Self.photoURL(minute: minute, size: size, displayID: displayID).absoluteString, credit: "", title: ""), key: key, onChange: onChange)
            return
        }
        let queries = Self.queries[provider] ?? [:]
        let topics = queries.keys.sorted()
        guard !topics.isEmpty else { return }
        let topic = queries[category] != nil ? category : topics[abs(minute % topics.count)]
        let position = Self.photoPosition(minute: minute, categoryCount: topics.count, allCategories: queries[category] == nil, displayIndex: displayIndex)
        let catalogueKey = provider + "/" + topic
        if let cached = catalogues[catalogueKey], cached.expires > now {
            let photo = cached.photos[abs(position % cached.photos.count)]
            download(photo, key: key, onChange: onChange)
            return
        }
        var components = URLComponents(string: provider == "commons" ? "https://commons.wikimedia.org/w/api.php" : "https://images-api.nasa.gov/search")!
        let parameters = provider == "commons" ? ["action": "query", "format": "json", "formatversion": "2", "generator": "search", "gsrsearch": queries[topic]!, "gsrnamespace": "6", "gsrlimit": "50", "prop": "imageinfo", "iiprop": "url|extmetadata|mime", "iiurlwidth": "1280"] : ["q": queries[topic]!, "media_type": "image", "page_size": "100"]
        components.queryItems = parameters.map { URLQueryItem(name: $0.key, value: $0.value) }
        task = session.dataTask(with: components.url!) { [weak self] data, response, error in
            guard error == nil, (response as? HTTPURLResponse)?.statusCode == 200, let data,
                  let body = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
            let collection = body["collection"] as? [String: Any]
            let items = collection?["items"] as? [[String: Any]] ?? []
            let photos: [Photo] = provider == "commons" ? Self.commonsPhotos(body) : items.compactMap { item in
                guard let metadata = (item["data"] as? [[String: Any]])?.first, let id = metadata["nasa_id"] as? String,
                      !(metadata["description"] as? String ?? "").lowercased().contains("copyright"),
                      let links = item["links"] as? [[String: Any]] else { return nil }
                let images = links.filter { ($0["render"] as? String) == "image" && ($0["href"] as? String ?? "").hasPrefix("https://images-assets.nasa.gov/") }
                guard let link = images.first(where: { ($0["href"] as? String ?? "").contains("~medium.") }) ?? images.first(where: { ($0["rel"] as? String) == "preview" }), let url = link["href"] as? String else { return nil }
                let author = metadata["secondary_creator"] as? String ?? metadata["photographer"] as? String ?? "NASA"
                return Photo(url: url, credit: author.contains("NASA") ? author : "NASA / " + author, title: metadata["title"] as? String ?? id)
            }
            guard !photos.isEmpty else { return }
            let orderedPhotos = photos.sorted { $0.url < $1.url }
            DispatchQueue.main.async {
                guard let self, self.requestedKey == key else { return }
                self.catalogues[catalogueKey] = (now.addingTimeInterval(3600), orderedPhotos)
                self.download(orderedPhotos[abs(position % orderedPhotos.count)], key: key, onChange: onChange)
            }
        }
        task?.resume()
    }
    private func download(_ photo: Photo, key: String, onChange: @escaping () -> Void) {
        guard let url = URL(string: photo.url) else { return }
        task = session.dataTask(with: url) { [weak self] data, response, error in
            guard error == nil, let response = response as? HTTPURLResponse, response.statusCode == 200,
                  response.mimeType?.hasPrefix("image/") == true,
                  let data, data.count <= 12 * 1024 * 1024, let image = NSImage(data: data), image.isValid else { return }
            DispatchQueue.main.async {
                guard let self, self.requestedKey == key else { return }
                self.accept(photo: photo, data: data, image: image)
                onChange()
            }
        }
        task?.resume()
    }
    private func accept(photo: Photo, data: Data, image: NSImage) {
        previousImage = self.image
        transitionStarted = previousImage == nil ? nil : Date()
        self.image = image; credit = photo.credit
        loadedPhoto = photo; loadedData = data
        if let url = cacheURL {
            try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            try? data.write(to: url, options: .atomic)
            if let metadata = try? JSONEncoder().encode(photo) { try? metadata.write(to: url.appendingPathExtension("json"), options: .atomic) }
        }
    }
    func cancel() {
        task?.cancel(); task = nil; requestedKey = nil
        preloader?.cancel(); preloader = nil; preloadMinute = nil
    }
    static func overlayColor(dark: Bool) -> NSColor {
        NativeAppearance.color(dark ? "#111111" : "#dddddd")!.withAlphaComponent(dark ? 0.5 : 0.4)
    }
    func draw(in bounds: NSRect, dark: Bool, finalOnly: Bool = false) {
        func drawImage(_ image: NSImage, fraction: CGFloat) {
            guard image.size.width > 0, image.size.height > 0 else { return }
            let factor = max(bounds.width / image.size.width, bounds.height / image.size.height)
            let size = NSSize(width: image.size.width * factor, height: image.size.height * factor)
            NSGraphicsContext.saveGraphicsState()
            NSBezierPath(rect: bounds).addClip()
            image.draw(in: NSRect(x: bounds.midX - size.width / 2, y: bounds.midY - size.height / 2, width: size.width, height: size.height), from: .zero, operation: .sourceOver, fraction: fraction)
            NSGraphicsContext.restoreGraphicsState()
        }
        if let previousImage, isTransitioning, !finalOnly { drawImage(previousImage, fraction: 1) }
        if let image { drawImage(image, fraction: finalOnly ? 1 : transitionFraction) }
        Self.overlayColor(dark: dark).setFill()
        bounds.fill()
        if !credit.isEmpty {
            let style = NSMutableParagraphStyle(); style.alignment = .right
            let font = NSFont.systemFont(ofSize: max(8, min(11, bounds.width * 0.01)))
            (credit as NSString).draw(in: NSRect(x: 20, y: (NSGraphicsContext.current?.isFlipped ?? false) ? bounds.height - 34 : 16,
                width: max(0, bounds.width - 40), height: 18), withAttributes: [.font: font, .foregroundColor: dark ? NSColor.white : NSColor.black, .paragraphStyle: style])
        }
    }
}
