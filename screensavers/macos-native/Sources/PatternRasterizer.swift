import AppKit
import Foundation

guard CommandLine.arguments.count == 5,
      let width = Double(CommandLine.arguments[3]),
      let height = Double(CommandLine.arguments[4]),
      let source = NSImage(contentsOfFile: CommandLine.arguments[1]) else {
    fatalError("Usage: PatternRasterizer input.svg output.png width height")
}
let size = NSSize(width: width, height: height)
let image = NSImage(size: size, flipped: false) { rect in
    source.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1)
    return true
}
guard let data = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: data),
      let png = bitmap.representation(using: .png, properties: [:]) else {
    fatalError("Could not rasterize pattern: \(CommandLine.arguments[1])")
}
try png.write(to: URL(fileURLWithPath: CommandLine.arguments[2]))
