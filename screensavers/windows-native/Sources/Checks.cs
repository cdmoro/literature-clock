using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Windows;
using System.Windows.Media;

namespace LiteratureClock;
public static class Checks
{
    static void Assert(bool condition,string message) { if(!condition) throw new InvalidDataException(message); }
    static System.Collections.Generic.IEnumerable<T> Descendants<T>(DependencyObject root) where T:DependencyObject
    {
        if(root is T match) yield return match;
        foreach(var child in LogicalTreeHelper.GetChildren(root).OfType<DependencyObject>())
            foreach(var descendant in Descendants<T>(child)) yield return descendant;
    }
    public static int Run()
    {
        var app=new Application { ShutdownMode=ShutdownMode.OnExplicitShutdown };
        var data=new Catalogues();
        _ = new GlassEffect(); // Also validate the embedded compiled shader on software runners.
        Assert(data.Locales.Length==12,"Expected all twelve published native languages");
        Assert(Catalogues.Resolve("en-US",data.Locales)=="en-US","Exact locale resolution");
        Assert(Catalogues.Resolve("zh-Hant",data.Locales)=="zh-CN","Language fallback");
        Assert(Catalogues.Resolve("ja-JP",data.Locales)=="en-GB","Unsupported locale fallback");
        Assert(Catalogues.Index(3,10,0)!=Catalogues.Index(3,10,1),"Distinct monitor variants");
        Assert(GlassEffect.Radius(1,1920,1080)==0 && GlassEffect.Radius(.5,1920,1080)==28,"Glass corner fade");
        var tiles=Catalogues.Read<System.Collections.Generic.Dictionary<string,double[]>>("Patterns/tiles.json");
        foreach(var name in new[]{"christmas","halloween","valentine"})
        {
            Assert(Appearance.Patterns.Contains(name),"Seasonal pattern selectable: "+name);
            Assert(tiles.ContainsKey(name),"Seasonal tile dimensions: "+name);
            using var tile=Catalogues.Open("Patterns/"+name+".png");
            var bitmap=System.Windows.Media.Imaging.BitmapFrame.Create(tile,
                System.Windows.Media.Imaging.BitmapCreateOptions.None,System.Windows.Media.Imaging.BitmapCacheOption.OnLoad);
            Assert(bitmap.PixelWidth>0 && bitmap.PixelHeight>0,"Seasonal PNG decodes: "+name);
        }
        var p=new Preferences { Languages=["en-GB"],Safe=true,Move=false };
        Assert(p.QuoteAttribution=="below","Default quote attribution mode");
        foreach(var mode in new[]{"below","bottom-left","hidden"})
        {
            p.QuoteAttribution=mode;
            var json=JsonSerializer.Serialize(p);
            Assert(JsonSerializer.Deserialize<Preferences>(json)?.QuoteAttribution==mode,"Quote attribution preference roundtrip: "+mode);
        }
        Assert(p.Font=="default","Existing settings must retain the theme font");
        foreach(var choice in new[]{"default","serif","sans-serif","monospace"})
        {
            p.Font=choice;
            Assert(JsonSerializer.Deserialize<Preferences>(JsonSerializer.Serialize(p))?.Font==choice,"Font preference roundtrip: "+choice);
            if(choice=="default") continue;
            foreach(var locale in data.Locales)
                Assert(Appearance.Font("base",locale,choice).Source.StartsWith("Global "),"System composite font: "+choice+"/"+locale);
        }
        p.Font="default";
        foreach(var locale in data.Locales)
        {
            var rows=data.Get(locale); Assert(rows.Count>0,"Empty catalogue: "+locale);
            foreach(var pair in rows) Assert(pair.Value.All(q=>q.first!=null && q.time.Length>0 && q.last!=null),"Invalid highlights: "+locale);
            foreach(var theme in Appearance.Themes)
            {
                var family=Appearance.Font(theme,locale);
                var face=new Typeface(family,FontStyles.Normal,FontWeights.Normal,FontStretches.Normal);
                Assert(face.TryGetGlyphTypeface(out var glyph),"Missing font typeface: "+theme+"/"+locale);
                Assert(glyph.FontUri.IsFile && glyph.FontUri.LocalPath.StartsWith(Path.Combine(Path.GetTempPath(),"LiteratureClock"),StringComparison.OrdinalIgnoreCase),"System fallback instead of bundled font: "+theme+"/"+locale);
            }
        }
        var time=new DateTimeOffset(2026,10,11,12,0,0,TimeSpan.Zero);
        var (quote,language)=data.Select(time,p,0); Assert(quote.sfw,"Safe filter");
        p.Bilingual=true; p.Translation=language;
        Assert(data.Translate(quote,language,"12:00",p).notice==data.Text("bilingual_same"),"Same-language translation notice");
        p.Translation="es-ES";
        var bilingual=data.Translate(quote,language,"12:00",p);
        Assert(bilingual.quote==null || bilingual.quote.id==quote.id,"Bilingual must use shared ID");
        var fuzzyPreferences=new Preferences { FuzzyClock=true,Bilingual=true,Translation="es-ES",Safe=false,Progress="none" };
        var fuzzySurface=new ClockSurface(data,fuzzyPreferences,0,downloads:false);
        var original=data.Get("en-GB")["12:00"].First(q=>data.Translate(q,"en-GB","12:00",fuzzyPreferences).quote!=null);
        var translated=data.Translate(original,"en-GB","12:00",fuzzyPreferences).quote!;
        var fuzzyPassage=fuzzySurface.BuildPassage(original,"en-GB","12:00",1000,30,Colors.White,Colors.Red);
        var fuzzyTexts=Descendants<System.Windows.Controls.TextBlock>(fuzzyPassage)
            .Select(t=>new System.Windows.Documents.TextRange(t.ContentStart,t.ContentEnd).Text.Trim()).ToArray();
        Assert(fuzzyTexts.Length==2 && fuzzyTexts[0]==original.time && fuzzyTexts[1]==translated.time,"Fuzzy bilingual renders both time phrases without headings");
        fuzzyPreferences.Theme="book";
        fuzzyPassage=fuzzySurface.BuildPassage(original,"en-GB","12:00",1000,30,Colors.Black,Colors.Red);
        Assert(fuzzyPassage.Children.OfType<BookText>().Count()==2,"Book highlight wraps both fuzzy phrases");
        fuzzyPreferences.Translation="en-GB";
        fuzzyPassage=fuzzySurface.BuildPassage(original,"en-GB","12:00",1000,30,Colors.Black,Colors.Red);
        Assert(Descendants<System.Windows.Controls.TextBlock>(fuzzyPassage).Any(t=>t.Text==data.Text("bilingual_same")),"Fuzzy bilingual displays translation notices");
        var lineStyle=new System.Windows.Controls.TextBlock { FontSize=30,FontFamily=new FontFamily("Arial") };
        var phrase="It was a quarter past twelve";
        var balanced=ClockSurface.BalancedLines(phrase,lineStyle,180);
        Assert(balanced.Contains('\n') && balanced.Replace('\n',' ')==phrase,"Fuzzy balanced lines preserve words");
        var settingsWindow=new SettingsWindow(data,new Preferences { Palette="custom",CustomColor="#123456" });
        var sliders=Descendants<System.Windows.Controls.Slider>(settingsWindow).ToArray();
        var hex=Descendants<System.Windows.Controls.TextBox>(settingsWindow).Single(t=>t.MaxLength==7);
        Assert(sliders.Select(s=>s.Value).SequenceEqual(new double[]{18,52,86}),"HEX initializes RGB sliders");
        sliders[0].Value=200;
        Assert(hex.Text=="#C83456","RGB slider updates HEX without changing other channels");
        hex.Text="#ABCDEF";
        Assert(sliders.Select(s=>s.Value).SequenceEqual(new double[]{171,205,239}),"HEX updates RGB sliders");
        hex.Text="#12";
        Assert(sliders[0].Value==171,"Partial HEX input preserves current color");
        settingsWindow.Close();
        using var commons=JsonDocument.Parse("""{"query":{"pages":[{"imageinfo":[{"mime":"image/jpeg","thumburl":"https://upload.wikimedia.org/example.jpg","extmetadata":{"LicenseShortName":{"value":"CC BY-SA"}}}]}]}}""");
        Assert(PhotoBackground.Parse("commons",commons.RootElement).Length==0,"Reject Commons attribution licences");
        Console.WriteLine("Checked catalogues, fonts, monitor choices, bilingual identity and photo licences.");
        return 0;
    }
}
