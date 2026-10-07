import AppKit
import Foundation

/// Downloads are independent of the animation loop. Keep one last successful
/// image on disk so an offline activation still has a photo to display.
final class NativePhotoBackground {
    private(set) var image: NSImage?
    private var requestedMinute: Int?
    private var task: URLSessionDataTask?
    private let cacheURL: URL?
    private let session: URLSession

    init(cacheURL: URL? = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first?.appendingPathComponent("net.literatureclock.native-saver/last-photo.jpg"), session: URLSession? = nil) {
        self.cacheURL = cacheURL
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 10
        config.timeoutIntervalForResource = 15
        self.session = session ?? URLSession(configuration: config)
        if let url = cacheURL, let data = try? Data(contentsOf: url) { image = NSImage(data: data) }
    }
    deinit { task?.cancel(); session.invalidateAndCancel() }

    static func photoURL(minute: Int, size: NSSize) -> URL {
        // Bound download size even on very large or Retina displays.
        let factor = min(1, 2560 / max(1, size.width), 1440 / max(1, size.height))
        let width = max(320, Int(size.width * factor))
        let height = max(240, Int(size.height * factor))
        return URL(string: "https://picsum.photos/seed/literature-clock-\(minute)/\(width)/\(height)?blur=1")!
    }
    func update(now: Date, size: NSSize, onChange: @escaping () -> Void) {
        let minute = Int(now.timeIntervalSince1970 / 60)
        guard minute != requestedMinute, size.width > 0, size.height > 0 else { return }
        requestedMinute = minute
        task?.cancel()
        task = session.dataTask(with: Self.photoURL(minute: minute, size: size)) { [weak self] data, response, error in
            guard error == nil, let response = response as? HTTPURLResponse, response.statusCode == 200,
                  response.mimeType?.hasPrefix("image/") == true,
                  let data, data.count <= 12 * 1024 * 1024, let image = NSImage(data: data), image.isValid else { return }
            DispatchQueue.main.async {
                guard let self, self.requestedMinute == minute else { return }
                self.image = image
                if let url = self.cacheURL {
                    try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
                    try? data.write(to: url, options: .atomic)
                }
                onChange()
            }
        }
        task?.resume()
    }
    func cancel() { task?.cancel(); task = nil; requestedMinute = nil }
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
    }
}
