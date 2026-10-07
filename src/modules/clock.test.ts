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
  delete window.__literatureClockNativeHost;
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete window.__literatureClockNativeHost;
});

describe('clock in remote native saver windows', () => {
  it('keeps ordinary hidden browser tabs paused', () => {
    initClock();
    vi.advanceTimersByTime(60_000);
    expect(updateQuote).toHaveBeenCalledTimes(1);
  });
  it('advances the quote in an active native host even when WebKit reports hidden', () => {
    window.__literatureClockNativeHost = true;
    initClock();
    vi.advanceTimersByTime(60_000);
    expect(updateQuote).toHaveBeenLastCalledWith({ time: '17:01', minuteTick: true });
    expect(updateQuote).toHaveBeenCalledTimes(2);
  });
});
