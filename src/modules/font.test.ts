import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { applyCustomFont, initFont, resetFont, removeCustomFont, CUSTOM_FONTS_KEY } from './font';
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

test('invalid names never make a request and failed additions preserve the active font', async () => {
  await applyCustomFont('Lora; color:red');
  expect(loadGoogleFont).not.toHaveBeenCalled();
  await applyCustomFont('Roboto');
  vi.mocked(loadGoogleFont).mockRejectedValue(new Error('Not found'));
  await applyCustomFont('Missing Family');
  expect(store.get('font')).toBe('Roboto');
  expect(document.getElementById('custom-font-status')!.textContent).toContain('not added');
  expect(document.querySelector('option[value="Missing Family"]')).toBeNull();
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

test('custom fonts survive reloads, switching and case-insensitive duplicate additions', async () => {
  vi.mocked(loadGoogleFont).mockResolvedValue();
  await applyCustomFont('Lora');
  await applyCustomFont('Nunito');
  await applyCustomFont('lora');
  expect(store.get('font')).toBe('Lora');
  expect(JSON.parse(localStorage.getItem(CUSTOM_FONTS_KEY)!)).toEqual(['Lora', 'Nunito']);
  expect(document.querySelectorAll('option[value="Lora"]')).toHaveLength(1);
  await applyCustomFont('roboto');
  expect(store.get('font')).toBe('Roboto');
  expect(document.querySelectorAll('option[value="Roboto"]')).toHaveLength(1);
  expect(JSON.parse(localStorage.getItem(CUSTOM_FONTS_KEY)!)).toEqual(['Lora', 'Nunito']);
  initFont();
  expect(document.querySelector('option[value="Lora"]')).not.toBeNull();
  expect(document.querySelector('option[value="Nunito"]')).not.toBeNull();
  await applyCustomFont('Nunito');
  initFont();
  await vi.waitFor(() => expect(document.querySelector<HTMLSelectElement>('#font-select')!.value).toBe('Nunito'));
});

test('removing a custom font preserves other fonts and resets only the active custom font', async () => {
  vi.mocked(loadGoogleFont).mockResolvedValue();
  await applyCustomFont('Lora');
  await applyCustomFont('Nunito');
  removeCustomFont();
  expect(store.get('font')).toBe('default');
  expect(JSON.parse(localStorage.getItem(CUSTOM_FONTS_KEY)!)).toEqual(['Lora']);
  expect(document.querySelector('option[value="Nunito"]')).toBeNull();
  await applyCustomFont('Roboto');
  removeCustomFont();
  expect(store.get('font')).toBe('Roboto');
  expect(JSON.parse(localStorage.getItem(CUSTOM_FONTS_KEY)!)).toEqual(['Lora']);
  await applyCustomFont('Lora');
  removeCustomFont();
  expect(store.get('font')).toBe('default');
});

test('removal cancels pending additions and malformed saved lists do not break initialization', async () => {
  localStorage.setItem(CUSTOM_FONTS_KEY, '{bad json');
  expect(() => initFont()).not.toThrow();
  let finish!: () => void;
  vi.mocked(loadGoogleFont).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const adding = applyCustomFont('Lora');
  removeCustomFont();
  finish();
  await adding;
  expect(JSON.parse(localStorage.getItem(CUSTOM_FONTS_KEY)!)).toEqual([]);
  expect(document.querySelector('option[value="Lora"]')).toBeNull();
});

test('an unavailable saved font falls back to the theme without deleting the saved catalogue', async () => {
  localStorage.setItem(CUSTOM_FONTS_KEY, JSON.stringify(['Lora']));
  store.set('font', 'Lora');
  vi.mocked(loadGoogleFont).mockRejectedValue(new Error('Offline'));
  initFont();
  await vi.waitFor(() => expect(store.get('font')).toBe('default'));
  expect(JSON.parse(localStorage.getItem(CUSTOM_FONTS_KEY)!)).toEqual(['Lora']);
});
