export const BACKGROUND_PATTERNS = ['none', 'dots', 'circles', 'diagonal', 'grid', 'zigzag'] as const;
export type BackgroundPattern = (typeof BACKGROUND_PATTERNS)[number];

// These skins have a plain page background in both colour schemes.
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
]);

export function supportsBackgroundPattern(theme: string) {
  return PLAIN_THEMES.has(theme.split('-')[0]);
}

export function isBackgroundPattern(value: string): value is BackgroundPattern {
  return BACKGROUND_PATTERNS.some((pattern) => pattern === value);
}
