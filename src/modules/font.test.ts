import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { applyCustomFont, initFont, resetFont } from './font';
import { loadGoogleFont } from '../utils/google-font';
import { createStore, store } from '../store';

vi.mock('../utils', () => ({ fitQuote: vi.fn(), loadFontIfNotExists: vi.fn() }));
vi.mock('../utils/google-font', async (original) => ({
  ...(await original<typeof import('../utils/google-font')>()),
  loadGoogleFont: vi.fn(),
}));

beforeEach(() => {
  document.body.innerHTML =
    '<select id="font-select"><option value="default">Default</option></select><form id="custom-font-form"><input id="custom-font-name"></form><p id="custom-font-status"></p>';
  createStore();
  initFont();
});
afterEach(() => {
  resetFont();
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.body.innerHTML = '';
  vi.resetAllMocks();
});

test('applies and saves a custom font only after successful loading', async () => {
  vi.mocked(loadGoogleFont).mockResolvedValue();
  await applyCustomFont('  Lora  ');
  expect(store.get('font')).toBe('Lora');
  expect(document.documentElement.style.getPropertyValue('--override-quote-font-family')).toContain('"Lora"');
  expect(document.querySelector<HTMLSelectElement>('#font-select')!.value).toBe('Lora');
  expect(JSON.parse(localStorage.getItem('settings')!).font).toBe('Lora');
});

test('invalid names never make a request and failed loads restore the theme font', async () => {
  await applyCustomFont('Lora; color:red');
  expect(loadGoogleFont).not.toHaveBeenCalled();
  vi.mocked(loadGoogleFont).mockRejectedValue(new Error('Not found'));
  await applyCustomFont('Missing Family');
  expect(store.get('font')).toBe('default');
  expect(document.documentElement.style.getPropertyValue('--override-quote-font-family')).toBe('');
  expect(document.getElementById('custom-font-status')!.textContent).toContain('default');
});

test('a late custom font response cannot override a subsequent theme or font choice', async () => {
  let finish!: () => void;
  vi.mocked(loadGoogleFont).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const result = applyCustomFont('Lora');
  resetFont();
  finish();
  await result;
  expect(store.get('font')).toBe('default');
  expect(document.documentElement.style.getPropertyValue('--override-quote-font-family')).toBe('');
});
