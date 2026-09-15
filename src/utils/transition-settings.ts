export type TransitionMode = 'none' | 'fade' | 'slide' | 'blur' | 'zoom';

export function resolveTransition(value: unknown, legacyFade?: unknown): TransitionMode {
  if (value === 'none' || value === 'fade' || value === 'slide' || value === 'blur' || value === 'zoom') return value;
  return legacyFade === false || legacyFade === 'false' ? 'none' : 'fade';
}
