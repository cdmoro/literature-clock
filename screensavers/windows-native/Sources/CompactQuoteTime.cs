using System;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace LiteratureClock;

internal sealed class CompactQuoteTime
{
    // Keep the catalogue formats and punctuation rules in sync with
    // quote-markup.ts and CompactQuoteTime.swift.
    private const string Clock = @"\p{Nd}{1,2}(?:\p{Zs}*[:：.]\p{Zs}*\p{Nd}{2})?";
    private const string Meridiem = @"(?:[ap]m|[ap]\.\p{Zs}*m\.?|[πμ]μ|[πμ]\.\p{Zs}*μ\.?|صباحًا|صباحاً|مساءً|مساء|[صم]|утра|дня|вечера|ночи)";
    private const string EastAsian = @"(?:(?:午前|午後|凌晨|早上|上午|中午|下午|晚上|傍晚)\p{Zs}*)?(?:\p{Nd}{1,2}[時时点點](?:\p{Nd}{1,2}[分]?|半)?|\p{Nd}{1,2}[:：]\p{Nd}{2})";
    private static readonly Regex Compact = new(
        @"\A((?:[«‹]\p{Zs}+|\p{P})*?)(" + Clock + @"\p{Zs}*" + Meridiem +
        @"|\p{Nd}{1,2}\p{Zs}*h(?:\p{Zs}*\p{Nd}{2})?|\p{Nd}{1,2}(?:\p{Zs}*[:：.]\p{Zs}*\p{Nd}{2})?\p{Zs}*Uhr|" +
        EastAsian + @"|\p{Nd}{1,2}\.\p{Nd}{2})((?:\p{Zs}+[»›]|\p{P})*)\z",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    private static readonly Regex Leading = new(@"(?:[«‹]\p{Zs}+|\p{P})+\z");
    private static readonly Regex Trailing = new(@"\A(?:\p{P}|\p{Zs}+[»›]|[\u00a0\u202f\u2009]+[!?:;])*");
    private static readonly Regex FrenchTrailing = new(@"\A(?:\p{P}|\p{Zs}+[»›!?:;])*");

    private readonly string before, prefix, time, suffix, after;

    private CompactQuoteTime(string before, string prefix, string time, string suffix, string after)
    {
        this.before = before;
        this.prefix = prefix;
        this.time = time;
        this.suffix = suffix;
        this.after = after;
    }

    internal static CompactQuoteTime? Parse(string before, string time, string after, string locale)
    {
        var match = Compact.Match(time);
        if (!match.Success) return null;
        var leading = Leading.Match(before);
        var startIndex = leading.Success ? leading.Index : before.Length;
        var endIndex = (locale.StartsWith("fr", StringComparison.Ordinal) ? FrenchTrailing : Trailing).Match(after).Length;
        return new CompactQuoteTime(before[..startIndex], before[startIndex..] + match.Groups[1].Value,
            match.Groups[2].Value, match.Groups[3].Value + after[..endIndex], after[endIndex..]);
    }

    internal string Text => prefix + time + suffix;

    internal (string Before, string Time, string After) DisplayParts(bool keepTogether)
    {
        if (!keepTogether) return (before + prefix, time, suffix + after);
        const string joiner = "\u2060";
        return (before + Join(prefix) + (prefix.Length > 0 ? joiner : ""),
            Join(time), (suffix.Length > 0 ? joiner : "") + Join(suffix) + after);
    }

    private static string Join(string text)
    {
        var result = new StringBuilder();
        var elements = StringInfo.GetTextElementEnumerator(text);
        string? previous = null;
        while (elements.MoveNext())
        {
            var current = elements.GetTextElement();
            if (previous != null && !ShapesTogether(previous[0], current[0])) result.Append('\u2060');
            result.Append(current);
            previous = current;
        }
        return result.ToString();
    }

    private static bool ShapesTogether(char left, char right) =>
        char.IsDigit(left) && char.IsDigit(right) ||
        char.IsLetter(left) && char.IsLetter(right) &&
        (left <= 127) == (right <= 127) &&
        left is not (>= '\u3400' and <= '\u9fff') && right is not (>= '\u3400' and <= '\u9fff');
}
