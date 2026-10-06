export const BACKGROUND_PATTERNS = [
  'none',
  'random',
  'dots',
  'circles',
  'diagonal',
  'diagonal-wide',
  'grid',
  'zigzag',
  'waves',
  'noise',
  'mixed-stripes',
  'checkerboard',
  'cubes',
  'fans',
  'leaves',
  'vines',
  'contours',
  'woven',
  'zigzag-fine',
  'rain',
  'christmas',
  'hearts',
  'reading',
  'space',
  'garden',
  'clouds',
  'constellations',
] as const;
export type BackgroundPattern = (typeof BACKGROUND_PATTERNS)[number];

// These skins can replace their page background with a pattern in either colour scheme.
const PLAIN_THEMES = new Set([
  'base',
  'pink',
  'green',
  'orange',
  'purple',
  'blue',
  'gray',
  'elegant',
  'bohemian',
  'handwriting',
  'frame',
  'poster',
  'subtle',
  'kindle',
  'festive',
]);

export function supportsBackgroundPattern(theme: string) {
  return PLAIN_THEMES.has(theme.split('-')[0]);
}

export function isBackgroundPattern(value: string): value is BackgroundPattern {
  return BACKGROUND_PATTERNS.some((pattern) => pattern === value);
}

let randomMinute: string | undefined;
let randomPattern: BackgroundPattern = 'dots';

/** Keep one concrete pattern for a minute, excluding the previous pattern. */
export function resolveBackgroundPattern(pattern: BackgroundPattern, minute: string): BackgroundPattern {
  if (pattern !== 'random') return pattern;
  if (randomMinute !== minute) {
    const choices = BACKGROUND_PATTERNS.filter(
      (value) => value !== 'none' && value !== 'random' && value !== randomPattern,
    );
    randomPattern = choices[Math.floor(Math.random() * choices.length)];
    randomMinute = minute;
  }
  return randomPattern;
}
