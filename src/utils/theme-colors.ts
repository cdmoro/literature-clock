const PALETTE_COLORS: Record<string, string> = {
  pink: '#ff89d8',
  green: '#2ecc71',
  orange: '#f39c12',
  purple: '#9b59b6',
  blue: '#2c97df',
  gray: '#808686',
  color: '#d24335',
};

export function fixedThemeColor(theme: string) {
  return PALETTE_COLORS[theme];
}

export const themeSupportsCustomColor = (theme: string) => !(theme in PALETTE_COLORS);
