import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initClock } from './clock';
import { updateQuote } from './quotes';

vi.mock('./quotes', () => ({ updateQuote: vi.fn() }));
vi.mock('./horizon', () => ({ setDayParameters: vi.fn() }));
vi.mock('../utils', () => ({
  getLiveTime: () => new Date().toISOString().slice(11, 16),
  updateFavicon: vi.fn(),
}));
vi.mock('../store', () => ({ store: {
  get: (key: string) => key === 'theme' ? 'base-dark' : key === 'progressbar' ? 'none' : false,
  set: vi.fn(), subscribe: vi.fn(),
} }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-07T17:00:00Z'));
  vi.mocked(updateQuote).mockClear();
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('clock visibility', () => {
  it('keeps ordinary hidden browser tabs paused', () => {
    initClock();
    vi.advanceTimersByTime(60_000);
    expect(updateQuote).toHaveBeenCalledTimes(1);
  });
});
