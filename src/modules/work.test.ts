import { beforeEach, expect, it, vi } from 'vitest';
import { initWorkMode } from './work';
import { updateQuote } from './quotes';

const { state } = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock('../store', () => ({
  store: {
    toggle: () => (state.work = !state.work),
    get: (key: string) => state[key],
  },
}));
vi.mock('./quotes', () => ({ updateQuote: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  state.work = false;
  document.body.innerHTML = '<button id="work"></button>';
  initWorkMode();
});

it.each([false, 'false', 'true', 'unknown', undefined])(
  'replaces the active quote when work mode is enabled with classification %s',
  (sfw) => {
    state['active-quote'] = { sfw };
    document.getElementById('work')!.click();
    expect(updateQuote).toHaveBeenCalledOnce();
  },
);

it('refreshes variants while preserving the active minute, language and safe quote', () => {
  state['active-quote'] = { sfw: true, time: '09:15', locale: 'es-ES' };
  document.getElementById('work')!.click();
  expect(updateQuote).toHaveBeenCalledWith({ time: '09:15', locale: 'es-ES', preserveQuote: true });
});

it('replaces the fallback when work mode is disabled', () => {
  state.work = true;
  state['active-quote'] = { sfw: true, fallback: true };
  document.getElementById('work')!.click();
  expect(updateQuote).toHaveBeenCalledOnce();
});
