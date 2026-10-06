import cloudsTile from '../assets/patterns/clouds.svg';
import constellationsTile from '../assets/patterns/constellations.svg';
import zigzagfineTile from '../assets/patterns/zigzag-fine.svg';
import rainTile from '../assets/patterns/rain.svg';
import christmasTile from '../assets/patterns/christmas.svg';
import heartsTile from '../assets/patterns/hearts.svg';
import readingTile from '../assets/patterns/reading.svg';
import spaceTile from '../assets/patterns/space.svg';
import gardenTile from '../assets/patterns/garden.svg';
import mixedstripesTile from '../assets/patterns/mixed-stripes.svg';
import checkerboardTile from '../assets/patterns/checkerboard.svg';
import cubesTile from '../assets/patterns/cubes.svg';
import fansTile from '../assets/patterns/fans.svg';
import leavesTile from '../assets/patterns/leaves.svg';
import vinesTile from '../assets/patterns/vines.svg';
import contoursTile from '../assets/patterns/contours.svg';
import wovenTile from '../assets/patterns/woven.svg';
import wavesTile from '../assets/waves.svg';
import noiseTile from '../assets/noise.png';
import type { BackgroundPattern } from './background-patterns';

const IMAGE_PATTERN_TILES = {
  clouds: { image: `url("${cloudsTile}")`, size: '960px 768px' },
  constellations: { image: `url("${constellationsTile}")`, size: '960px 768px' },

  'zigzag-fine': { image: `url("${zigzagfineTile}")`, size: '48px 32px' },
  rain: { image: `url("${rainTile}")`, size: '240px 240px' },
  christmas: { image: `url("${christmasTile}")`, size: '320px 320px' },
  hearts: { image: `url("${heartsTile}")`, size: '320px 320px' },
  reading: { image: `url("${readingTile}")`, size: '320px 320px' },
  space: { image: `url("${spaceTile}")`, size: '320px 320px' },
  garden: { image: `url("${gardenTile}")`, size: '320px 320px' },

  'mixed-stripes': { image: `url("${mixedstripesTile}")`, size: '64px 64px' },
  checkerboard: { image: `url("${checkerboardTile}")`, size: '48px 48px' },
  cubes: { image: `url("${cubesTile}")`, size: '80px 138.564px' },
  fans: { image: `url("${fansTile}")`, size: '128px 64px' },
  leaves: { image: `url("${leavesTile}")`, size: '160px 168px' },
  vines: { image: `url("${vinesTile}")`, size: '160px 144px' },
  contours: { image: `url("${contoursTile}")`, size: '320px 256px' },
  woven: { image: `url("${wovenTile}")`, size: '48px 48px' },
} as const;

// Use image tiles for gradients that the export renderer cannot reproduce.
export function sharePatternTile(pattern: BackgroundPattern, color: string, dark: boolean) {
  if (pattern in IMAGE_PATTERN_TILES) return IMAGE_PATTERN_TILES[pattern as keyof typeof IMAGE_PATTERN_TILES];
  if (pattern === 'waves') return { image: `url("${wavesTile}")`, size: '64px 24px' };
  if (pattern === 'noise') return { image: `url("${noiseTile}")`, size: '256px 256px' };
  if (!['dots', 'circles', 'diagonal', 'diagonal-wide'].includes(pattern)) return undefined;
  const circular = pattern === 'dots' || pattern === 'circles';
  const size = pattern === 'dots' ? 16 : pattern === 'circles' ? 48 : pattern === 'diagonal' ? 17 : 23;
  const safeColor = color.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
  const shape = circular
    ? `<circle cx="${size / 2}" cy="${size / 2}" r="${pattern === 'dots' ? 1 : 10}" fill="${safeColor}"/>`
    : `<path d="M${-size} ${size}L${size} ${-size}M0 ${size}L${size} 0M0 ${2 * size}L${2 * size} 0" fill="none" stroke="${safeColor}" stroke-width="${pattern === 'diagonal' ? 1 : 4}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><g opacity="${dark ? 0.12 : 0.07}">${shape}</g></svg>`;
  return { image: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, size: `${size}px ${size}px` };
}
