// Port of macos-native/Sources/OpticalGlass.metal, in top-left WPF coordinates.
sampler2D scene : register(s0);
float4 geometry : register(c0); // width, height, progress, corner radius (DIPs)
float4 tint : register(c1);
float smooth(float a, float b, float x) { float t=saturate((x-a)/(b-a)); return t*t*(3-2*t); }
float4 main(float2 uv : TEXCOORD) : COLOR
{
    float2 p=uv*geometry.xy;
    float edge=geometry.x*geometry.z;
    float radius=geometry.w;
    float2 q=float2(p.x-(edge-radius), abs(p.y-geometry.y*.5)-(geometry.y*.5-radius));
    float2 outside=max(q,0);
    float d=length(outside)+min(max(q.x,q.y),0)-radius;
    float2 n=normalize(float2(outside.x,outside.y*sign(p.y-geometry.y*.5))+.0001);
    if(q.y<=0 || radius<.001) { d=p.x-edge; n=float2(1,0); }
    float horizontal=-min(p.y,geometry.y-p.y);
    if(q.x<0 || radius<.001) { if(horizontal>d) { d=horizontal; n=float2(0,sign(p.y-geometry.y*.5)); } }
    float inside=1-smooth(-.8,.6,d);
    float bevel=exp(-abs(d+3.8)/4.7)*smooth(-16.8,-9.4,d);
    float2 bend=n*bevel*9.4/geometry.xy;
    float3 refracted=float3(tex2D(scene,uv-bend*1.45).r,tex2D(scene,uv-bend).g,tex2D(scene,uv-bend*.55).b);
    float rim=exp(-abs(d+.8)/.65);
    // Metal uses bottom-left coordinates; invert the light's vertical component.
    float light=.12+.16*max(0,dot(n,normalize(float2(-.6,-.8))));
    float strength=lerp(1,.12,abs(n.y));
    float3 rgb=lerp(refracted,1,rim*light*strength);
    float coverage=inside*smooth(-16.8,-9.4,d);
    float3 plain=tex2D(scene,uv).rgb;
    rgb=lerp(plain,rgb,coverage);
    rgb=lerp(rgb,tint.rgb,tint.a*inside);
    return float4(lerp(plain,rgb,inside),1);
}
