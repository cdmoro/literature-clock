import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createStore, store } from '../store';
import { initQuoteLibrary } from './quote-library';
import { readFavorites, toggleFavorite } from '../utils/quote-collection';
import type { ResolvedQuote } from '../types';

vi.mock('./quotes', () => ({ updateQuote: vi.fn() }));
const quote: ResolvedQuote = {
  id: '1200-001',
  time: '12:00',
  locale: 'en-GB',
  fallback: false,
  index: 0,
  variants: 2,
  quote_first: 'At ',
  quote_time_case: 'noon',
  quote_last: '.',
  quote_raw: '<img src=x onerror=alert(1)>',
  title: 'Book',
  author: 'Author',
  sfw: 'sfw',
};
const click = (id: string) => document.getElementById(id)!.click();
beforeEach(() => {
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.body.innerHTML = '<div id="reading-controls"></div>';
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
  createStore();
  store.set('locale', 'en-GB');
  store.set('active-quote', quote);
  initQuoteLibrary();
});
afterEach(() => {
  localStorage.clear();
});
it('saves, reopens and removes favorites without inserting stored text as HTML', () => {
  click('favorite-quote');
  expect(readFavorites()).toHaveLength(1);
  click('open-quote-library');
  const dialog = document.getElementById('quote-library')!;
  expect(dialog.querySelector('li p')?.textContent).toBe(quote.quote_raw);
  expect(dialog.querySelector('img')).toBeNull();
  expect(dialog.querySelector('li a')?.getAttribute('href')).toContain('quote-id=1200-001');
  dialog.querySelector<HTMLButtonElement>('li button')!.click();
  expect(readFavorites()).toHaveLength(0);
  expect(dialog.querySelector('li')).toBeNull();
});
it('hides explicit favorites in Work mode without deleting them', () => {
  toggleFavorite({ ...quote, sfw: 'nsfw' });
  store.set('work', true);
  click('open-quote-library');
  expect(document.querySelector('#quote-library li')).toBeNull();
  expect(readFavorites()).toHaveLength(1);
});
it('returns focus to the launcher when the dialog closes', () => {
  click('open-quote-library');
  (document.getElementById('quote-library') as HTMLDialogElement).close();
  expect(document.activeElement?.id).toBe('open-quote-library');
});

import { readHistory } from '../utils/quote-collection';
it('records rendered quotes and lets recent entries become favorites in the same dialog', () => {
  expect(readHistory()).toHaveLength(1);
  click('open-quote-library');
  click('library-history-tab');
  document.querySelector<HTMLButtonElement>('#quote-library li button')!.click();
  expect(readFavorites()).toHaveLength(1);
  click('clear-quote-history');
  expect(readHistory()).toHaveLength(0);
  expect(readFavorites()).toHaveLength(1);
});
it('does not duplicate a quote on unrelated settings changes or rebuild the open list on each tick', () => {
  click('open-quote-library');
  click('library-history-tab');
  const link = document.querySelector<HTMLAnchorElement>('#quote-library li a')!;
  link.focus();
  store.set('active-quote', { ...quote, id: '1200-002' });
  expect(readHistory()).toHaveLength(2);
  expect(document.activeElement).toBe(link);
  store.set('theme', 'base-dark');
  expect(readHistory()).toHaveLength(2);
});
it('supports arrow-key navigation between collection tabs', () => {
  click('open-quote-library');
  document
    .getElementById('library-favorites-tab')!
    .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  expect(document.activeElement?.id).toBe('library-history-tab');
  expect(document.activeElement?.getAttribute('aria-selected')).toBe('true');
});
