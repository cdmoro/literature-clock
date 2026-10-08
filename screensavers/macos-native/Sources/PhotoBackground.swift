import AppKit
import Foundation

/// Downloads are independent of the animation loop. Keep one last successful
/// image on disk so an offline activation still has a photo to display.
final class NativePhotoBackground {
    private(set) var image: NSImage?
    private var requestedKey: String?
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

    init(cacheURL: URL? = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first?.appendingPathComponent("net.literatureclock.native-saver/last-photo.jpg"), session: URLSession? = nil) {
        self.cacheURL = cacheURL
        let config = URLSessionConfiguration.ephemeral
        config.httpAdditionalHeaders = ["User-Agent": "LiteratureClock/0.1 (https://github.com/cdmoro/literature-clock)"]
        config.timeoutIntervalForRequest = 10
        config.timeoutIntervalForResource = 15
        self.session = session ?? URLSession(configuration: config)
        if let url = cacheURL, let data = try? Data(contentsOf: url) {
            image = NSImage(data: data)
            if image != nil, let metadata = try? Data(contentsOf: url.appendingPathExtension("json")),
               let photo = try? JSONDecoder().decode(Photo.self, from: metadata) { credit = photo.credit }
        }
    }
    deinit { task?.cancel(); session.invalidateAndCancel() }

    static func photoURL(minute: Int, size: NSSize) -> URL {
        // Bound download size even on very large or Retina displays.
        let factor = min(1, 2560 / max(1, size.width), 1440 / max(1, size.height))
        let width = max(320, Int(size.width * factor))
        let height = max(240, Int(size.height * factor))
        return URL(string: "https://picsum.photos/seed/literature-clock-\(minute)/\(width)/\(height)?blur=1")!
    }
    func update(now: Date, size: NSSize, provider: String = "picsum", category: String = "all", onChange: @escaping () -> Void) {
        let minute = Int(now.timeIntervalSince1970 / 60)
        let key = "\(provider)/\(category)/\(minute)"
        guard key != requestedKey, size.width > 0, size.height > 0 else { return }
        requestedKey = key
        task?.cancel()
        if provider != "nasa" && provider != "commons" {
            download(Photo(url: Self.photoURL(minute: minute, size: size).absoluteString, credit: "", title: ""), key: key, onChange: onChange)
            return
        }
        let queries = Self.queries[provider] ?? [:]
        let topics = queries.keys.sorted()
        guard !topics.isEmpty else { return }
        let topic = queries[category] != nil ? category : topics[abs(minute % topics.count)]
        let position = queries[category] != nil ? minute : minute / topics.count
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
            DispatchQueue.main.async {
                guard let self, self.requestedKey == key else { return }
                self.catalogues[catalogueKey] = (now.addingTimeInterval(3600), photos)
                self.download(photos[abs(position % photos.count)], key: key, onChange: onChange)
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
                self.image = image
                self.credit = photo.credit
                if let url = self.cacheURL {
                    try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
                    try? data.write(to: url, options: .atomic)
                    if let metadata = try? JSONEncoder().encode(photo) { try? metadata.write(to: url.appendingPathExtension("json"), options: .atomic) }
                }
                onChange()
            }
        }
        task?.resume()
    }
    func cancel() { task?.cancel(); task = nil; requestedKey = nil }
    func draw(in bounds: NSRect, dark: Bool) {
        if let image, image.size.width > 0, image.size.height > 0 {
            let factor = max(bounds.width / image.size.width, bounds.height / image.size.height)
            let size = NSSize(width: image.size.width * factor, height: image.size.height * factor)
            NSGraphicsContext.saveGraphicsState()
            NSBezierPath(rect: bounds).addClip()
            image.draw(in: NSRect(x: bounds.midX - size.width / 2, y: bounds.midY - size.height / 2, width: size.width, height: size.height))
            NSGraphicsContext.restoreGraphicsState()
        }
        (dark ? NSColor.black : NSColor.white).withAlphaComponent(dark ? 0.55 : 0.6).setFill()
        bounds.fill()
        if !credit.isEmpty {
            let style = NSMutableParagraphStyle(); style.alignment = .right
            let font = NSFont.systemFont(ofSize: max(8, min(11, bounds.width * 0.01)))
            (credit as NSString).draw(in: NSRect(x: 12, y: (NSGraphicsContext.current?.isFlipped ?? false) ? bounds.height - 30 : 12,
                width: max(0, bounds.width - 24), height: 18), withAttributes: [.font: font, .foregroundColor: dark ? NSColor.white : NSColor.black, .paragraphStyle: style])
        }
    }
}
