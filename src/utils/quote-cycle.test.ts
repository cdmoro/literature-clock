import { expect, it, vi } from 'vitest';
import { QuoteCycle } from './quote-cycle';
import type { Quote } from '../types';
const quotes = ['a', 'b', 'c'].map((id) => ({ id }) as Quote);
it('exhausts a cycle without repetitions, including the initially displayed quote', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const cycle = new QuoteCycle();
  const first = cycle.next(quotes, '12:00/en-GB/false', 'a');
  const second = cycle.next(quotes, '12:00/en-GB/false', quotes[first].id);
  expect(new Set(['a', quotes[first].id, quotes[second].id]).size).toBe(3);
  const third = cycle.next(quotes, '12:00/en-GB/false', quotes[second].id);
  expect(third).not.toBe(second);
  vi.restoreAllMocks();
});
it('resets for a new minute, language or content filter', () => {
  const cycle = new QuoteCycle();
  expect(cycle.next(quotes.slice(0, 2), 'one', 'a')).toBe(1);
  expect(cycle.next(quotes.slice(0, 2), 'two', 'a')).toBe(1);
});
it('handles a single eligible quote', () => {
  expect(new QuoteCycle().next(quotes.slice(0, 1), 'one', 'a')).toBe(0);
});
