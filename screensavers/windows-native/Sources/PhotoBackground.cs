using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace LiteratureClock;
public sealed class PhotoBackground : IDisposable
{
    public record Photo(string Url,string Credit);
    record Loaded(Photo Photo,byte[] Data,BitmapImage Image);
    readonly int display;
    readonly HttpClient client = new() { Timeout=TimeSpan.FromSeconds(25) };
    readonly CancellationTokenSource lifetime = new();
    readonly Dictionary<string,(DateTime expires,Photo[] photos)> catalogues = new();
    readonly Dictionary<string,Dictionary<string,string>> queries=Catalogues.Read<Dictionary<string,Dictionary<string,string>>>("photo-providers.json");
    string configuration="", requestKey="";
    long activeMinute=-1, preloadMinute=-1;
    Task<Loaded?>? pending, preload;
    BitmapImage? image, previous;
    DateTime transition;
    public int Revision { get; private set; }
    public string Credit { get; private set; }="";
    public bool Transitioning => previous!=null && (DateTime.UtcNow-transition).TotalSeconds<.65;
    string CachePath => Path.Combine(Preferences.Folder,$"photo-{display}.json");
    public PhotoBackground(int display)
    {
        this.display=display;
        client.DefaultRequestHeaders.UserAgent.ParseAdd("LiteratureClock/0.1 (https://github.com/cdmoro/literature-clock)");
        try
        {
            var saved=JsonSerializer.Deserialize<LoadedCache>(File.ReadAllText(CachePath));
            if(saved!=null) { image=Decode(Convert.FromBase64String(saved.Data)); Credit=saved.Credit; }
        }
        catch(Exception e) when(e is IOException or JsonException or FormatException or NotSupportedException or UnauthorizedAccessException) { }
    }
    record LoadedCache(string Data,string Credit);
    static BitmapImage Decode(byte[] data)
    {
        var result=new BitmapImage(); result.BeginInit(); result.CacheOption=BitmapCacheOption.OnLoad; result.DecodePixelWidth=2560; result.StreamSource=new MemoryStream(data); result.EndInit(); result.Freeze(); return result;
    }
    public void Update(DateTimeOffset now,Preferences p,double width,double height)
    {
        var minute=now.ToUnixTimeSeconds()/60;
        var config=p.Provider+"/"+p.Category;
        if(config!=configuration) { configuration=config; activeMinute=-1; preloadMinute=-1; preload=null; requestKey=""; }
        if(activeMinute!=minute)
        {
            activeMinute=minute; requestKey=config+"/"+minute;
            pending=preloadMinute==minute?preload:Load(p.Provider,p.Category,minute,width,height,lifetime.Token);
            preload=null; preloadMinute=-1;
        }
        if(pending?.IsCompleted==true)
        {
            var loaded=pending.GetAwaiter().GetResult(); pending=null;
            if(loaded!=null)
            {
                previous=image; image=loaded.Image; Credit=loaded.Photo.Credit; transition=DateTime.UtcNow; Revision++;
                try
                {
                    Directory.CreateDirectory(Preferences.Folder);
                    File.WriteAllText(CachePath+".tmp",JsonSerializer.Serialize(new LoadedCache(Convert.ToBase64String(loaded.Data),Credit)));
                    File.Move(CachePath+".tmp",CachePath,true);
                }
                catch(Exception e) when(e is IOException or UnauthorizedAccessException) { }
            }
        }
        if(now.Second>=45 && image!=null && preloadMinute!=minute+1)
        { preloadMinute=minute+1; preload=Load(p.Provider,p.Category,minute+1,width,height,lifetime.Token); }
        if(!Transitioning) previous=null;
    }
    async Task<Loaded?> Load(string provider,string category,long minute,double width,double height,CancellationToken token)
    {
        try
        {
            Photo selected;
            if(provider=="picsum")
            {
                var factor=Math.Min(1,Math.Min(2560/width,1440/height));
                selected=new($"https://picsum.photos/seed/literature-clock-{minute}-{display}/{Math.Max(320,(int)(width*factor))}/{Math.Max(240,(int)(height*factor))}?blur=1","");
            }
            else
            {
                var topics=queries[provider].Keys.Order().ToArray();
                var all=!queries[provider].ContainsKey(category);
                var topic=all?topics[Catalogues.Index(topics.Length,minute,0)]:category;
                var key=provider+"/"+topic;
                if(!catalogues.TryGetValue(key,out var cached) || cached.expires<DateTime.UtcNow)
                {
                    var photos=await Search(provider,queries[provider][topic],token);
                    if(photos.Length==0) return null;
                    cached=(DateTime.UtcNow.AddHours(1),photos.OrderBy(x=>x.Url,StringComparer.Ordinal).ToArray()); catalogues[key]=cached;
                }
                selected=cached.photos[Catalogues.Index(cached.photos.Length,all?minute/topics.Length:minute,display)];
            }
            using var response=await client.GetAsync(selected.Url,HttpCompletionOption.ResponseHeadersRead,token);
            response.EnsureSuccessStatusCode();
            if(response.Content.Headers.ContentLength>12*1024*1024 || !(response.Content.Headers.ContentType?.MediaType?.StartsWith("image/")??false)) return null;
            using var stream=await response.Content.ReadAsStreamAsync(token);
            using var bytes=new MemoryStream(); var buffer=new byte[8192]; int count;
            while((count=await stream.ReadAsync(buffer,token))>0)
            { if(bytes.Length+count>12*1024*1024) return null; bytes.Write(buffer,0,count); }
            var content=bytes.ToArray(); return new(selected,content,Decode(content));
        }
        catch(Exception e) when(e is HttpRequestException or TaskCanceledException or IOException or JsonException or NotSupportedException or ArgumentException or InvalidOperationException) { return null; }
    }
    async Task<Photo[]> Search(string provider,string query,CancellationToken token)
    {
        var encoded=Uri.EscapeDataString(query);
        var url=provider=="nasa"?$"https://images-api.nasa.gov/search?q={encoded}&media_type=image&page_size=100":$"https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&generator=search&gsrsearch={encoded}&gsrnamespace=6&gsrlimit=50&prop=imageinfo&iiprop=url%7Cextmetadata%7Cmime&iiurlwidth=1280";
        using var response=await client.GetAsync(url,token); response.EnsureSuccessStatusCode();
        using var json=JsonDocument.Parse(await response.Content.ReadAsStringAsync(token));
        return Parse(provider,json.RootElement);
    }
    static string String(JsonElement item,string name) => item.TryGetProperty(name,out var value)?value.ToString():"";
    static string Plain(string text) => WebUtility.HtmlDecode(Regex.Replace(text,"<[^>]*>",""));
    public static Photo[] Parse(string provider,JsonElement root)
    {
        var photos=new List<Photo>();
        if(provider=="nasa" && root.TryGetProperty("collection",out var collection) && collection.TryGetProperty("items",out var items))
            foreach(var item in items.EnumerateArray())
            {
                if(!item.TryGetProperty("data",out var metadata) || metadata.GetArrayLength()==0 || !item.TryGetProperty("links",out var links)) continue;
                var first=metadata[0]; if(String(first,"description").Contains("copyright",StringComparison.OrdinalIgnoreCase)) continue;
                var link=links.EnumerateArray().FirstOrDefault(x=>String(x,"render")=="image" && String(x,"href").StartsWith("https://images-assets.nasa.gov/",StringComparison.Ordinal) && (String(x,"href").Contains("~medium.") || String(x,"rel")=="preview"));
                if(link.ValueKind==JsonValueKind.Undefined) continue;
                var author=String(first,"secondary_creator"); if(author.Length==0) author=String(first,"photographer"); if(author.Length==0) author="NASA";
                photos.Add(new(String(link,"href"),author.Contains("NASA")?author:"NASA / "+author));
            }
        if(provider=="commons" && root.TryGetProperty("query",out var query) && query.TryGetProperty("pages",out var pages))
            foreach(var page in pages.EnumerateArray())
            {
                if(!page.TryGetProperty("imageinfo",out var info) || info.GetArrayLength()==0) continue;
                var first=info[0]; if(!first.TryGetProperty("extmetadata",out var metadata)) continue;
                string Meta(string key)=>metadata.TryGetProperty(key,out var value)?String(value,"value"):"";
                if(!new[]{"cc0","cc0 1.0","cc0 1.0 universal"}.Contains(Meta("LicenseShortName").ToLowerInvariant()) || Meta("AttributionRequired")=="true") continue;
                if(!new[]{"image/jpeg","image/png"}.Contains(String(first,"mime"))) continue;
                var link=String(first,"thumburl"); if(!Uri.TryCreate(link,UriKind.Absolute,out var parsed) || parsed.Scheme!="https" || parsed.Host!="upload.wikimedia.org") continue;
                if(Meta("ImageDescription").Contains("copyright",StringComparison.OrdinalIgnoreCase)) continue;
                photos.Add(new(link,Plain(Meta("Artist"))));
            }
        return photos.ToArray();
    }
    public void Draw(Canvas canvas,double width,double height)
    {
        void Add(BitmapImage source,double opacity)=>canvas.Children.Add(new Image { Source=source,Width=width,Height=height,Stretch=Stretch.UniformToFill,Opacity=opacity });
        if(previous!=null) Add(previous,1);
        var t=Math.Clamp((DateTime.UtcNow-transition).TotalSeconds/.65,0,1); t=t*t*(3-2*t);
        if(image!=null) Add(image,previous==null?1:t);
    }
    public void Dispose() { lifetime.Cancel(); client.Dispose(); lifetime.Dispose(); }
}
