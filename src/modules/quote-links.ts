import { store } from '../store';
import type { ResolvedQuote } from '../types';

/** A quote is addressed by catalogue, minute and stable ID, never array position. */
export function getQuoteUrl(quote: ResolvedQuote): string | undefined {
  if (quote.fallback || !quote.id) return;
  const url = new URL(window.location.pathname, window.location.origin);
  url.searchParams.set('locale', quote.locale);
  if (!/^([01]\d|2[0-3])[0-5]\d-\d+$/.test(quote.id)) url.searchParams.set('time', quote.time);
  url.searchParams.set('quote-id', quote.id);
  for (const key of ['theme', 'font'] as const) {
    const value = store.get(key);
    if (value) url.searchParams.set(key, value);
  }
  const color = new URLSearchParams(window.location.search).get('color');
  if (color) url.searchParams.set('color', color);
  return url.toString();
}
