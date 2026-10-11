export const BACKGROUNDS = ['default', 'tinted', 'photo', 'plain'] as const;
export type Background = (typeof BACKGROUNDS)[number];

export function supportsBackground(theme: string) {
  return !['book', 'horizon', 'photo'].includes(theme.split('-')[0]);
}

export function resolveBackground(theme: string = 'base', background: Background = 'default'): Background {
  if (theme.split('-')[0] === 'photo') return 'photo';
  return supportsBackground(theme) ? background : 'default';
}
