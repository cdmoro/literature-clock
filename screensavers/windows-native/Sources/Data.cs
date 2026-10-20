using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Json;

namespace LiteratureClock;

public record Quote(string? id, string first, string time, string last, string title, string author, bool sfw);
public sealed class Preferences
{
    public string Theme { get; set; } = "base";
    public string Scheme { get; set; } = "dark";
    public string[] Languages { get; set; } = [];
    public bool Move { get; set; } = true;
    public bool ShowTime { get; set; } = true;
    public bool HideTitle { get; set; }
    public bool Safe { get; set; } = true;
    public bool Bilingual { get; set; }
    public string Translation { get; set; } = "";
    public string Progress { get; set; } = "background";
    public string Palette { get; set; } = "default";
    public string CustomColor { get; set; } = "#d24335";
    public string Background { get; set; } = "default";
    public string Pattern { get; set; } = "none";
    public string PatternSize { get; set; } = "1";
    public string Effect { get; set; } = "none";
    public string Provider { get; set; } = "picsum";
    public string Category { get; set; } = "all";
    public static string Folder => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Literature Clock");
    public static Preferences Load()
    {
        try { return JsonSerializer.Deserialize<Preferences>(File.ReadAllText(Path.Combine(Folder, "settings.json"))) ?? new(); }
        catch (Exception e) when (e is IOException or JsonException or UnauthorizedAccessException) { return new(); }
    }
    public void Save()
    {
        Directory.CreateDirectory(Folder);
        var path = Path.Combine(Folder, "settings.json");
        File.WriteAllText(path + ".tmp", JsonSerializer.Serialize(this));
        File.Move(path + ".tmp", path, true);
    }
}
public sealed class Catalogues
{
    static readonly Assembly Assembly = typeof(Catalogues).Assembly;
    static readonly string ResourcePrefix = Assembly.GetManifestResourceNames().First(x => x.EndsWith(".Resources.locales.json", StringComparison.Ordinal));
    public static Stream Open(string name)
    {
        var resource = ResourcePrefix[..^"locales.json".Length] + name.Replace('/', '.').Replace('\\', '.');
        return Assembly.GetManifestResourceStream(resource) ?? throw new InvalidDataException(name);
    }
    public static T Read<T>(string name) => JsonSerializer.Deserialize<T>(Open(name)) ?? throw new InvalidDataException(name);
    public readonly string[] Locales = Read<string[]>("locales.json");
    readonly Dictionary<string, Dictionary<string, string>> labels = Read<Dictionary<string, Dictionary<string, string>>>("settings.json");
    readonly Dictionary<string, Dictionary<string, Quote[]>> cache = new();
    readonly Dictionary<string, DateTime> retry = new();
    public string SystemLocale => Resolve(CultureInfo.CurrentUICulture.Name, Locales);
    public static string Resolve(string name, string[] supported)
    {
        name = name.Replace('_', '-');
        return supported.FirstOrDefault(x => x.Equals(name, StringComparison.OrdinalIgnoreCase))
            ?? supported.FirstOrDefault(x => x.Split('-')[0].Equals(name.Split('-')[0], StringComparison.OrdinalIgnoreCase)) ?? "en-GB";
    }
    public string Text(string key) => labels.GetValueOrDefault(SystemLocale)?.GetValueOrDefault(key) ?? labels["en-GB"].GetValueOrDefault(key) ?? key;
    public Dictionary<string, Quote[]> Get(string locale)
    {
        if (cache.TryGetValue(locale, out var rows)) return rows;
        if (retry.TryGetValue(locale, out var due) && due > DateTime.UtcNow) return new();
        try
        {
            rows = Read<Dictionary<string, Quote[]>>("Quotes/" + locale + ".json");
            if (rows.Count == 0) throw new InvalidDataException(locale);
            cache[locale] = rows; retry.Remove(locale); return rows;
        }
        catch (Exception e) when (e is IOException or JsonException or UnauthorizedAccessException)
        { retry[locale] = DateTime.UtcNow.AddSeconds(5); return new(); }
    }
    public bool RetryDue => retry.Values.Any(x => x <= DateTime.UtcNow);
    public static int Index(int count, long minute, int display) => (int)(((minute + Math.Max(0, display)) % Math.Max(1, count) + Math.Max(1, count)) % Math.Max(1, count));
    public (Quote quote, string locale) Select(DateTimeOffset now, Preferences p, int display)
    {
        var minute = now.ToString("HH:mm", CultureInfo.InvariantCulture);
        var selected = p.Languages.Where(Locales.Contains).ToArray();
        if (selected.Length == 0) selected = [SystemLocale];
        Quote[] Available(string locale) => (Get(locale).GetValueOrDefault(minute) ?? []).Where(q => !p.Safe || q.sfw).ToArray();
        var languages = selected.Where(x => Available(x).Length > 0).ToArray();
        if (languages.Length == 0) languages = selected;
        var locale = languages[Index(languages.Length, now.Hour * 60 + now.Minute, display)];
        foreach (var candidate in new[] { locale, "en-GB" }.Distinct())
        {
            var rows = Available(candidate);
            if (rows.Length > 0) return (rows[Index(rows.Length, now.ToUnixTimeSeconds() / 60, display)], candidate);
        }
        if (retry.Count > 0) return (new(null, Text("native_resources_unavailable"), "", "", "", "", true), locale);
        var notices = Read<Dictionary<string, Quote>>("fallback.json");
        return (notices.GetValueOrDefault(locale, notices["en-GB"]) with { time = minute }, locale);
    }
    public (Quote? quote, string notice) Translate(Quote q, string locale, string minute, Preferences p)
    {
        if (!p.Bilingual) return (null, "");
        if (!Locales.Contains(p.Translation)) return (null, Text("bilingual_select_prompt"));
        if (locale == p.Translation) return (null, Text("bilingual_same"));
        var translated = (Get(p.Translation).GetValueOrDefault(minute) ?? []).FirstOrDefault(x => q.id != null && x.id == q.id && (!p.Safe || x.sfw));
        return (translated, translated == null ? Text("bilingual_unavailable") : "");
    }
}
