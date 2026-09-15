export type TransitionMode = 'none' | 'fade' | 'slide';

export function resolveTransition(value: unknown, legacyFade?: unknown): TransitionMode {
  if (value === 'none' || value === 'fade' || value === 'slide') return value;
  return legacyFade === false || legacyFade === 'false' ? 'none' : 'fade';
}
