import { expect, it } from 'vitest';
import { contrastingText } from './colors';

it('prefers readable white on the base red and black on light colors', () => {
  expect(contrastingText('#d24335')).toBe('#ffffff');
  expect(contrastingText('#ffffff')).toBe('#000000');
  expect(contrastingText('#000000')).toBe('#ffffff');
  expect(contrastingText('#ffcc00')).toBe('#000000');
});

it('allows adjusting the white contrast threshold', () => {
  expect(contrastingText('#d24335', 7)).toBe('#000000');
});
