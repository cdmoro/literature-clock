import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createStore, store } from '../store';
import { updateQuote } from './quotes';
import { initWorkMode } from './work';
import { initReadingControls } from './reading-controls';
import type { Quote } from '../types';

vi.mock('../utils', () => ({
  fitQuote: vi.fn(),
  getTime: () => '12:00',
  getLiveTime: () => '12:00',
  updateGHLinks: vi.fn(),
}));
vi.mock('./bilingual', () => ({ renderTranslation: vi.fn() }));
vi.mock('./themes', () => ({
  removeBackgroundImage: vi.fn(),
  setDynamicBackgroundPicture: vi.fn(),
  setTheme: vi.fn(),
}));
vi.mock('./transitions', () => ({
  cancelQuoteTransition: vi.fn(),
  transitionQuote: async (render: () => void, current: () => boolean) => {
    if (current()) render();
  },
}));
const first: Quote = {
  id: '0915-000',
  quote_first: 'At ',
  quote_time_case: 'nine fifteen',
  quote_last: '.',
  title: 'Book',
  author: 'Author',
  sfw: false,
};
const second = { ...first, id: '0915-001' };
const button = (id: string) => document.getElementById(id) as HTMLButtonElement;

beforeEach(() => {
  localStorage.clear();
  history.replaceState({}, '', '/');
  createStore();
  store.set('locale', 'en-GB');
  store.set('paused', true);
  document.body.innerHTML = '<div id="settings"></div><button id="work"></button><blockquote id="quote"></blockquote>';
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [first, second] }));
  initWorkMode();
  initReadingControls();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('immediately shows a fallback and disables navigation when all passages are excluded, then restores them', async () => {
  await updateQuote({ time: '09:15' });
  expect(button('next-quote').disabled).toBe(false);
  button('work').click();
  await vi.waitFor(() => expect(store.get('active-quote')?.fallback).toBe(true));
  expect(store.get('active-quote')?.time).toBe('09:15');
  expect(button('previous-quote').disabled).toBe(true);
  expect(button('next-quote').disabled).toBe(true);
  expect(document.getElementById('quote-position')?.textContent).toBe('—');
  button('work').click();
  await vi.waitFor(() => expect(store.get('active-quote')?.fallback).not.toBe(true));
  expect(store.get('active-quote')?.variants).toBe(2);
  expect(button('previous-quote').disabled).toBe(false);
  expect(button('next-quote').disabled).toBe(false);
  expect(store.get('paused')).toBe(true);
});

it('refreshes counts in both directions while retaining the safe quote and displayed random language', async () => {
  vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [first, { ...second, sfw: true }] } as Response);
  store.set('index', '1');
  await updateQuote({ time: '09:15', locale: 'es-ES' });
  store.set('random-locale', true);
  button('work').click();
  await vi.waitFor(() => expect(store.get('active-quote')?.variants).toBe(1));
  expect(store.get('active-quote')?.id).toBe(second.id);
  expect(store.get('active-quote')?.locale).toBe('es-ES');
  expect(document.getElementById('quote-position')?.textContent).toBe('1/1');
  expect(button('next-quote').disabled).toBe(true);
  // A stale URL index must not select another passage when the list expands.
  store.set('index', '0');
  button('work').click();
  await vi.waitFor(() => expect(store.get('active-quote')?.variants).toBe(2));
  expect(store.get('active-quote')?.id).toBe(second.id);
  expect(store.get('active-quote')?.locale).toBe('es-ES');
  expect(document.getElementById('quote-position')?.textContent).toBe('2/2');
  expect(button('next-quote').disabled).toBe(false);
});
