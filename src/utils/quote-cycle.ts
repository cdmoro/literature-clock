import type { Quote } from '../types';

/** Tracks only the current minute/language/filter, so history cannot grow unbounded. */
export class QuoteCycle {
  private context = '';
  private seen = new Set<string>();

  next(quotes: Quote[], context: string, currentId?: string): number {
    if (context !== this.context) {
      this.context = context;
      this.seen.clear();
    }
    if (currentId) this.seen.add(currentId);
    let candidates = quotes.filter((quote) => !this.seen.has(quote.id));
    if (!candidates.length) {
      this.seen.clear();
      if (currentId && quotes.length > 1) this.seen.add(currentId);
      candidates = quotes.filter((quote) => !this.seen.has(quote.id));
    }
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    if (!next) return 0;
    this.seen.add(next.id);
    return quotes.indexOf(next);
  }
}
