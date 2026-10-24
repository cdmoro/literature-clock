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
        var p=new Preferences { Languages=["en-GB"],Safe=true,Move=false };
        Assert(p.QuoteAttribution=="below","Default quote attribution mode");
        foreach(var mode in new[]{"below","bottom-left","hidden"})
        {
            p.QuoteAttribution=mode;
            var json=JsonSerializer.Serialize(p);
            Assert(JsonSerializer.Deserialize<Preferences>(json)?.QuoteAttribution==mode,"Quote attribution preference roundtrip: "+mode);
        }
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
        using var commons=JsonDocument.Parse("""{"query":{"pages":[{"imageinfo":[{"mime":"image/jpeg","thumburl":"https://upload.wikimedia.org/example.jpg","extmetadata":{"LicenseShortName":{"value":"CC BY-SA"}}}]}]}}""");
        Assert(PhotoBackground.Parse("commons",commons.RootElement).Length==0,"Reject Commons attribution licences");
        Console.WriteLine("Checked catalogues, fonts, monitor choices, bilingual identity and photo licences.");
        return 0;
    }
}
