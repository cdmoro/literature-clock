import { beforeEach, expect, it, vi } from 'vitest';
import { FAVORITES_KEY, readFavorites, toggleFavorite } from './quote-collection';
import type { ResolvedQuote } from '../types';
export const savedQuote: ResolvedQuote = {
  id: '1200-001',
  time: '12:00',
  locale: 'en-GB',
  fallback: false,
  index: 0,
  variants: 2,
  quote_first: 'At ',
  quote_time_case: 'noon',
  quote_last: '.',
  quote_raw: 'At noon.',
  title: 'Book',
  author: 'Author',
  sfw: 'sfw',
};
beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});
it('persists a snapshot and removes by stable identity, independent of array position', () => {
  expect(toggleFavorite(savedQuote)).toBe('saved');
  expect(readFavorites()).toEqual([savedQuote]);
  expect(toggleFavorite({ ...savedQuote, index: 10 })).toBe('removed');
  expect(readFavorites()).toEqual([]);
});
it('stores different translations separately', () => {
  toggleFavorite(savedQuote);
  toggleFavorite({ ...savedQuote, locale: 'es-ES' });
  expect(readFavorites()).toHaveLength(2);
});
it('recovers from malformed storage and discards invalid records', () => {
  localStorage.setItem(FAVORITES_KEY, '{broken');
  expect(readFavorites()).toEqual([]);
  localStorage.setItem(
    FAVORITES_KEY,
    JSON.stringify({ version: 1, items: [null, {}, savedQuote, savedQuote, { ...savedQuote, locale: '../../x' }] }),
  );
  expect(readFavorites()).toEqual([savedQuote]);
});
it('does not report success or erase existing favorites when storage is full', () => {
  toggleFavorite(savedQuote);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Full', 'QuotaExceededError');
  });
  expect(toggleFavorite({ ...savedQuote, id: 'other' })).toBe('unavailable');
  expect(readFavorites()).toEqual([savedQuote]);
});
it('rejects fallback entries and bounds the collection without silently discarding favorites', () => {
  expect(toggleFavorite({ ...savedQuote, fallback: true })).toBe('unavailable');
  localStorage.setItem(
    FAVORITES_KEY,
    JSON.stringify({
      version: 1,
      items: Array.from({ length: 500 }, (_, index) => ({ ...savedQuote, id: String(index) })),
    }),
  );
  expect(toggleFavorite(savedQuote)).toBe('full');
  expect(readFavorites()).toHaveLength(500);
});
