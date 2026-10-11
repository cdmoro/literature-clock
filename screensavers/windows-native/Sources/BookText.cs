using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Media;
namespace LiteratureClock;
// Match AppKit's rounded highlight fragments across wrapped lines.
public sealed class BookText : Decorator
{
    readonly TextBlock text;
    public BookText(TextBlock text,Run highlight,Brush brush) { this.text=text; Child=text; Highlight=highlight; HighlightBrush=brush; }
    public Run? Highlight { get; set; }
    public Brush HighlightBrush { get; set; } = Brushes.Yellow;
    protected override void OnRender(DrawingContext drawingContext)
    {
        if(Highlight!=null && Highlight.Text.Length>0)
        {
            Rect? fragment=null;
            for(int i=0;i<Highlight.Text.Length;i++)
            {
                var pointer=Highlight.ContentStart.GetPositionAtOffset(i,LogicalDirection.Forward);
                var next=Highlight.ContentStart.GetPositionAtOffset(i+1,LogicalDirection.Forward);
                if(pointer==null || next==null) continue;
                var start=pointer.GetCharacterRect(LogicalDirection.Forward);
                var end=next.GetCharacterRect(LogicalDirection.Backward);
                var rect=new Rect(Math.Min(start.Left,end.Left),start.Top,Math.Max(1,Math.Abs(end.Left-start.Left)),start.Height);
                if(fragment.HasValue && Math.Abs(fragment.Value.Top-rect.Top)<1) { var merged=fragment.Value; merged.Union(rect); fragment=merged; }
                else { if(fragment.HasValue) Paint(fragment.Value); fragment=rect; }
            }
            if(fragment.HasValue) Paint(fragment.Value);
        }
        base.OnRender(drawingContext);
        void Paint(Rect rect)
        {
            rect.Inflate(text.FontSize*.2,0);
            drawingContext.DrawRoundedRectangle(HighlightBrush,null,rect,text.FontSize*.12,text.FontSize*.12);
        }
    }
}
