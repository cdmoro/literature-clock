/// <reference types="vite/client" />
import wavesTile from '../assets/waves.svg';
import noiseTile from '../assets/noise.png';
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

it('uses the same transparent noise image tile as the live clock', () => {
  const light = sharePatternTile('noise', '#222', false)!;
  const dark = sharePatternTile('noise', '#fff', true)!;
  expect(light).toEqual(dark);
  expect(light.size).toBe('256px 256px');
  expect(light.image).toBe(`url("${noiseTile}")`);
});

it('exports the same thin wave tile used by the clock', () => {
  for (const dark of [false, true]) {
    expect(sharePatternTile('waves', '#222', dark)).toEqual({
      image: `url("${wavesTile}")`,
      size: '64px 24px',
    });
  }
});

it.each([
  ['mixed-stripes', '64px 64px'],
  ['checkerboard', '48px 48px'],
  ['cubes', '80px 138.564px'],
  ['fans', '128px 64px'],
  ['leaves', '160px 168px'],
  ['vines', '160px 144px'],
  ['contours', '320px 256px'],
  ['woven', '48px 48px'],
  ['zigzag-fine', '48px 32px'],
  ['rain', '240px 240px'],
  ['christmas', '320px 320px'],
  ['hearts', '320px 320px'],
  ['reading', '320px 320px'],
  ['space', '320px 320px'],
  ['garden', '320px 320px'],
  ['clouds', '960px 768px'],
  ['constellations', '960px 768px'],
] as const)('exports %s as an image tile in both colour schemes', (pattern, size) => {
  for (const dark of [false, true]) {
    const tile = sharePatternTile(pattern, '#222', dark)!;
    expect(tile.size).toBe(size);
    expect(tile.image).toContain(`/patterns/${pattern}.svg`);
    expect(tile.image).not.toContain('gradient');
  }
});
