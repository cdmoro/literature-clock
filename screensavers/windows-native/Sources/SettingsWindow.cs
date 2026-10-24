using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Controls;

namespace LiteratureClock;
public sealed class SettingsWindow : Window
{
    record Choice(string Value,string Label);
    readonly Dictionary<string,ComboBox> menus=new();
    readonly Dictionary<string,CheckBox> checks=new();
    readonly Dictionary<string,CheckBox> languages=new();
    readonly Catalogues data;
    readonly StackPanel stack=new() { Margin=new Thickness(24) };
    readonly TextBox custom=new();
    readonly Preferences original;
    readonly TextBlock error=new() { Foreground=System.Windows.Media.Brushes.Firebrick, TextWrapping=TextWrapping.Wrap };
    public SettingsWindow(Catalogues data,Preferences p)
    {
        this.data=data; original=p;
        Title="Literature Clock"; Width=620; Height=760; MinWidth=480; MinHeight=500;
        WindowStartupLocation=WindowStartupLocation.CenterScreen;
        Content=new ScrollViewer { Content=stack,VerticalScrollBarVisibility=ScrollBarVisibility.Auto };
        Section("settings_content"); Label("settings_quote_languages");
        var languageGrid=new System.Windows.Controls.Primitives.UniformGrid { Columns=3 };
        foreach(var locale in data.Locales)
        {
            var check=new CheckBox { Content=ClockSurface.LanguageName(locale), IsChecked=p.Languages.Contains(locale),Margin=new Thickness(0,5,8,5) };
            languages[locale]=check; languageGrid.Children.Add(check);
        }
        stack.Children.Add(languageGrid); Label("languages_help");
        Check("bilingual_mode","bilingual",p.Bilingual);
        Menu("bilingual_language","translation",new[]{""}.Concat(data.Locales).ToArray(),p.Translation,raw=>raw.Length==0?data.Text("bilingual_select_language"):ClockSurface.LanguageName(raw));
        Section("settings_appearance");
        Menu("theme","theme",Appearance.Themes,p.Theme);
        Menu("settings_scheme","scheme",["system","light","dark"],p.Scheme);
        Menu("settings_background","background",["default","tinted","photo","plain"],p.Background,raw=>data.Text("settings_background_"+raw));
        Menu("settings_photo_provider","provider",["picsum","nasa","commons"],p.Provider,raw=>raw=="commons"?"Wikimedia Commons":raw=="nasa"?"NASA":"Picsum");
        var queries=Catalogues.Read<Dictionary<string,Dictionary<string,string>>>("photo-providers.json");
        Menu("settings_photo_category","category",["all"],p.Category,raw=>data.Text("settings_photo_"+raw));
        Menu("settings_color","palette",Appearance.Palettes,p.Palette,raw=>data.Text(raw=="custom"?"settings_color_customize":raw=="default"?"color_mode_default":raw=="random"?"color_mode_random":raw));
        custom.Text=p.CustomColor; custom.Margin=new Thickness(0,5,0,10); custom.MaxLength=7; custom.ToolTip=data.Text("color_edit"); stack.Children.Add(custom);
        Menu("settings_background_pattern","pattern",Appearance.Patterns,p.Pattern,raw=>data.Text("settings_pattern_"+raw));
        Menu("settings_pattern_size","patternSize",["0.5","1","1.5","2","3"],p.PatternSize,raw=>raw+"×");
        Menu("settings_background_effect","effect",["none","rain","snow","dust","dust-v2","stars"],p.Effect,raw=>data.Text("settings_effect_"+raw));
        Menu("progressbar_mode","progress",["none","top","bottom","background","glass-background","glass-foreground"],p.Progress,raw=>data.Text("settings_progress_"+raw));
        Section("settings_behavior");
        Check("movement","move",p.Move); Check("time_mode","time",p.ShowTime); Check("settings_fuzzy_clock","fuzzyClock",p.FuzzyClock); Check("settings_hide_book_title","hideTitle",p.HideTitle); Menu("settings_attribution_position","quoteAttribution",["below","bottom-left","hidden"],p.QuoteAttribution,raw=>data.Text("settings_attribution_"+raw)); Check("work_mode_title","safe",p.Safe);
        void Categories()
        {
            var provider=Value("provider"); var menu=menus["category"]; var saved=Value("category");
            menu.ItemsSource=new[]{"all"}.Concat(queries.GetValueOrDefault(provider,new()).Keys.Order()).Select(x=>new Choice(x,data.Text("settings_photo_"+x))).ToArray();
            menu.SelectedValue=saved; if(menu.SelectedIndex<0) menu.SelectedIndex=0;
        }
        void Update()
        {
            var theme=Value("theme"); var background=theme=="photo"?"photo":theme=="book"?"default":Value("background");
            menus["background"].IsEnabled=theme is not "photo" and not "book";
            menus["provider"].Visibility=background=="photo"?Visibility.Visible:Visibility.Collapsed;
            menus["category"].Visibility=background=="photo" && Value("provider")!="picsum"?Visibility.Visible:Visibility.Collapsed;
            var supportsPattern=theme is not "book";
            ((StackPanel)menus["pattern"].Parent).Visibility=supportsPattern?Visibility.Visible:Visibility.Collapsed;
            menus["patternSize"].IsEnabled=supportsPattern && Value("pattern") is not "none" and not "random";
            ((StackPanel)menus["patternSize"].Parent).Visibility=supportsPattern && Value("pattern") is not "none" and not "random"?Visibility.Visible:Visibility.Collapsed;
            menus["effect"].IsEnabled=supportsPattern;
            ((StackPanel)menus["effect"].Parent).Visibility=supportsPattern?Visibility.Visible:Visibility.Collapsed;
            custom.Visibility=Value("palette")=="custom"?Visibility.Visible:Visibility.Collapsed;
            menus["translation"].IsEnabled=checks["bilingual"].IsChecked==true;
            foreach(var key in new[]{"provider","category"}) ((StackPanel)menus[key].Parent).Visibility=menus[key].Visibility;
        }
        menus["provider"].SelectionChanged+=(_,_)=>{ Categories(); Update(); };
        foreach(var key in new[]{"theme","background","palette","pattern"}) menus[key].SelectionChanged+=(_,_)=>Update();
        checks["bilingual"].Checked+=(_,_)=>Update(); checks["bilingual"].Unchecked+=(_,_)=>Update();
        Categories(); menus["category"].SelectedValue=p.Category; if(menus["category"].SelectedIndex<0) menus["category"].SelectedIndex=0; Update();
        stack.Children.Add(error);
        var buttons=new StackPanel { Orientation=Orientation.Horizontal,HorizontalAlignment=HorizontalAlignment.Right,Margin=new Thickness(0,20,0,0) };
        var cancel=new Button { Content=data.Text("cancel"),MinWidth=90,Margin=new Thickness(8),IsCancel=true };
        cancel.Click+=(_,_)=>Close(); buttons.Children.Add(cancel);
        var save=new Button { Content=data.Text("save"),MinWidth=90,Margin=new Thickness(8),IsDefault=true }; save.Click+=(_,_)=>Save(); buttons.Children.Add(save); stack.Children.Add(buttons);
        using var versionStream=Catalogues.Open("version.txt");
        using var versionReader=new System.IO.StreamReader(versionStream);
        var version=versionReader.ReadToEnd().Trim();
        var project=new Button { Content="Literature Clock "+version+" · GitHub",Margin=new Thickness(0,12,0,0) };
        project.Click+=(_,_)=>Process.Start(new ProcessStartInfo("https://github.com/cdmoro/literature-clock") { UseShellExecute=true }); stack.Children.Add(project);
    }
    string Value(string key)=>menus[key].SelectedValue as string ?? "";
    void Section(string key)=>stack.Children.Add(new TextBlock { Text=data.Text(key),FontWeight=FontWeights.Bold,FontSize=16,Margin=new Thickness(0,16,0,10) });
    void Label(string key)=>stack.Children.Add(new TextBlock { Text=data.Text(key),TextWrapping=TextWrapping.Wrap,Margin=new Thickness(0,4,0,8) });
    void Check(string label,string key,bool value)
    { var check=new CheckBox { Content=data.Text(label),IsChecked=value,Margin=new Thickness(0,5,0,5) }; checks[key]=check; stack.Children.Add(check); }
    void Menu(string label,string key,string[] values,string selected,Func<string,string>? name=null)
    {
        var row=new StackPanel { Margin=new Thickness(0,5,0,5) }; row.Children.Add(new TextBlock { Text=data.Text(label),Margin=new Thickness(0,0,0,4) });
        var menu=new ComboBox { ItemsSource=values.Select(x=>new Choice(x,name?.Invoke(x)??data.Text(x))).ToArray(),DisplayMemberPath="Label",SelectedValuePath="Value",SelectedValue=selected,MinHeight=28 };
        if(menu.SelectedIndex<0) menu.SelectedIndex=0; menus[key]=menu; row.Children.Add(menu); stack.Children.Add(row);
    }
    void Save()
    {
        if(Value("palette")=="custom" && !Regex.IsMatch(custom.Text,"^#[0-9a-fA-F]{6}$")) { error.Text=data.Text("color_edit")+" (#RRGGBB)"; return; }
        var p=new Preferences
        {
            Languages=languages.Where(x=>x.Value.IsChecked==true).Select(x=>x.Key).ToArray(),Theme=Value("theme"),Scheme=Value("scheme"),Background=Value("background"),Pattern=Value("pattern"),PatternSize=Value("patternSize") is "0.5" or "1" or "1.5" or "2" or "3" ? Value("patternSize") : "1",Effect=new[]{"none","rain","snow","dust","dust-v2","stars"}.Contains(Value("effect"))?Value("effect"):"none",Palette=Value("palette"),CustomColor=Regex.IsMatch(custom.Text,"^#[0-9a-fA-F]{6}$")?custom.Text:original.CustomColor,Progress=Value("progress"),Provider=Value("provider"),Category=Value("category"),Translation=Value("translation"),Bilingual=checks["bilingual"].IsChecked==true,Move=checks["move"].IsChecked==true,ShowTime=checks["time"].IsChecked==true,FuzzyClock=checks["fuzzyClock"].IsChecked==true,HideTitle=checks["hideTitle"].IsChecked==true,QuoteAttribution=new[]{"below","bottom-left","hidden"}.Contains(Value("quoteAttribution"))?Value("quoteAttribution"):"below",Safe=checks["safe"].IsChecked==true
        };
        try { p.Save(); }
        catch(Exception e) when(e is System.IO.IOException or UnauthorizedAccessException) { error.Text=e.Message; return; }
        if(System.Windows.Interop.ComponentDispatcher.IsThreadModal) DialogResult=true; else Close();
    }
}
