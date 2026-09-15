import { describe, expect, it } from 'vitest';
import { resolveTransition } from './transition-settings';

describe('transition setting compatibility', () => {
  it('preserves the old fade preference', () => {
    expect(resolveTransition(undefined, false)).toBe('none');
    expect(resolveTransition(null, 'false')).toBe('none');
    expect(resolveTransition(undefined, true)).toBe('fade');
    expect(resolveTransition(undefined)).toBe('fade');
  });
  it('gives a valid explicit selection priority and rejects unknown modes', () => {
    expect(resolveTransition('slide', false)).toBe('slide');
    expect(resolveTransition('none', true)).toBe('none');
    expect(resolveTransition('unknown')).toBe('fade');
  });
});
