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
    readonly Canvas opticalBackdrop = new();
    readonly Canvas backdrop = new();
    readonly Canvas patternLayer = new();
    readonly StackPanel passage = new();
    readonly TextBlock clock = new() { FontFamily = new FontFamily("Segoe UI"), FontWeight = FontWeights.Bold };
    readonly TextBlock clockHalo = new() { FontFamily = new FontFamily("Segoe UI"), FontWeight = FontWeights.Bold };
    readonly TextBlock credit = new() { FontSize = 11 };
    readonly TextBlock attributionCredit = new() { FontFamily = new FontFamily("Segoe UI"), FontSize = 11, TextWrapping = TextWrapping.Wrap, TextAlignment = TextAlignment.Left, Foreground = Brushes.White };
    readonly TextBlock bookCredit = new() { FontFamily = new FontFamily("Segoe UI"), FontSize = 11, TextWrapping = TextWrapping.Wrap, TextAlignment = TextAlignment.Left, Foreground = Brushes.White };
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
        opticalBackdrop.Children.Add(backdrop); opticalBackdrop.Children.Add(patternLayer);
        scene.Children.Add(opticalBackdrop); scene.Children.Add(effects); scene.Children.Add(clockHalo); scene.Children.Add(clock); scene.Children.Add(passage); scene.Children.Add(credit); scene.Children.Add(attributionCredit); scene.Children.Add(bookCredit);
        Children.Add(scene); Children.Add(progress);
        photo=new PhotoBackground(display);
        Loaded += (_, _) => CompositionTarget.Rendering += Frame;
        Unloaded += (_, _) => { CompositionTarget.Rendering -= Frame; effects.Children.Clear(); patternLayer.Children.Clear(); photo.Dispose(); };
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
        var pattern=p.Theme == "book" ? "none" : p.Pattern;
        if(pattern=="random") pattern=Appearance.Patterns[2+Catalogues.Index(Appearance.Patterns.Length-2,absoluteMinute,display)];
        outlineForPattern=pattern!="none";
        outlineColor=Appearance.Backdrop(p,dark,accent);
        var patternSize = new[]{"0.5","1","1.5","2","3"}.Contains(p.PatternSize) ? double.Parse(p.PatternSize,CultureInfo.InvariantCulture) : 1;
        var key=$"{ActualWidth}|{ActualHeight}|{dark}|{accent}|{pattern}|{patternSize}|{photo.Revision}";
        if(key!=backgroundKey || photo.Transitioning)
        {
            backdrop.Children.Clear(); patternLayer.Children.Clear(); Fill(Appearance.Brush(Appearance.Backdrop(p,dark,accent)));
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
            if(tiles.TryGetValue(pattern,out var dimensions)) patternLayer.Children.Add(new Rectangle { Width=ActualWidth,Height=ActualHeight,Fill=Tile("Patterns/"+pattern+".png",dimensions[0]*patternSize,dimensions[1]*patternSize) });
            backgroundKey=key;
        }
        effects.Width=ActualWidth; effects.Height=ActualHeight;
        var currentEffectKey=$"{ActualWidth}|{ActualHeight}|{p.Effect}|{dark}|{accent}|{mode}";
        if(effectKey!=currentEffectKey) { BuildEffects(dark,accent); effectKey=currentEffectKey; }
        scene.Width=opticalBackdrop.Width=backdrop.Width=patternLayer.Width=ActualWidth; scene.Height=opticalBackdrop.Height=backdrop.Height=patternLayer.Height=ActualHeight;
        var outlineActive=outlineForPhoto || outlineForPattern;
        clock.Text=minute; clock.FontSize=Math.Max(10,Math.Min(20,ActualWidth*.013)); clock.Foreground=Appearance.Brush(foreground);
        clock.Effect=null;
        clockHalo.Text=minute; clockHalo.FontSize=clock.FontSize; clockHalo.Foreground=clock.Foreground;
        clockHalo.Effect=mode=="photo"?new DropShadowEffect { Color=Appearance.Color(dark?"#1c1c1c":"#dfdfdf"),BlurRadius=12,ShadowDepth=0,Opacity=1,RenderingBias=RenderingBias.Performance }:null;
        clock.Visibility=p.ShowTime?Visibility.Visible:Visibility.Hidden; clock.Measure(new Size(ActualWidth,100));
        clockHalo.Visibility=p.ShowTime && mode=="photo"?Visibility.Visible:Visibility.Hidden; clockHalo.Measure(new Size(ActualWidth,100));
        SetLeft(clock,(ActualWidth-clock.DesiredSize.Width)/2); SetTop(clock,26);
        SetLeft(clockHalo,(ActualWidth-clockHalo.DesiredSize.Width)/2); SetTop(clockHalo,26);
        credit.Text=mode=="photo"?photo.Credit:""; credit.Foreground=Appearance.Brush(foreground,.75); credit.TextAlignment=TextAlignment.Right; credit.TextWrapping=TextWrapping.Wrap; credit.MaxWidth=Math.Min(500,ActualWidth*.7); credit.Measure(new Size(credit.MaxWidth,double.PositiveInfinity)); SetLeft(credit,ActualWidth-credit.DesiredSize.Width-16); SetTop(credit,ActualHeight-credit.DesiredSize.Height-16);
        var attributionHidden=p.QuoteAttribution=="hidden";
        var title=p.HideTitle?"":quote?.title??""; var author=quote?.author??"";
        attributionCredit.Text=!attributionHidden && !p.FuzzyClock && p.QuoteAttribution=="bottom-left"?string.Join("\n",new[]{title,author}.WhereNonEmpty()):""; attributionCredit.MaxWidth=Math.Min(500,Math.Max(140,ActualWidth*.38)); attributionCredit.Measure(new Size(attributionCredit.MaxWidth,double.PositiveInfinity));
        attributionCredit.Effect=new DropShadowEffect { Color=Colors.Black,BlurRadius=8,ShadowDepth=0,Opacity=.65,RenderingBias=RenderingBias.Performance };
        attributionCredit.Visibility=attributionCredit.Text.Length>0?Visibility.Visible:Visibility.Hidden; SetLeft(attributionCredit,20); SetTop(attributionCredit,ActualHeight-attributionCredit.DesiredSize.Height-14);
        bookCredit.Text=!attributionHidden && p.FuzzyClock?string.Join("\n",new[]{title,author}.WhereNonEmpty()):""; bookCredit.MaxWidth=Math.Min(500,Math.Max(140,ActualWidth*.38)); bookCredit.Measure(new Size(bookCredit.MaxWidth,double.PositiveInfinity));
        bookCredit.Effect=new DropShadowEffect { Color=Colors.Black,BlurRadius=8,ShadowDepth=0,Opacity=.65,RenderingBias=RenderingBias.Performance };
        bookCredit.Visibility=!attributionHidden && (p.FuzzyClock || p.QuoteAttribution=="bottom-left") && bookCredit.Text.Length>0?Visibility.Visible:Visibility.Hidden; SetLeft(bookCredit,20); SetTop(bookCredit,ActualHeight-bookCredit.DesiredSize.Height-14);
        var areaTop=p.ShowTime?26+clock.DesiredSize.Height+16:0;
        var layout=$"{ActualWidth}|{ActualHeight}|{dark}|{accent}|{minute}|{locale}|{p.Theme}|{mode}|{pattern}|{p.FuzzyClock}|{p.HideTitle}|{p.QuoteAttribution}|{p.Bilingual}|{p.Translation}";
        if(quote!=null && layoutKey!=layout)
        {
            var width=ActualWidth*.76; var limit=Math.Min(ActualHeight*.65,Math.Max(1,ActualHeight-areaTop-(mode=="photo"?48:4)));
            double low=1,high=Math.Min(ActualWidth*.043,ActualHeight*.12);
            for(int i=0;i<16;i++)
            {
                var size=(low+high)/2; BuildPassage(quote,locale,minute,width,size,foreground,accent);
                passage.Measure(new Size(width,double.PositiveInfinity));
                if(passage.DesiredSize.Height<=limit) low=size; else high=size;
            }
            BuildPassage(quote,locale,minute,width,low,foreground,accent); passage.Measure(new Size(width,double.PositiveInfinity));
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
            // Glass samples the backdrop and fixed pattern; animated particles remain outside it.
            // For background glass the passage stays above the progress; clock is refracted.
            if(p.Progress=="glass-background")
            {
                if(scene.Children.Contains(passage)) { scene.Children.Remove(passage); Children.Add(passage); }
                SetZIndex(passage,2);
            }
            progress.Width=ActualWidth; progress.Height=ActualHeight; SetTop(progress,0);
            progress.Fill=new VisualBrush(opticalBackdrop) { Stretch=Stretch.Fill, ViewboxUnits=BrushMappingMode.Absolute, Viewbox=new Rect(0,0,ActualWidth,ActualHeight) };
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
        if(p.Theme=="book" || p.Effect=="none") return;
        var density=p.Effect=="rain"?6800.0:p.Effect=="snow"?3500.0:p.Effect=="dust"?6000.0:4500.0;
        var count=Math.Min(360,Math.Max(24,(int)(ActualWidth*ActualHeight/density)));
        var color=p.Effect is "snow" or "stars"?Appearance.Foreground(p.Theme,dark,accent):Appearance.Color("#ffd391");
        for(var i=0;i<count;i++)
        {
            var size=p.Effect=="snow"?1.1+effectRandom.NextDouble()*1.9:p.Effect=="dust"?.9+effectRandom.NextDouble()*2:p.Effect=="dust-v2"?.6+Math.Pow(effectRandom.NextDouble(),2)*7:p.Effect=="stars"?.55+Math.Pow(effectRandom.NextDouble(),2.5)*3.8:.7+effectRandom.NextDouble()*.8;
            Shape dot;
            if(p.Effect=="rain") dot=new Rectangle { Width=Math.Max(.6,size*.65),Height=size*12,Fill=new SolidColorBrush(Color.FromArgb(75,150,190,220)),RadiusX=.4,RadiusY=.4,RenderTransform=new RotateTransform(8) };
            else if(p.Effect=="stars" && size>2.1)
            {
                var star=new GeometryGroup(); star.Children.Add(new EllipseGeometry(new Point(size,size),size,size));
                star.Children.Add(new LineGeometry(new Point(size*.1,size),new Point(size*1.9,size)));
                star.Children.Add(new LineGeometry(new Point(size,size*.1),new Point(size,size*1.9)));
                dot=new System.Windows.Shapes.Path { Data=star,Fill=new SolidColorBrush(color),Stroke=new SolidColorBrush(color),StrokeThickness=Math.Max(.35,size*.16),Opacity=.48+effectRandom.NextDouble()*.48 };
            }
            else dot=new Ellipse { Width=size*2,Height=size*2,Fill=new SolidColorBrush(color),Opacity=p.Effect=="snow"?.26:p.Effect=="stars"?.48+effectRandom.NextDouble()*.48:p.Effect=="dust"?.18+effectRandom.NextDouble()*.2:p.Effect=="dust-v2"?.12+effectRandom.NextDouble()*.22:.12+effectRandom.NextDouble()*.24 };
            if(p.Effect=="dust-v2" || p.Effect=="stars") dot.Effect=new DropShadowEffect { Color=color,BlurRadius=p.Effect=="stars"?size*2.4:Math.Max(0,size-1.5)*1.8,ShadowDepth=0,Opacity=.65,RenderingBias=RenderingBias.Performance };
            var orbit=p.Effect=="stars"?Math.Max(12,size*2.5):p.Effect=="dust" || p.Effect=="dust-v2"?30:0;
            var baseX=orbit>0?Math.Clamp(effectRandom.NextDouble()*ActualWidth,orbit,Math.Max(orbit,ActualWidth-orbit)):effectRandom.NextDouble()*ActualWidth;
            var baseY=orbit>0?Math.Clamp(effectRandom.NextDouble()*ActualHeight,orbit,Math.Max(orbit,ActualHeight-orbit)):effectRandom.NextDouble()*ActualHeight;
            SetLeft(dot,baseX); SetTop(dot,baseY); effects.Children.Add(dot);
            if(p.Effect is "dust" or "dust-v2" or "stars")
            {
                var range=p.Effect=="stars"?8:30;
                var dx=effectRandom.Next(-range,range+1); var dy=effectRandom.Next(-range,range+1);
                var move=new TranslateTransform(); dot.RenderTransform=move;
                var duration=TimeSpan.FromSeconds(p.Effect=="stars"?12+effectRandom.NextDouble()*16:4+effectRandom.NextDouble()*8);
                move.BeginAnimation(TranslateTransform.XProperty,new DoubleAnimation(-dx,dx,new Duration(duration)){AutoReverse=true,RepeatBehavior=RepeatBehavior.Forever});
                move.BeginAnimation(TranslateTransform.YProperty,new DoubleAnimation(-dy,dy,new Duration(duration)){AutoReverse=true,RepeatBehavior=RepeatBehavior.Forever});
                if(p.Effect=="stars") dot.BeginAnimation(UIElement.OpacityProperty,new DoubleAnimation(.25,.95,new Duration(TimeSpan.FromSeconds(2+effectRandom.NextDouble()*4))){AutoReverse=true,RepeatBehavior=RepeatBehavior.Forever});
            }
            else
            {
                var dy=p.Effect=="snow"?ActualHeight+20:ActualHeight+20;
                var drift=p.Effect=="snow"?effectRandom.Next(-40,41):effectRandom.Next(-20,21);
                dot.RenderTransform=new TranslateTransform(); var move=(TranslateTransform)dot.RenderTransform;
                var snowSpeed=18+effectRandom.NextDouble()*38;
                var duration=TimeSpan.FromSeconds(p.Effect=="snow"?Math.Max((ActualHeight+size*4)/snowSpeed,8):Math.Max(ActualHeight/(260+effectRandom.NextDouble()*360),1.2));
                var fromY=p.Effect=="snow"?-baseY-size*2:-ActualHeight;
                var toY=p.Effect=="snow"?ActualHeight-baseY+size*2:dy;
                move.BeginAnimation(TranslateTransform.YProperty,new DoubleAnimation(fromY,toY,new Duration(duration)){RepeatBehavior=RepeatBehavior.Forever});
                move.BeginAnimation(TranslateTransform.XProperty,new DoubleAnimation(drift,-drift,new Duration(duration)){RepeatBehavior=RepeatBehavior.Forever});
            }
        }
    }
    internal static string BalancedLines(string value,TextBlock style,double width)
    {
        var words=value.Split((char[]?)null,StringSplitOptions.RemoveEmptyEntries);
        if(words.Length<=2 || width<=0) return value;
        double Measure(int start,int end)
        {
            var text=new FormattedText(string.Join(" ",words,start,end-start),CultureInfo.CurrentCulture,
                style.FlowDirection,new Typeface(style.FontFamily,style.FontStyle,style.FontWeight,style.FontStretch),
                style.FontSize,Brushes.Black,1);
            return text.WidthIncludingTrailingWhitespace;
        }
        var total=Measure(0,words.Length);
        if(total<=width) return value;
        for(var count=2;count<=words.Length;count++)
        {
            var target=total/count;
            var memo=new Dictionary<(int,int),(double Cost,string Text)?>();
            (double Cost,string Text)? Best(int start,int remaining)
            {
                if(remaining==1)
                {
                    var measured=Measure(start,words.Length);
                    return measured<=width?(Math.Pow(measured-target,2),string.Join(" ",words,start,words.Length-start)):null;
                }
                if(memo.TryGetValue((start,remaining),out var cached)) return cached;
                (double Cost,string Text)? best=null;
                for(var end=start+1;end<=words.Length-remaining+1;end++)
                {
                    var measured=Measure(start,end);
                    if(measured>width) break;
                    var tail=Best(end,remaining-1);
                    if(tail==null) continue;
                    var cost=Math.Pow(measured-target,2)+tail.Value.Cost;
                    if(best==null || cost<best.Value.Cost)
                        best=(cost,string.Join(" ",words,start,end-start)+"\n"+tail.Value.Text);
                }
                memo[(start,remaining)]=best;
                return best;
            }
            var result=Best(0,count);
            if(result!=null) return result.Value.Text;
        }
        return value;
    }
    internal StackPanel BuildPassage(Quote q,string quoteLocale,string quoteMinute,double width,double size,Color foreground,Color accent)
    {
        passage.Children.Clear(); passage.Width=width;
        var dark=Appearance.Dark(p);
        void Append(Quote item,string language,double fontSize)
        {
            var fuzzy = p.FuzzyClock;
            var flow=language.StartsWith("ar")?FlowDirection.RightToLeft:FlowDirection.LeftToRight;
            var outlineActive=outlineForPhoto || outlineForPattern;
            var outlineRadius=12.0;
            var text=new TextBlock { TextWrapping=TextWrapping.Wrap, TextAlignment=fuzzy?TextAlignment.Center:TextAlignment.Left, FontFamily=Appearance.Font(p.Theme,language,p.Font), FontSize=fontSize, Foreground=Appearance.Brush(foreground,p.Theme=="terminal"?.8:1), FlowDirection=flow, LineHeight=fontSize*Appearance.Font(p.Theme,language,p.Font).LineSpacing*(p.Theme=="book"?1.35:p.Theme=="festive"?1.25:p.Theme=="terminal"?1.15:1), LineStackingStrategy=LineStackingStrategy.BlockLineHeight };
            if(outlineActive) text.Effect=new DropShadowEffect { Color=Appearance.Color(dark?"#1c1c1c":"#dfdfdf"),BlurRadius=outlineRadius,ShadowDepth=0,Opacity=1,RenderingBias=RenderingBias.Performance };
            if (!fuzzy) {
                text.Inlines.Add(new Run(item.first));
                var highlight=new Run(string.IsNullOrEmpty(item.time)?quoteMinute:item.time);
                if(p.Theme!="book") highlight.Foreground=Appearance.Brush(accent);
                text.Inlines.Add(highlight);
                text.Inlines.Add(new Run(item.last));
                passage.Children.Add(p.Theme=="book"?new BookText(text,highlight,Appearance.Brush(accent)):text);
                var attribution=!fuzzy && p.QuoteAttribution=="below"?p.HideTitle?item.author:string.Join(", ",new[]{item.title,item.author}.WhereNonEmpty()):"";
                if(attribution.Length>0) passage.Children.Add(new TextBlock { Text=(p.Theme=="terminal"?"> ":"— ")+attribution,FontFamily=text.FontFamily,FontSize=fontSize*.55,TextWrapping=TextWrapping.Wrap,FlowDirection=flow,Foreground=Appearance.Brush(foreground),Margin=new Thickness(0,p.Theme=="book"?(ActualWidth<=750?16:24):fontSize*.35,0,0),Effect=outlineActive?new DropShadowEffect { Color=Appearance.Color(dark?"#1c1c1c":"#dfdfdf"),BlurRadius=12,ShadowDepth=0,Opacity=1,RenderingBias=RenderingBias.Performance }:null });
            } else {
                var phrase=string.IsNullOrEmpty(item.time)?quoteMinute:item.time;
                var highlight=new Run(BalancedLines(phrase,text,width));
                if(p.Theme!="book") highlight.Foreground=Appearance.Brush(accent);
                text.Inlines.Add(highlight);
                passage.Children.Add(p.Theme=="book"?new BookText(text,highlight,Appearance.Brush(accent)):text);
            }
        }
        Append(q,quoteLocale,size);
        var (translation,notice)=data.Translate(q,quoteLocale,quoteMinute,p);
        if(translation!=null)
        {
            if(!p.FuzzyClock)
            {
                passage.Children.Add(new Border { Height=1,Background=Appearance.Brush(foreground,.25),Margin=new Thickness(0,18,0,12) });
                var heading=new TextBlock { Text=LanguageName(p.Translation),FontSize=Math.Max(10,size*.35),Foreground=Appearance.Brush(foreground,.75),Margin=new Thickness(0,0,0,8) };
                if(outlineForPhoto || outlineForPattern) heading.Effect=new DropShadowEffect { Color=Appearance.Color(dark?"#1c1c1c":"#dfdfdf"),BlurRadius=12,ShadowDepth=0,Opacity=1,RenderingBias=RenderingBias.Performance };
                passage.Children.Add(heading);
            }
            else passage.Children.Add(new Border { Height=size*.6 });
            Append(translation,p.Translation,size*.8);
        }
        else if(notice.Length>0)
        {
            var message=new TextBlock { Text=notice,FontSize=size*.5,TextWrapping=TextWrapping.Wrap,Foreground=Appearance.Brush(foreground,.75),Margin=new Thickness(0,24,0,0) };
            if(outlineForPhoto || outlineForPattern) message.Effect=new DropShadowEffect { Color=Appearance.Color(dark?"#1c1c1c":"#dfdfdf"),BlurRadius=12,ShadowDepth=0,Opacity=1,RenderingBias=RenderingBias.Performance };
            passage.Children.Add(message);
        }
        return passage;
    }
    public static string LanguageName(string locale) { try { return CultureInfo.GetCultureInfo(locale).NativeName; } catch(CultureNotFoundException) { return locale; } }
}
internal static class TextExtensions
{
    public static System.Collections.Generic.IEnumerable<string> WhereNonEmpty(this string[] values) { foreach(var value in values) if(!string.IsNullOrEmpty(value)) yield return value; }
}
