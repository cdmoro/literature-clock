import AppKit

/// A standard selectable AppKit hyperlink with a visible link style and hand cursor.
final class ProjectLink: NSTextField {
    init(title: String, prefix: String = "") {
        super.init(frame: .zero)
        isEditable = false
        isSelectable = true
        isBordered = false
        drawsBackground = false
        allowsEditingTextAttributes = true
        let text = NSMutableAttributedString(string: prefix + title, attributes: [
            .foregroundColor: NSColor.labelColor,
            .font: NSFont.systemFont(ofSize: NSFont.systemFontSize)
        ])
        let linkRange = NSRange(location: (prefix as NSString).length, length: (title as NSString).length)
        text.addAttributes([
            .link: URL(string: "https://github.com/cdmoro/literature-clock")!,
            .foregroundColor: NSColor.linkColor,
            .underlineStyle: NSUnderlineStyle.single.rawValue
        ], range: linkRange)
        attributedStringValue = text
    }
    required init?(coder: NSCoder) { super.init(coder: coder) }
    override func resetCursorRects() {
        super.resetCursorRects()
        addCursorRect(bounds, cursor: .pointingHand)
    }
}
