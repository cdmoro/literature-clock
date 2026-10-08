#include <metal_stdlib>
#include <CoreImage/CoreImage.h>
using namespace metal;

extern "C" { namespace coreimage {
        float4 lens(coreimage::sampler image, float4 rect, float radius, coreimage::destination dest) {
            float2 p = dest.coord();
            float2 c = rect.xy + rect.zw * 0.5;
            float2 n;
            float d;
            if (radius < 1.0) {
                d = p.x - (rect.x + rect.z);
                n = float2(1.0, 0.0);
            } else {
                float2 q = abs(p - c) - (rect.zw * 0.5 - float2(radius));
                float2 outside = max(q, float2(0.0));
                d = length(outside) + min(max(q.x, q.y), 0.0) - radius;
                n = normalize((outside + float2(0.0001)) * sign(p - c));
            }
            float inside = 1.0 - smoothstep(-0.8, 0.6, d);
            float bevel = exp(-abs(d + 4.0) / 5.0) * smoothstep(-18.0, -10.0, d);
            float2 bend = n * bevel * 10.0;
            float red = image.sample(image.transform(p - bend * 1.45)).r;
            float green = image.sample(image.transform(p - bend)).g;
            float blue = image.sample(image.transform(p - bend * 0.55)).b;
            float rim = exp(-abs(d + 0.8) / 0.65);
            float light = 0.12 + 0.16 * max(0.0, dot(n, normalize(float2(-0.6, 0.8))));
            float3 rgb = mix(float3(red, green, blue), float3(1.0), rim * light);
            return float4(rgb * inside, inside);
        }
        

} }
