import { expect, it } from 'vitest';
import { sharePatternTile } from './share-pattern';

it.each([
  ['dots', 16, 'circle', 'r="1"'],
  ['circles', 48, 'circle', 'r="10"'],
  ['diagonal', 17, 'path', 'stroke-width="1"'],
  ['diagonal-wide', 23, 'path', 'stroke-width="4"'],
] as const)('exports %s as a themed image tile', (pattern, size, shape, geometry) => {
  for (const dark of [false, true]) {
    const tile = sharePatternTile(pattern, 'rgb(47, 46, 44)', dark)!;
    expect(tile.size).toBe(`${size}px ${size}px`);
    const svg = decodeURIComponent(tile.image.slice(tile.image.indexOf(',') + 1, -2));
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(document.querySelector('parsererror')).toBeNull();
    expect(document.querySelector(shape)).not.toBeNull();
    expect(svg).toContain(geometry);
    expect(svg).toContain('rgb(47, 46, 44)');
    expect(document.querySelector('g')!.getAttribute('opacity')).toBe(dark ? '0.12' : '0.07');
  }
});

it.each(['none', 'grid', 'zigzag'] as const)('keeps the supported %s background', (pattern) => {
  expect(sharePatternTile(pattern, '#fff', false)).toBeUndefined();
});
