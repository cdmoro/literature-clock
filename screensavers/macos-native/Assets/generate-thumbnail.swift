import AppKit

// Large book/clock silhouette remains legible in the macOS catalogue.
let output = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
var representations: [NSBitmapImageRep] = []
for scale in [1, 2] {
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 480 * scale, pixelsHigh: 312 * scale,
                                 bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                                 colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    bitmap.size = NSSize(width: 480, height: 312)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    let ink = NSColor(calibratedRed: 0.055, green: 0.105, blue: 0.14, alpha: 1)
    let paper = NSColor(calibratedRed: 0.98, green: 0.91, blue: 0.76, alpha: 1)
    let orange = NSColor(calibratedRed: 1, green: 0.43, blue: 0.29, alpha: 1)
    ink.setFill(); NSRect(x: 0, y: 0, width: 480, height: 312).fill()
    let halo = NSBezierPath(ovalIn: NSRect(x: 150, y: 145, width: 180, height: 180))
    orange.withAlphaComponent(0.13).setFill(); halo.fill()
    let ring = NSBezierPath(ovalIn: NSRect(x: 185, y: 177, width: 110, height: 110))
    orange.setStroke(); ring.lineWidth = 5; ring.stroke()
    let hands = NSBezierPath(); hands.move(to: NSPoint(x: 240, y: 260)); hands.line(to: NSPoint(x: 240, y: 232)); hands.line(to: NSPoint(x: 269, y: 220)); hands.lineWidth = 5; hands.lineCapStyle = .round; hands.stroke()
    let cover = NSBezierPath(roundedRect: NSRect(x: 65, y: 46, width: 350, height: 154), xRadius: 12, yRadius: 12)
    orange.setFill(); cover.fill()
    let left = NSBezierPath()
    left.move(to: NSPoint(x: 76, y: 68)); left.line(to: NSPoint(x: 76, y: 207))
    left.curve(to: NSPoint(x: 240, y: 186), controlPoint1: NSPoint(x: 127, y: 230), controlPoint2: NSPoint(x: 188, y: 220))
    left.line(to: NSPoint(x: 240, y: 53)); left.curve(to: NSPoint(x: 76, y: 68), controlPoint1: NSPoint(x: 176, y: 82), controlPoint2: NSPoint(x: 130, y: 86))
    paper.setFill(); left.fill()
    let right = NSBezierPath()
    right.move(to: NSPoint(x: 240, y: 53)); right.line(to: NSPoint(x: 240, y: 186))
    right.curve(to: NSPoint(x: 404, y: 207), controlPoint1: NSPoint(x: 292, y: 220), controlPoint2: NSPoint(x: 353, y: 230))
    right.line(to: NSPoint(x: 404, y: 68)); right.curve(to: NSPoint(x: 240, y: 53), controlPoint1: NSPoint(x: 350, y: 86), controlPoint2: NSPoint(x: 304, y: 82))
    NSColor(calibratedRed: 0.91, green: 0.82, blue: 0.66, alpha: 1).setFill(); right.fill()
    let spine = NSBezierPath(); spine.move(to: NSPoint(x: 240, y: 59)); spine.line(to: NSPoint(x: 240, y: 182)); spine.lineWidth = 2
    ink.withAlphaComponent(0.2).setStroke(); spine.stroke()
    let paragraph = NSMutableParagraphStyle(); paragraph.alignment = .center
    ("12" as NSString).draw(in: NSRect(x: 80, y: 91, width: 156, height: 82), withAttributes: [.font: NSFont(name: "Georgia-Bold", size: 76)!, .foregroundColor: ink, .paragraphStyle: paragraph])
    ("34" as NSString).draw(in: NSRect(x: 246, y: 91, width: 150, height: 82), withAttributes: [.font: NSFont(name: "Georgia-Bold", size: 76)!, .foregroundColor: ink, .paragraphStyle: paragraph])
    NSGraphicsContext.restoreGraphicsState()
    try bitmap.representation(using: .png, properties: [:])!.write(to: output.appendingPathComponent(scale == 1 ? "thumbnail.png" : "thumbnail@2x.png"))
    representations.append(bitmap)
}
let image = NSImage(size: NSSize(width: 480, height: 312))
representations.forEach { image.addRepresentation($0) }
try image.tiffRepresentation!.write(to: output.appendingPathComponent("thumbnail.tiff"))
