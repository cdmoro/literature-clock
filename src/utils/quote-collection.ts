import type { ResolvedQuote } from '../types';

export const FAVORITES_KEY = 'literature-clock.favorites.v1';
const LIMIT = 500;
export const HISTORY_KEY = 'literature-clock.history.v1';
const HISTORY_LIMIT = 100;
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

function readCollection(key: string, limit: number): ResolvedQuote[] {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved?.version !== 1 || !Array.isArray(saved.items)) return [];
    const keys = new Set<string>();
    return saved.items
      .filter((item: unknown) => {
        if (!isSavedQuote(item) || keys.has(quoteKey(item))) return false;
        keys.add(quoteKey(item));
        return true;
      })
      .slice(0, limit);
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

export function readFavorites(): ResolvedQuote[] {
  return readCollection(FAVORITES_KEY, LIMIT);
}

export function readHistory(): ResolvedQuote[] {
  return readCollection(HISTORY_KEY, HISTORY_LIMIT);
}

/** Only call after a quote has actually become the displayed selection. */
export function recordQuote(quote: ResolvedQuote): boolean {
  if (!isCollectible(quote)) return true;
  const items = [{ ...quote }, ...readHistory().filter((item) => quoteKey(item) !== quoteKey(quote))].slice(
    0,
    HISTORY_LIMIT,
  );
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ version: 1, items }));
    return true;
  } catch {
    return false;
  }
}

export function clearHistory(): boolean {
  try {
    localStorage.removeItem(HISTORY_KEY);
    return true;
  } catch {
    return false;
  }
}
