import { afterEach, expect, it, vi } from 'vitest';
import { getLiveTime, getTime } from './index';
vi.mock('../store', () => ({ store: { get: () => '09:15' } }));
afterEach(() => {
  vi.useRealTimers();
});
it('keeps the current time independent of a fixed quote link', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 22, 12, 34));
  expect(getTime()).toBe('09:15');
  expect(getLiveTime()).toBe('12:34');
  vi.advanceTimersByTime(60000);
  expect(getLiveTime()).toBe('12:35');
});
