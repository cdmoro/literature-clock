import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createStore, store } from '../store';
import { initReadingControls, pauseReading, resumeReading } from './reading-controls';
import { initClock } from './clock';
import { cancelPendingQuote, updateQuote } from './quotes';
import type { ResolvedQuote } from '../types';

vi.mock('./quotes', () => ({ updateQuote: vi.fn(), cancelPendingQuote: vi.fn() }));
vi.mock('./horizon', () => ({ setDayParameters: vi.fn() }));
vi.mock('../utils', () => ({
  getLiveTime: () => new Date().toTimeString().slice(0, 5),
  updateFavicon: vi.fn(),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 22, 12, 0, 30));
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.body.innerHTML = '<footer><div id="settings"></div></footer><div id="time-clock"></div>';
  createStore();
  store.set('active-quote', { id: '1200-000', time: '12:00', locale: 'en-GB' } as ResolvedQuote);
  vi.clearAllMocks();
});
afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

it('keeps the real clock ticking without replacing a paused quote', () => {
  initReadingControls();
  initClock();
  pauseReading();
  vi.mocked(updateQuote).mockClear();
  vi.advanceTimersByTime(60000);
  expect(document.getElementById('time-clock')?.textContent).toBe('12:01');
  expect(updateQuote).not.toHaveBeenCalled();
  expect(cancelPendingQuote).toHaveBeenCalled();
  expect(document.getElementById('pause-reading')?.getAttribute('aria-pressed')).toBe('true');
  expect(JSON.parse(localStorage.getItem('settings')!)).not.toHaveProperty('paused');
});

it('opens a fixed link paused and resumes at the real minute without stale URL selectors', () => {
  history.replaceState({}, '', '/?time=09:15&quote-id=0915-001&index=1');
  createStore();
  initReadingControls();
  initClock();
  expect(store.get('paused')).toBe(true);
  expect(updateQuote).toHaveBeenCalledTimes(1);
  resumeReading();
  expect(store.get('paused')).toBe(false);
  expect(store.get('time')).toBeUndefined();
  expect(store.get('quote-id')).toBeUndefined();
  expect(window.location.search).toBe('');
  expect(updateQuote).toHaveBeenLastCalledWith({ time: '12:00' });
});

it('does not pause before the first quote has loaded', () => {
  store.set('active-quote', undefined);
  pauseReading();
  expect(store.get('paused')).not.toBe(true);
});
