import noiseTile from '../assets/noise.png';
import type { BackgroundPattern } from './background-patterns';

// Use image tiles for gradients that the export renderer cannot reproduce.
export function sharePatternTile(pattern: BackgroundPattern, color: string, dark: boolean) {
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
