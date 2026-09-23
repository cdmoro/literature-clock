import { beforeEach, expect, it, vi } from 'vitest';
import { updateQuote } from './quotes';
import type { Quote, ResolvedQuote } from '../types';

const { state } = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock('../store', () => ({
  store: {
    get: (key: string) => state[key],
    set: (key: string, value: unknown) => {
      state[key] = value;
    },
  },
}));
vi.mock('./locales', () => ({
  getBaseLocale: (locale: string) => locale,
  getStrings: () => ({ title: 'Title', author: 'Author' }),
  getRandomLocale: () => 'es-ES',
}));
vi.mock('./themes', () => ({
  removeBackgroundImage: vi.fn(),
  setDynamicBackgroundPicture: vi.fn(),
  setTheme: vi.fn(),
}));
vi.mock('../utils', () => ({ fitQuote: vi.fn(), getTime: () => '12:00', updateGHLinks: vi.fn() }));
vi.mock('./transitions', () => ({
  cancelQuoteTransition: vi.fn(),
  transitionQuote: async (render: () => void, current: () => boolean) => {
    if (current()) render();
  },
}));

const first: Quote = {
  id: '1200-000',
  quote_first: 'At ',
  quote_time_case: 'noon',
  quote_last: '.',
  title: 'Book',
  author: 'Writer',
  sfw: 'sfw',
};
const second = { ...first, id: '1200-001' };
const active = () => state['active-quote'] as ResolvedQuote;

beforeEach(() => {
  vi.restoreAllMocks();
  Object.keys(state).forEach((key) => delete state[key]);
  state.locale = 'en-GB';
  document.body.innerHTML = '<blockquote id="quote"></blockquote>';
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [first, second] }));
  vi.spyOn(Math, 'random').mockReturnValue(0.99);
});

it('preserves identity at index zero when translated catalogues are reordered', async () => {
  state['active-quote'] = { ...first, index: 1 };
  await updateQuote({ time: '12:00', preserveQuote: true });
  expect(active().id).toBe(first.id);
  expect(active().index).toBe(0);
  expect(active().time).toBe('12:00');
});

it('chooses an available quote if the identity is missing in the target locale', async () => {
  state['active-quote'] = { id: 'missing', index: 0 };
  await updateQuote({ preserveQuote: true });
  expect(active().id).toBe(second.id);
});

it('preserves identity after work mode filters earlier entries', async () => {
  state.work = true;
  state['active-quote'] = { ...second, index: 1 };
  vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [{ ...first, sfw: 'nsfw' }, second] } as Response);
  await updateQuote({ preserveQuote: true });
  expect(active().id).toBe(second.id);
  expect(active().index).toBe(0);
});

it('keeps legacy index=0 links working', async () => {
  state.index = '0';
  await updateQuote();
  expect(active().id).toBe(first.id);
});

it('does not let a slower earlier request replace the current quote', async () => {
  let resolve!: (response: Response) => void;
  vi.mocked(fetch).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const previous = updateQuote();
  await updateQuote();
  resolve({ ok: true, json: async () => [first] } as Response);
  await previous;
  expect(active().id).toBe(second.id);
});

it('opens a stable ID even when saved random language and a legacy index disagree', async () => {
  state['quote-id'] = first.id;
  state['random-locale'] = true;
  state.index = '1';
  await updateQuote();
  expect(active().id).toBe(first.id);
  expect(active().locale).toBe('en-GB');
});

it('explains missing IDs and respects work mode even with a legacy index', async () => {
  state.work = true;
  state.index = '0';
  state['quote-id'] = first.id;
  vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [{ ...first, sfw: 'nsfw' }, second] } as Response);
  await updateQuote();
  expect(active().id).toBe(second.id);
  expect(document.getElementById('quote-notice')?.textContent).toContain('unavailable');
});

it('keeps the displayed language when exploring in random-language mode', async () => {
  state['random-locale'] = true;
  state.paused = true;
  state['active-quote'] = { ...first, time: '09:00', locale: 'en-GB' };
  await updateQuote({ nextVariant: true });
  expect(active().locale).toBe('en-GB');
  expect(active().time).toBe('09:00');
  expect(active().id).toBe(second.id);
  expect(active().variants).toBe(2);
});
