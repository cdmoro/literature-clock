using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Windows.Media;
using Microsoft.Win32;

namespace LiteratureClock;
public static class Appearance
{
    public static readonly string[] Themes = ["base", "book", "terminal", "festive", "bohemian", "retro", "photo"];
    public static readonly string[] Palettes = ["default", "red", "pink", "green", "orange", "purple", "blue", "gray", "random", "custom"];
    public static readonly string[] Patterns = ["none", "random", "dots", "circles", "diagonal", "diagonal-wide", "grid", "zigzag", "waves", "noise", "mixed-stripes", "checkerboard", "cubes", "fans", "leaves", "vines", "contours", "woven", "zigzag-fine", "rain", "christmas", "winter", "halloween", "new-year", "autumn", "summer", "spring", "hearts", "reading", "space", "garden", "clouds", "constellations"];
    public static Color Color(string value) => (Color)ColorConverter.ConvertFromString(value);
    public static SolidColorBrush Brush(string value) => new(Color(value));
    public static SolidColorBrush Brush(Color color, double opacity = 1) => new(color) { Opacity = opacity };
    public static bool Dark(Preferences p) => p.Scheme == "dark" || p.Scheme == "system" && (Registry.GetValue(@"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize", "AppsUseLightTheme", 1) is int value && value == 0);
    public static string Background(Preferences p) => p.Theme == "photo" ? "photo" : p.Theme == "book" ? "default" : p.Background;
    public static Color Accent(Preferences p, bool dark, long minute, int display)
    {
        var colors = new Dictionary<string, string> { ["red"]="#ff3b30", ["pink"]="#ff2d55", ["green"]="#34c759", ["orange"]="#ff9500", ["purple"]="#af52de", ["blue"]="#007aff", ["gray"]="#8e8e93" };
        var palette = p.Palette == "random" ? Palettes[1 + Catalogues.Index(7, minute, display)] : p.Palette;
        if (palette == "custom") { try { return Color(p.CustomColor); } catch (FormatException) { return Color("#d24335"); } }
        if (colors.TryGetValue(palette, out var preset)) return Color(preset);
        return Color(p.Theme switch { "photo" => dark ? "#fd3622" : "#e33725", "book" => dark ? "#214cc6" : "#fbf719", "terminal" => dark ? "#1bec1b" : "#27702b", "festive" => "#e74c3c", "bohemian" => "#1abc9c", "retro" => dark ? "#f1ba08" : "#966a00", _ => "#d24335" });
    }
    public static Color Backdrop(Preferences p, bool dark, Color accent)
    {
        var mode = Background(p);
        if (mode == "plain") return Color(dark ? "#000000" : "#ffffff");
        if (p.Theme == "base" || mode == "tinted")
        {
            var neutral = Color(dark ? "#101016" : "#ffffff"); var f = dark ? .16 : .15;
            return System.Windows.Media.Color.FromRgb((byte)Math.Round(accent.R*f + neutral.R*(1-f)), (byte)Math.Round(accent.G*f + neutral.G*(1-f)), (byte)Math.Round(accent.B*f + neutral.B*(1-f)));
        }
        return Color(p.Theme switch { "photo" => dark ? "#111111" : "#dddddd", "book" => dark ? "#292621" : "#f5edd9", "terminal" => dark ? "#07120c" : "#edf5eb", "festive" => dark ? "#211323" : "#fff1f5", "bohemian" => dark ? "#142323" : "#eaf4ee", "retro" => dark ? "#17120b" : "#f4e8ce", _ => dark ? "#121212" : "#f2f2f2" });
    }
    public static Color Foreground(string theme, bool dark, Color accent) => theme switch { "terminal" => accent, "base" => Color(dark ? "#c9c9c5" : "#2f2e2c"), "photo" => Color(dark ? "#eeeeee" : "#111111"), _ => Color(dark ? "#e6e6e6" : "#212121") };
    static readonly Dictionary<string, FontFamily> fonts = new();
    public static FontFamily Font(string theme, string locale)
    {
        var language = locale.Split('-')[0];
        var key = theme switch { "book" => "librebaskerville", "terminal" => "b612mono", "festive" => "borel", "bohemian" => "comfortaa", "retro" => "vt323", "photo" => "abrilfatface", _ => "specialelite" };
        key = (theme, language) switch
        {
            ("base", "ar") or ("book", "ar") => "marhey", ("base", "ru") => "pangolin", ("base", "el") or ("bohemian", "el") => "sansation",
            ("book", "ru" or "el") => "literata", ("terminal", "ar") => "cascadiacode", ("terminal", "eo") => "lxgwwenkaimonotc", ("terminal", "ru") => "jetbrainsmono", ("terminal", "el") => "victormono",
            ("festive", "ar") => "playpensansarabic", ("festive", "eo") => "playwritear", ("festive", "ru") => "pacifico", ("festive", "el") => "comicrelief",
            ("bohemian", "ar") => "zain", ("photo", "ar") => "lalezar", ("photo", "ru") => "russoone", ("photo", "el") => "delagothicone",
            ("retro", "ar" or "el") => "handjet", ("retro", "ru") => "dotgothic16", ("terminal" or "retro", "zh") => "zcoolqingkehuangyou", (_, "zh") => "zcoolkuaile", _ => key
        };
        if (!fonts.TryGetValue(key, out var font))
        {
            var bytes = Catalogues.Open("Fonts/" + key + "/" + FontFiles[key]);
            var path = Path.Combine(Path.GetTempPath(), "LiteratureClock", key + ".ttf");
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            using (bytes) using (var output = File.Create(path)) bytes.CopyTo(output);
            var directory = new Uri(Path.GetDirectoryName(path)! + Path.DirectorySeparatorChar, UriKind.Absolute);
            var discovered = Fonts.GetFontFamilies(directory).FirstOrDefault() ?? throw new InvalidDataException("Missing bundled font: " + key);
            var familyName = discovered.FamilyNames.Values.First();
            font = new FontFamily(directory.AbsoluteUri + "#" + familyName);
            fonts[key] = font;
        }
        return font;
    }
    static readonly Dictionary<string, string> FontFiles = new()
    {
        ["abrilfatface"]="AbrilFatface-Regular.ttf", ["b612mono"]="B612Mono-Regular.ttf", ["borel"]="Borel-Regular.ttf", ["cascadiacode"]="CascadiaCode[wght].ttf", ["comfortaa"]="Comfortaa[wght].ttf", ["comicrelief"]="ComicRelief-Regular.ttf", ["delagothicone"]="DelaGothicOne-Regular.ttf", ["dotgothic16"]="DotGothic16-Regular.ttf", ["handjet"]="Handjet[ELGR,ELSH,wght].ttf", ["jetbrainsmono"]="JetBrainsMono[wght].ttf", ["lalezar"]="Lalezar-Regular.ttf", ["librebaskerville"]="LibreBaskerville[wght].ttf", ["literata"]="Literata[opsz,wght].ttf", ["lxgwwenkaimonotc"]="LXGWWenKaiMonoTC-Regular.ttf", ["marhey"]="Marhey[wght].ttf", ["pacifico"]="Pacifico-Regular.ttf", ["pangolin"]="Pangolin-Regular.ttf", ["playpensansarabic"]="PlaypenSansArabic[wght].ttf", ["playwritear"]="PlaywriteAR[wght].ttf", ["russoone"]="RussoOne-Regular.ttf", ["sansation"]="Sansation-Regular.ttf", ["specialelite"]="SpecialElite-Regular.ttf", ["victormono"]="VictorMono[wght].ttf", ["vt323"]="VT323-Regular.ttf", ["zain"]="Zain-Regular.ttf", ["zcoolkuaile"]="ZCOOLKuaiLe-Regular.ttf", ["zcoolqingkehuangyou"]="ZCOOLQingKeHuangYou-Regular.ttf"
    };
}
