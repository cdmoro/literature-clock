/** Prefer white when it meets the requested contrast against an sRGB hex color. */
export function contrastingText(color: string, minimumWhiteContrast = 4.5): string {
  if (!/^#[\da-f]{6}$/i.test(color)) return '#000000';
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(color.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return 1.05 / (luminance + 0.05) >= minimumWhiteContrast ? '#ffffff' : '#000000';
}
