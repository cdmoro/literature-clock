#include <metal_stdlib>
#include <CoreImage/CoreImage.h>
using namespace metal;

extern "C" { namespace coreimage {
        float4 lens(coreimage::sampler image, float4 rect, float radius, coreimage::destination dest) {
            float2 p = dest.coord();
            float2 c = rect.xy + rect.zw * 0.5;
            float2 n;
            float d;
            // Square trailing corners, rounded corners only at the moving edge.
            float2 q = float2(p.x - (rect.x + rect.z - radius), abs(p.y - c.y) - (rect.w * 0.5 - radius));
            float2 outside = max(q, float2(0.0));
            d = length(outside) + min(max(q.x, q.y), 0.0) - radius;
            if (q.y <= 0.0 || radius < 0.001) {
                d = p.x - (rect.x + rect.z);
                n = float2(1.0, 0.0);
            } else {
                n = normalize(float2(outside.x, outside.y * sign(p.y - c.y)) + float2(0.0001));
            }
            float inside = 1.0 - smoothstep(-0.8, 0.6, d);
            float bevel = exp(-abs(d + 3.8) / 4.7) * smoothstep(-16.8, -9.4, d);
            float2 bend = n * bevel * 9.4;
            float red = image.sample(image.transform(p - bend * 1.45)).r;
            float green = image.sample(image.transform(p - bend)).g;
            float blue = image.sample(image.transform(p - bend * 0.55)).b;
            float rim = exp(-abs(d + 0.8) / 0.65);
            float light = 0.12 + 0.16 * max(0.0, dot(n, normalize(float2(-0.6, 0.8))));
            float3 rgb = mix(float3(red, green, blue), float3(1.0), rim * light);
            // The horizontal part of a corner extends beyond the sampling strip.
            // Fade it toward its tangent instead of cutting it at the strip boundary.
            float cornerWeight = radius > 0.001 ? smoothstep(0.0, min(radius, 16.8), q.y) : 0.0;
            float tangentFade = smoothstep(-17.0, 0.0, q.x);
            float coverage = inside * smoothstep(-16.8, -9.4, d)
                * mix(1.0, tangentFade, cornerWeight);
            return float4(rgb * coverage, coverage);
        }
        

} }
