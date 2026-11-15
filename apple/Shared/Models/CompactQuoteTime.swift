import Foundation

// Keep the catalogue formats and punctuation rules in sync with
// quote-markup.ts and CompactQuoteTime.cs.
struct CompactQuoteTime {
    typealias Parts = (before: String, time: String, after: String)

    let before: String
    let prefix: String
    let time: String
    let suffix: String
    let after: String

    private static let clock = #"\p{Nd}{1,2}(?:\p{Zs}*[:：.]\p{Zs}*\p{Nd}{2})?"#
    private static let meridiem = #"(?:[ap]m|[ap]\.\p{Zs}*m\.?|[πμ]μ|[πμ]\.\p{Zs}*μ\.?|صباحًا|صباحاً|مساءً|مساء|[صم]|утра|дня|вечера|ночи)"#
    private static let eastAsian = #"(?:(?:午前|午後|凌晨|早上|上午|中午|下午|晚上|傍晚)\p{Zs}*)?(?:\p{Nd}{1,2}[時时点點](?:\p{Nd}{1,2}[分]?|半)?|\p{Nd}{1,2}[:：]\p{Nd}{2})"#
    private static let compact = try! NSRegularExpression(
        pattern: #"\A((?:[«‹]\p{Zs}+|\p{P})*?)(\#(clock)\p{Zs}*\#(meridiem)|\p{Nd}{1,2}\p{Zs}*h(?:\p{Zs}*\p{Nd}{2})?|\p{Nd}{1,2}(?:\p{Zs}*[:：.]\p{Zs}*\p{Nd}{2})?\p{Zs}*Uhr|\#(eastAsian)|\p{Nd}{1,2}\.\p{Nd}{2})((?:\p{Zs}+[»›]|\p{P})*)\z"#,
        options: .caseInsensitive
    )
    private static let leading = try! NSRegularExpression(pattern: #"(?:[«‹]\p{Zs}+|\p{P})+\z"#)
    private static let trailing = try! NSRegularExpression(
        pattern: #"\A(?:\p{P}|\p{Zs}+[»›]|[\u00a0\u202f\u2009]+[!?:;])*"#
    )
    private static let frenchTrailing = try! NSRegularExpression(
        pattern: #"\A(?:\p{P}|\p{Zs}+[»›!?:;])*"#
    )

    init?(_ parts: Parts, locale: String) {
        let originalTime = parts.time as NSString
        let originalBefore = parts.before as NSString
        let originalAfter = parts.after as NSString
        guard let match = Self.compact.firstMatch(in: parts.time, range: NSRange(location: 0, length: originalTime.length)) else {
            return nil
        }

        let start = Self.leading.firstMatch(in: parts.before, range: NSRange(location: 0, length: originalBefore.length))?.range
        let end = (locale.hasPrefix("fr") ? Self.frenchTrailing : Self.trailing).firstMatch(
            in: parts.after, range: NSRange(location: 0, length: originalAfter.length)
        )?.range.length ?? 0
        let startIndex = start?.location ?? originalBefore.length

        before = originalBefore.substring(to: startIndex)
        prefix = originalBefore.substring(from: startIndex) + originalTime.substring(with: match.range(at: 1))
        time = originalTime.substring(with: match.range(at: 2))
        suffix = originalTime.substring(with: match.range(at: 3)) + originalAfter.substring(to: end)
        after = originalAfter.substring(from: end)
    }

    var text: String { prefix + time + suffix }

    // WORD JOINER keeps punctuation and spaces with the time while preserving
    // their widths. Leave letter and digit runs shaped by the text engine.
    func displayParts(keepTogether: Bool) -> Parts {
        guard keepTogether else { return (before + prefix, time, suffix + after) }
        let joiner = "\u{2060}"
        func joined(_ value: String) -> String {
            var result = ""
            var previous: Character?
            for character in value {
                if let previous, !Self.shapesTogether(previous, character) {
                    result += joiner
                }
                result.append(character)
                previous = character
            }
            return result
        }
        return (before + joined(prefix) + (prefix.isEmpty ? "" : joiner),
                joined(time),
                (suffix.isEmpty ? "" : joiner) + joined(suffix) + after)
    }

    private static func shapesTogether(_ left: Character, _ right: Character) -> Bool {
        func isCJK(_ character: Character) -> Bool {
            character.unicodeScalars.contains { (0x3400...0x9fff).contains($0.value) }
        }
        return (left.isNumber && right.isNumber) ||
            (left.isLetter && right.isLetter && left.isASCII == right.isASCII && !isCJK(left) && !isCJK(right))
    }

    static func display(_ parts: Parts, locale: String) -> Parts {
        guard let compact = Self(parts, locale: locale) else { return parts }
        return compact.displayParts(keepTogether: true)
    }
}
