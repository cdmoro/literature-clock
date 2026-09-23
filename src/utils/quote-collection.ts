import type { ResolvedQuote } from '../types';

export const FAVORITES_KEY = 'literature-clock.favorites.v1';
const LIMIT = 500;
export type CollectionResult = 'saved' | 'removed' | 'full' | 'unavailable';

export function quoteKey(quote: Pick<ResolvedQuote, 'id' | 'time' | 'locale'>) {
  return `${quote.locale}/${quote.time}/${quote.id}`;
}

export function isCollectible(quote: ResolvedQuote | undefined): quote is ResolvedQuote {
  return !!quote && !quote.fallback && !!quote.id && /^([01]\d|2[0-3]):[0-5]\d$/.test(quote.time);
}

function isSavedQuote(value: unknown): value is ResolvedQuote {
  if (!value || typeof value !== 'object') return false;
  const quote = value as ResolvedQuote;
  return (
    isCollectible(quote) &&
    typeof quote.locale === 'string' &&
    /^[a-z]{2,3}-[A-Z]{2}(?:-draft)?$/.test(quote.locale) &&
    ['id', 'quote_first', 'quote_time_case', 'quote_last', 'quote_raw', 'title', 'author', 'sfw'].every(
      (key) => typeof (value as Record<string, unknown>)[key] === 'string',
    )
  );
}

export function readFavorites(): ResolvedQuote[] {
  try {
    const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || 'null');
    if (saved?.version !== 1 || !Array.isArray(saved.items)) return [];
    const keys = new Set<string>();
    return saved.items
      .filter((item: unknown) => {
        if (!isSavedQuote(item) || keys.has(quoteKey(item))) return false;
        keys.add(quoteKey(item));
        return true;
      })
      .slice(0, LIMIT);
  } catch {
    return [];
  }
}

export function toggleFavorite(quote: ResolvedQuote): CollectionResult {
  if (!isCollectible(quote)) return 'unavailable';
  const items = readFavorites();
  const key = quoteKey(quote);
  const exists = items.some((item) => quoteKey(item) === key);
  if (!exists && items.length >= LIMIT) return 'full';
  const next = exists ? items.filter((item) => quoteKey(item) !== key) : [{ ...quote }, ...items];
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify({ version: 1, items: next }));
    return exists ? 'removed' : 'saved';
  } catch {
    return 'unavailable';
  }
}
