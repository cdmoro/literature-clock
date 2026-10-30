#!/usr/bin/swift
// Run from the repository root:
// swift apple/Shared/IconDesigns/render-book-clock.swift
// SVG layers are the source of truth; this exports the opaque PNG fallback.
import AppKit
import Foundation

let directory = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
let assets = directory.appendingPathComponent("AppIconBookClock.icon/Assets")
func artwork(_ name: String) throws -> String {
    let source = try String(contentsOf: assets.appendingPathComponent(name), encoding: .utf8)
    return source.replacingOccurrences(of: "<svg[^>]*>", with: "", options: .regularExpression)
        .replacingOccurrences(of: "</svg>", with: "")
}
let pages = try artwork("01-Pages.svg")
let hands = try artwork("02-Hands.svg")
let svg = """
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<rect width="1024" height="1024" fill="#061831"/>
\(pages)
\(hands)
</svg>
"""
let preview = directory.appendingPathComponent("BookClock-Preview.svg")
try svg.write(to: preview, atomically: true, encoding: .utf8)
guard let image = NSImage(contentsOf: preview),
      let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 1024, pixelsHigh: 1024,
          bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
          colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
      let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
    fatalError("Unable to render icon SVG")
}
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
image.draw(in: NSRect(x: 0, y: 0, width: 1024, height: 1024), from: .zero,
           operation: .copy, fraction: 1)
NSGraphicsContext.restoreGraphicsState()
// Export through an RGB Core Graphics context so the App Store PNG has no alpha channel.
let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let rgb = CGContext(data: nil, width: 1024, height: 1024, bitsPerComponent: 8,
    bytesPerRow: 4096, space: colorSpace, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue),
    let rendered = bitmap.cgImage else { fatalError("Unable to allocate RGB bitmap") }
rgb.draw(rendered, in: CGRect(x: 0, y: 0, width: 1024, height: 1024))
guard let flattened = rgb.makeImage() else { fatalError("Unable to flatten icon") }
let output = NSBitmapImageRep(cgImage: flattened)
guard let png = output.representation(using: .png, properties: [:]) else {
    fatalError("Unable to encode icon PNG")
}
for path in ["../../iOS/BookClock.xcassets/AppIconBookClock.appiconset/Icon-1024.png", "Previews/BookClock-Vector.png"] {
    let url = directory.appendingPathComponent(path)
    try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    try png.write(to: url)
}
print("Exported book-and-clock icon from two SVG layers.")
