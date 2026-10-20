using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Media;
using System.Windows.Media.Effects;
using System.Windows.Media.Imaging;
using System.Windows.Media.Animation;
using System.Windows.Media.Media3D;
using System.Windows.Shapes;

namespace LiteratureClock;
public sealed class ClockSurface : Canvas
{
    readonly Catalogues data;
    readonly Preferences p;
    readonly int display;
    readonly bool downloads;
    readonly DateTimeOffset started = DateTimeOffset.Now;
    readonly Canvas scene = new();
    readonly Canvas backdrop = new();
    readonly StackPanel passage = new();
    readonly TextBlock clock = new() { FontFamily = new FontFamily("Segoe UI"), FontWeight = FontWeights.Bold };
    readonly TextBlock clockHalo = new() { FontFamily = new FontFamily("Segoe UI"), FontWeight = FontWeights.Bold };
    readonly TextBlock credit = new() { FontSize = 11 };
    readonly Rectangle progress = new();
    readonly Canvas effects = new();
    readonly Random effectRandom = new();
    string effectKey = "";
    readonly PhotoBackground photo;
    GlassEffect? glass;
    string minute = "", layoutKey = "", backgroundKey = "";
    bool outlineForPhoto, outlineForPattern;
    Color outlineColor;
    Quote? quote;
    string locale = "en-GB";
    readonly Dictionary<string, BitmapImage> images = new();
    readonly Dictionary<string, double[]> tiles = Catalogues.Read<Dictionary<string,double[]>>("Patterns/tiles.json");
    public ClockSurface(Catalogues data, Preferences p, int display, bool downloads=true)
    {
        this.data=data; this.p=p; this.display=display; this.downloads=downloads;
        ClipToBounds=true;
        scene.Children.Add(backdrop); scene.Children.Add(effects); scene.Children.Add(clockHalo); scene.Children.Add(clock); scene.Children.Add(passage); scene.Children.Add(credit);
        Children.Add(scene); Children.Add(progress);
        photo=new PhotoBackground(display);
        Loaded += (_, _) => CompositionTarget.Rendering += Frame;
        Unloaded += (_, _) => { CompositionTarget.Rendering -= Frame; effects.Children.Clear(); photo.Dispose(); };
        if (p.Progress.StartsWith("glass-") && (RenderCapability.Tier >> 16) >= 2 && RenderCapability.IsPixelShaderVersionSupported(3,0))
        {
            try { glass=new GlassEffect(); progress.Effect=glass; }
            catch (IOException) { glass=null; }
        }
    }
    BitmapImage Image(string file)
    {
        if (!images.TryGetValue(file,out var image))
        {
            image=new BitmapImage(); image.BeginInit(); using(var stream=Catalogues.Open(file)) { image.StreamSource=stream; image.CacheOption=BitmapCacheOption.OnLoad; image.EndInit(); } image.Freeze(); images[file]=image;
        }
        return image;
    }
    ImageBrush Tile(string file, double w,double h,double opacity=1) => new(Image(file)) { TileMode=TileMode.Tile, ViewportUnits=BrushMappingMode.Absolute, Viewport=new Rect(0,0,w,h), Stretch=Stretch.Fill, Opacity=opacity };
    void Fill(Brush brush) => backdrop.Children.Add(new Rectangle { Width=ActualWidth, Height=ActualHeight, Fill=brush });
    public void Refresh() => Frame(null,EventArgs.Empty);
    void Frame(object? sender, EventArgs e)
    {
        if (ActualWidth<1 || ActualHeight<1) return;
        var now=DateTimeOffset.Now; var newMinute=now.ToString("HH:mm",CultureInfo.InvariantCulture);
        var absoluteMinute=now.ToUnixTimeSeconds()/60;
        if (newMinute!=minute || data.RetryDue)
        {
            (quote,locale)=data.Select(now,p,display); minute=newMinute; layoutKey="";
        }
        var dark=Appearance.Dark(p); var accent=Appearance.Accent(p,dark,absoluteMinute,display);
        var foreground=Appearance.Foreground(p.Theme,dark,accent);
        var mode=Appearance.Background(p);
        outlineForPhoto=mode=="photo";
        if(mode=="photo" && downloads) photo.Update(now,p,ActualWidth,ActualHeight);
        var pattern=p.Theme is "book" or "photo" ? "none" : p.Pattern;
        if(pattern=="random") pattern=Appearance.Patterns[2+Catalogues.Index(Appearance.Patterns.Length-2,absoluteMinute,display)];
        outlineForPattern=pattern!="none";
        outlineColor=Appearance.Backdrop(p,dark,accent);
        var patternSize = new[]{"0.5","1","1.5","2","3"}.Contains(p.PatternSize) ? double.Parse(p.PatternSize,CultureInfo.InvariantCulture) : 1;
        var key=$"{ActualWidth}|{ActualHeight}|{dark}|{accent}|{pattern}|{patternSize}|{photo.Revision}";
        if(key!=backgroundKey || photo.Transitioning)
        {
            backdrop.Children.Clear(); Fill(Appearance.Brush(Appearance.Backdrop(p,dark,accent)));
            if(mode=="photo")
            {
                photo.Draw(backdrop,ActualWidth,ActualHeight);
                Fill(Appearance.Brush(Appearance.Color(dark ? "#000000" : "#ffffff"),64.0/255));
            }
            if(mode=="default" || mode=="photo")
            {
                if(p.Theme=="festive") Fill(new LinearGradientBrush(Appearance.Color(dark ? "#011b1b" : "#fad0c4"),Appearance.Color(dark ? "#43162c" : "#ffd1ff"),45) { Opacity=mode=="photo"?.4:1 });
                if(p.Theme=="book") Fill(Tile("Backgrounds/book-paper-seamless.png",420,420,dark?.22:.65));
                if(p.Theme=="retro" && mode!="photo") Fill(Tile("Backgrounds/scanlines-bg-"+(dark?"dark":"light")+".jpg",1,3));
                if(p.Theme=="terminal" || p.Theme=="retro" && mode=="photo")
                    for(double y=0;y<ActualHeight;y+=p.Theme=="terminal"?4:3)
                    { var line=new Rectangle { Width=ActualWidth,Height=1,Fill=Brushes.Black,Opacity=p.Theme=="terminal"?.13:.2 }; SetTop(line,y); backdrop.Children.Add(line); }
            }
            if(tiles.TryGetValue(pattern,out var dimensions)) Fill(Tile("Patterns/"+pattern+".png",dimensions[0]*patternSize,dimensions[1]*patternSize));
            backgroundKey=key;
        }
        effects.Width=ActualWidth; effects.Height=ActualHeight;
        var currentEffectKey=$"{ActualWidth}|{ActualHeight}|{p.Effect}|{dark}|{accent}|{mode}";
        if(effectKey!=currentEffectKey) { BuildEffects(dark,accent); effectKey=currentEffectKey; }
        scene.Width=backdrop.Width=ActualWidth; scene.Height=backdrop.Height=ActualHeight;
        var outlineActive=outlineForPhoto || outlineForPattern;
        clock.Text=minute; clock.FontSize=Math.Max(10,Math.Min(20,ActualWidth*.013)); clock.Foreground=Appearance.Brush(foreground);
        clock.Effect=null;
        clockHalo.Text=minute; clockHalo.FontSize=clock.FontSize; clockHalo.Foreground=clock.Foreground;
        clockHalo.Effect=mode=="photo"?new DropShadowEffect { Color=Appearance.Color(dark?"#1c1c1c":"#dfdfdf"),BlurRadius=12,ShadowDepth=0,Opacity=1,RenderingBias=RenderingBias.Performance }:null;
        clock.Visibility=p.ShowTime?Visibility.Visible:Visibility.Hidden; clock.Measure(new Size(ActualWidth,100));
        clockHalo.Visibility=p.ShowTime && mode=="photo"?Visibility.Visible:Visibility.Hidden; clockHalo.Measure(new Size(ActualWidth,100));
        SetLeft(clock,(ActualWidth-clock.DesiredSize.Width)/2); SetTop(clock,26);
        SetLeft(clockHalo,(ActualWidth-clockHalo.DesiredSize.Width)/2); SetTop(clockHalo,26);
        credit.Text=mode=="photo"?photo.Credit:""; credit.Foreground=Appearance.Brush(foreground,.75); SetLeft(credit,16); SetTop(credit,ActualHeight-28);
        var areaTop=p.ShowTime?26+clock.DesiredSize.Height+16:0;
        var layout=$"{ActualWidth}|{ActualHeight}|{dark}|{accent}|{minute}|{locale}|{p.Theme}|{mode}|{pattern}";
        if(quote!=null && layoutKey!=layout)
        {
            var width=ActualWidth*.76; var limit=Math.Min(ActualHeight*.65,Math.Max(1,ActualHeight-areaTop-(mode=="photo"?48:4)));
            double low=1,high=Math.Min(ActualWidth*.043,ActualHeight*.12);
            for(int i=0;i<16;i++)
            {
                var size=(low+high)/2; BuildPassage(quote,width,size,foreground,accent);
                passage.Measure(new Size(width,double.PositiveInfinity));
                if(passage.DesiredSize.Height<=limit) low=size; else high=size;
            }
            BuildPassage(quote,width,low,foreground,accent); passage.Measure(new Size(width,double.PositiveInfinity));
            passage.CacheMode=new BitmapCache { RenderAtScale=VisualTreeHelper.GetDpi(this).DpiScaleX };
            passage.Effect=mode=="photo"?new DropShadowEffect { Color=Appearance.Color(dark?"#1c1c1c":"#dfdfdf"),BlurRadius=12,ShadowDepth=0,Opacity=1 }:null;
            layoutKey=layout;
        }
        var elapsed=(now-started).TotalSeconds*(1+display*.12);
        var centre=Math.Clamp((ActualHeight-passage.DesiredSize.Height)/2,areaTop,Math.Max(areaTop,ActualHeight-passage.DesiredSize.Height));
        var travel=Math.Min(ActualHeight*.055,Math.Max(0,Math.Min(centre-areaTop,ActualHeight-passage.DesiredSize.Height-centre)));
        SetLeft(passage,(ActualWidth-passage.Width)/2+(p.Move?Math.Sin(elapsed/12)*ActualWidth*.045:0));
        SetTop(passage,centre+(p.Move?-Math.Sin(elapsed/17)*travel:0));
        var fraction=(now.ToUnixTimeMilliseconds()%60000)/60000.0;
        var progressColor=p.Theme=="photo"?Appearance.Color(dark?"#d7d7d7":"#282826"):foreground;
        progress.Visibility=p.Progress=="none"?Visibility.Hidden:Visibility.Visible;
        if(glass!=null)
        {
            // VisualBrush samples the same live composition, including the photo crossfade.
            // For background glass the passage stays above the progress; clock is refracted.
            if(p.Progress=="glass-background")
            {
                if(scene.Children.Contains(passage)) { scene.Children.Remove(passage); Children.Add(passage); }
                SetZIndex(passage,2);
            }
            progress.Width=ActualWidth; progress.Height=ActualHeight; SetTop(progress,0);
            progress.Fill=new VisualBrush(scene) { Stretch=Stretch.Fill, ViewboxUnits=BrushMappingMode.Absolute, Viewbox=new Rect(0,0,ActualWidth,ActualHeight) };
            glass.Geometry=new Point4D(ActualWidth,ActualHeight,fraction,GlassEffect.Radius(fraction,ActualWidth,ActualHeight));
            glass.Tint=new Point4D(progressColor.R/255.0,progressColor.G/255.0,progressColor.B/255.0,p.Progress=="glass-foreground"?.025:.1);
        }
        else
        {
            var background=p.Progress is "background" or "glass-background" or "glass-foreground";
            progress.Width=ActualWidth*fraction; progress.Height=background?ActualHeight:3;
            progress.Fill=Appearance.Brush(background?progressColor:accent,background?.1:.7);
            SetTop(progress,p.Progress=="top"||background?0:ActualHeight-3);
            if(background && scene.Children.Contains(passage)) { scene.Children.Remove(passage); Children.Add(passage); SetZIndex(passage,2); }
        }
    }
    void BuildEffects(bool dark,Color accent)
    {
        effects.Children.Clear();
        if(p.Theme is "book" or "photo" || p.Effect=="none" || Appearance.Background(p)=="photo") return;
        var count=Math.Min(260,Math.Max(24,(int)(ActualWidth*ActualHeight/(p.Effect=="stars"?8000:p.Effect=="dust-v2"?6500:p.Effect=="dust"?9000:8500))));
        var color=p.Effect is "snow" or "stars"?Appearance.Foreground(p.Theme,dark,accent):Appearance.Color("#ffd391");
        for(var i=0;i<count;i++)
        {
            var size=p.Effect=="snow"?1.1+effectRandom.NextDouble()*1.9:p.Effect=="dust"?.9+effectRandom.NextDouble()*2:p.Effect=="dust-v2"?.6+Math.Pow(effectRandom.NextDouble(),2)*7:p.Effect=="stars"?.55+Math.Pow(effectRandom.NextDouble(),2.5)*3.8:.7+effectRandom.NextDouble()*.8;
            Shape dot;
            if(p.Effect=="rain") dot=new Rectangle { Width=Math.Max(.6,size*.65),Height=size*12,Fill=new SolidColorBrush(Color.FromArgb(75,150,190,220)),RadiusX=.4,RadiusY=.4,RenderTransform=new RotateTransform(8) };
            else dot=new Ellipse { Width=size*2,Height=size*2,Fill=new SolidColorBrush(color),Opacity=p.Effect=="snow"?.16:p.Effect=="stars"?.35+effectRandom.NextDouble()*.55:p.Effect=="dust"?.1+effectRandom.NextDouble()*.18:p.Effect=="dust-v2"?.06+effectRandom.NextDouble()*.2:.12+effectRandom.NextDouble()*.24 };
            if(p.Effect=="dust-v2" || p.Effect=="stars") dot.Effect=new DropShadowEffect { Color=color,BlurRadius=p.Effect=="stars"?size*2.4:Math.Max(0,size-1.5)*1.8,ShadowDepth=0,Opacity=.65,RenderingBias=RenderingBias.Performance };
            SetLeft(dot,effectRandom.NextDouble()*ActualWidth); SetTop(dot,effectRandom.NextDouble()*ActualHeight); effects.Children.Add(dot);
            if(p.Effect is "dust" or "dust-v2" or "stars")
            {
                var dx=effectRandom.Next(-30,31); var dy=effectRandom.Next(-30,31);
                var move=new TranslateTransform(); dot.RenderTransform=move;
                var duration=TimeSpan.FromSeconds(4+effectRandom.NextDouble()*8);
                move.BeginAnimation(TranslateTransform.XProperty,new DoubleAnimation(-dx,dx,new Duration(duration)){AutoReverse=true,RepeatBehavior=RepeatBehavior.Forever});
                move.BeginAnimation(TranslateTransform.YProperty,new DoubleAnimation(-dy,dy,new Duration(duration)){AutoReverse=true,RepeatBehavior=RepeatBehavior.Forever});
                if(p.Effect=="stars") dot.BeginAnimation(UIElement.OpacityProperty,new DoubleAnimation(.25,.95,new Duration(TimeSpan.FromSeconds(2+effectRandom.NextDouble()*4))){AutoReverse=true,RepeatBehavior=RepeatBehavior.Forever});
            }
            else
            {
                var dy=p.Effect=="snow"?ActualHeight+20:ActualHeight+20;
                var drift=p.Effect=="snow"?effectRandom.Next(-40,41):effectRandom.Next(-20,21);
                dot.RenderTransform=new TranslateTransform(); var move=(TranslateTransform)dot.RenderTransform;
                var duration=TimeSpan.FromSeconds(p.Effect=="snow"?Math.Max(ActualHeight/(18+effectRandom.NextDouble()*38),8):Math.Max(ActualHeight/(260+effectRandom.NextDouble()*360),1.2));
                move.BeginAnimation(TranslateTransform.YProperty,new DoubleAnimation(-ActualHeight,dy,new Duration(duration)){RepeatBehavior=RepeatBehavior.Forever});
                move.BeginAnimation(TranslateTransform.XProperty,new DoubleAnimation(drift,-drift,new Duration(duration)){RepeatBehavior=RepeatBehavior.Forever});
            }
        }
    }
    void BuildPassage(Quote q,double width,double size,Color foreground,Color accent)
    {
        passage.Children.Clear(); passage.Width=width;
        void Append(Quote item,string language,double fontSize)
        {
            var flow=language.StartsWith("ar")?FlowDirection.RightToLeft:FlowDirection.LeftToRight;
            var outlineActive=outlineForPhoto || outlineForPattern;
            var outlineRadius=12.0;
            var text=new TextBlock { TextWrapping=TextWrapping.Wrap, FontFamily=Appearance.Font(p.Theme,language), FontSize=fontSize, Foreground=Appearance.Brush(foreground,p.Theme=="terminal"?.8:1), FlowDirection=flow, LineHeight=fontSize*Appearance.Font(p.Theme,language).LineSpacing*(p.Theme=="book"?1.35:p.Theme=="festive"?1.25:p.Theme=="terminal"?1.15:1), LineStackingStrategy=LineStackingStrategy.BlockLineHeight };
            if(outlineActive) text.Effect=new DropShadowEffect { Color=Appearance.Color(dark?"#1c1c1c":"#dfdfdf"),BlurRadius=outlineRadius,ShadowDepth=0,Opacity=1,RenderingBias=RenderingBias.Performance };
            text.Inlines.Add(new Run(item.first));
            var highlight=new Run(item.time);
            if(p.Theme!="book") highlight.Foreground=Appearance.Brush(accent);
            text.Inlines.Add(highlight); text.Inlines.Add(new Run(item.last)); passage.Children.Add(p.Theme=="book"?new BookText(text,highlight,Appearance.Brush(accent)):text);
            var attribution=p.HideTitle?item.author:string.Join(", ",new[]{item.title,item.author}.WhereNonEmpty());
            if(attribution.Length>0) passage.Children.Add(new TextBlock { Text=(p.Theme=="terminal"?"> ":"— ")+attribution,FontFamily=text.FontFamily,FontSize=fontSize*.55,TextWrapping=TextWrapping.Wrap,FlowDirection=flow,Foreground=Appearance.Brush(foreground),Margin=new Thickness(0,p.Theme=="book"?(ActualWidth<=750?16:24):fontSize*.35,0,0),Effect=outlineActive?new DropShadowEffect { Color=Appearance.Color(dark?"#1c1c1c":"#dfdfdf"),BlurRadius=12,ShadowDepth=0,Opacity=1,RenderingBias=RenderingBias.Performance }:null });
        }
        Append(q,locale,size);
        var (translation,notice)=data.Translate(q,locale,minute,p);
        if(translation!=null)
        {
            passage.Children.Add(new Border { Height=1,Background=Appearance.Brush(foreground,.25),Margin=new Thickness(0,18,0,12) });
            var heading=new TextBlock { Text=LanguageName(p.Translation),FontSize=Math.Max(10,size*.35),Foreground=Appearance.Brush(foreground,.75),Margin=new Thickness(0,0,0,8) };
            if(outlineForPhoto || outlineForPattern) heading.Effect=new DropShadowEffect { Color=Appearance.Color(dark?"#1c1c1c":"#dfdfdf"),BlurRadius=12,ShadowDepth=0,Opacity=1,RenderingBias=RenderingBias.Performance };
            passage.Children.Add(heading);
            Append(translation,p.Translation,size*.8);
        }
        else if(notice.Length>0)
        {
            var message=new TextBlock { Text=notice,FontSize=size*.5,TextWrapping=TextWrapping.Wrap,Foreground=Appearance.Brush(foreground,.75),Margin=new Thickness(0,24,0,0) };
            if(outlineForPhoto || outlineForPattern) message.Effect=new DropShadowEffect { Color=Appearance.Color(dark?"#1c1c1c":"#dfdfdf"),BlurRadius=12,ShadowDepth=0,Opacity=1,RenderingBias=RenderingBias.Performance };
            passage.Children.Add(message);
        }
    }
    public static string LanguageName(string locale) { try { return CultureInfo.GetCultureInfo(locale).NativeName; } catch(CultureNotFoundException) { return locale; } }
}
internal static class TextExtensions
{
    public static System.Collections.Generic.IEnumerable<string> WhereNonEmpty(this string[] values) { foreach(var value in values) if(!string.IsNullOrEmpty(value)) yield return value; }
}
