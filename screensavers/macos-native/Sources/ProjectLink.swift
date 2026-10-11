import AppKit

/// A standard selectable AppKit hyperlink with a visible link style and hand cursor.
final class ProjectLink: NSTextField {
    init(title: String) {
        super.init(frame: .zero)
        isEditable = false
        isSelectable = true
        isBordered = false
        drawsBackground = false
        allowsEditingTextAttributes = true
        attributedStringValue = NSAttributedString(string: title + " ↗", attributes: [
            .link: URL(string: "https://github.com/cdmoro/literature-clock")!,
            .foregroundColor: NSColor.linkColor,
            .underlineStyle: NSUnderlineStyle.single.rawValue,
            .font: NSFont.systemFont(ofSize: NSFont.systemFontSize)
        ])
    }
    required init?(coder: NSCoder) { super.init(coder: coder) }
    override func resetCursorRects() {
        super.resetCursorRects()
        addCursorRect(bounds, cursor: .pointingHand)
    }
}
