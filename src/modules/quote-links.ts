import { store } from '../store';
import type { ResolvedQuote } from '../types';

/** A quote is addressed by catalogue, minute and stable ID, never array position. */
export function getQuoteUrl(quote: ResolvedQuote): string | undefined {
  if (quote.fallback || !quote.id || store.get('quote')) return;
  const url = new URL(window.location.pathname, window.location.origin);
  url.searchParams.set('locale', quote.locale);
  url.searchParams.set('time', quote.time);
  url.searchParams.set('quote-id', quote.id);
  // Override the recipient's saved random-language preference.
  url.searchParams.set('random-locale', 'false');
  for (const key of ['theme', 'font'] as const) {
    const value = store.get(key);
    if (value) url.searchParams.set(key, value);
  }
  const color = new URLSearchParams(window.location.search).get('color');
  if (color) url.searchParams.set('color', color);
  return url.toString();
}
