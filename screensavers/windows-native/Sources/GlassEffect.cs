using System;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Effects;
using System.Windows.Media.Media3D;
namespace LiteratureClock;
public sealed class GlassEffect : ShaderEffect
{
    public static readonly DependencyProperty InputProperty = RegisterPixelShaderSamplerProperty("Input", typeof(GlassEffect), 0);
    public static readonly DependencyProperty GeometryProperty = DependencyProperty.Register("Geometry", typeof(Point4D), typeof(GlassEffect), new UIPropertyMetadata(new Point4D(1,1,0,0), PixelShaderConstantCallback(0)));
    public static readonly DependencyProperty TintProperty = DependencyProperty.Register("Tint", typeof(Point4D), typeof(GlassEffect), new UIPropertyMetadata(new Point4D(0,0,0,0), PixelShaderConstantCallback(1)));
    public Brush Input { get => (Brush)GetValue(InputProperty); set => SetValue(InputProperty, value); }
    public Point4D Geometry { get => (Point4D)GetValue(GeometryProperty); set => SetValue(GeometryProperty,value); }
    public Point4D Tint { get => (Point4D)GetValue(TintProperty); set => SetValue(TintProperty,value); }
    public static double Radius(double progress, double width, double height)
    {
        var t=Math.Clamp((progress-.92)/.08,0,1);
        return Math.Min(28,Math.Min(height/2,width*progress/2))*(1-t*t*(3-2*t));
    }
    public GlassEffect()
    {
        PixelShader = new PixelShader { UriSource = new Uri("pack://application:,,,/Literature Clock;component/Shaders/OpticalGlass.ps") };
        UpdateShaderValue(InputProperty); UpdateShaderValue(GeometryProperty); UpdateShaderValue(TintProperty);
    }
}
