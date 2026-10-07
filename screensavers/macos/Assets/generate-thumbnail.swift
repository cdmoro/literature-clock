import AppKit

// Reproducible typographic artwork, using macOS fonts rather than a web font download.
let output = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
var representations: [NSBitmapImageRep] = []
for scale in [1, 2] {
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 480 * scale, pixelsHigh: 312 * scale,
                                 bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                                 colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    bitmap.size = NSSize(width: 480, height: 312)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    let background = NSColor(calibratedRed: 0.13, green: 0.065, blue: 0.075, alpha: 1)
    background.setFill()
    NSRect(x: 0, y: 0, width: 480, height: 312).fill()
    let cream = NSColor(calibratedRed: 0.94, green: 0.91, blue: 0.85, alpha: 1)
    let accent = NSColor(calibratedRed: 0.91, green: 0.32, blue: 0.25, alpha: 1)
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .center
    let quote = NSFont(name: "Georgia", size: 34) ?? NSFont.systemFont(ofSize: 34)
    func text(_ value: String, _ rect: NSRect, _ font: NSFont, _ color: NSColor) {
        (value as NSString).draw(in: rect, withAttributes: [.font: font, .foregroundColor: color, .paragraphStyle: paragraph])
    }
    text("12:00", NSRect(x: 40, y: 244, width: 400, height: 24), .monospacedDigitSystemFont(ofSize: 16, weight: .medium), cream.withAlphaComponent(0.65))
    text("A little literature,", NSRect(x: 20, y: 160, width: 440, height: 44), quote, cream)
    text("every minute.", NSRect(x: 20, y: 110, width: 440, height: 44), quote, accent)
    text("LITERATURE CLOCK", NSRect(x: 40, y: 44, width: 400, height: 24), .systemFont(ofSize: 13, weight: .semibold), cream.withAlphaComponent(0.7))
    NSGraphicsContext.restoreGraphicsState()
    let name = scale == 1 ? "thumbnail.png" : "thumbnail@2x.png"
    try bitmap.representation(using: .png, properties: [:])!.write(to: output.appendingPathComponent(name))
    representations.append(bitmap)
}
let image = NSImage(size: NSSize(width: 480, height: 312))
for representation in representations { image.addRepresentation(representation) }
try image.tiffRepresentation!.write(to: output.appendingPathComponent("thumbnail.tiff"))
