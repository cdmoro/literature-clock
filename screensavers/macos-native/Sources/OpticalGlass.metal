#include <metal_stdlib>
#include <CoreImage/CoreImage.h>
using namespace metal;

float fusedDistance(float2 p, float4 rect, float radius, float edge) {
    float2 q = abs(p - (rect.xy + rect.zw * 0.5)) - (rect.zw * 0.5 - float2(radius));
    float capsule = length(max(q, float2(0.0))) + min(max(q.x, q.y), 0.0) - radius;
    float plane = p.x - edge;
    float h = max(18.0 - abs(capsule - plane), 0.0) / 18.0;
    return min(capsule, plane) - h * h * 18.0 * 0.25;
}
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
            float bevel = exp(-abs(d + 3.0) / 3.75) * smoothstep(-13.5, -7.5, d);
            float2 bend = n * bevel * 7.5;
            float red = image.sample(image.transform(p - bend * 1.45)).r;
            float green = image.sample(image.transform(p - bend)).g;
            float blue = image.sample(image.transform(p - bend * 0.55)).b;
            float rim = exp(-abs(d + 0.8) / 0.65);
            float light = 0.12 + 0.16 * max(0.0, dot(n, normalize(float2(-0.6, 0.8))));
            float3 rgb = mix(float3(red, green, blue), float3(1.0), rim * light);
            return float4(rgb * inside, inside);
        }
        

        float4 fusedLens(coreimage::sampler image, float4 rect, float radius, float edge, coreimage::destination dest) {
            float2 p = dest.coord();
            float d = fusedDistance(p, rect, radius, edge);
            float2 gradient = float2(fusedDistance(p + float2(0.5, 0.0), rect, radius, edge) - fusedDistance(p - float2(0.5, 0.0), rect, radius, edge),
                                     fusedDistance(p + float2(0.0, 0.5), rect, radius, edge) - fusedDistance(p - float2(0.0, 0.5), rect, radius, edge));
            float2 n = gradient / max(length(gradient), 0.0001);
            float inside = 1.0 - smoothstep(-0.8, 0.6, d);
            float bevel = exp(-abs(d + 3.0) / 3.75) * smoothstep(-13.5, -7.5, d);
            float2 bend = n * bevel * 7.5;
            float red = image.sample(image.transform(p - bend * 1.45)).r;
            float green = image.sample(image.transform(p - bend)).g;
            float blue = image.sample(image.transform(p - bend * 0.55)).b;
            float rim = exp(-abs(d + 0.8) / 0.65);
            float light = 0.12 + 0.16 * max(0.0, dot(n, normalize(float2(-0.6, 0.8))));
            float3 rgb = mix(float3(red, green, blue), float3(1.0), rim * light);
            // Only replace the curved bevel; deep interior must remain transparent.
            float coverage = inside * smoothstep(-13.5, -7.5, d);
            return float4(rgb * coverage, coverage);
        }
        float4 quoteReflection(coreimage::sampler quote, float edge, coreimage::destination dest) {
            float2 p = dest.coord();
            float d = p.x - edge;
            // Reflection belongs only to the covered side of the pane.
            if (d >= 0.0) return float4(0.0);
            float band = exp(-abs(d + 1.0) / 5.0) * (1.0 - smoothstep(8.0, 12.0, abs(d)));
            // A reflected copy across the bevel, rather than a nearly coincident
            // copy that disappears beneath the original opaque glyphs.
            float2 reflected = float2(2.0 * edge - p.x, p.y);
            float4 r = quote.sample(quote.transform(reflected + float2(13.0, 2.0)));
            float4 g = quote.sample(quote.transform(reflected + float2(0.0, 0.0)));
            float4 b = quote.sample(quote.transform(reflected - float2(13.0, 2.0)));
            float gain = band * 0.75;
            float3 rgb = float3(r.r, g.g, b.b) * gain;
            return float4(rgb, max(max(r.a, g.a), b.a) * gain);
        }
} }
