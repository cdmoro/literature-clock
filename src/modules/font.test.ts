import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  applyCustomFont,
  initFont,
  resetFont,
  removeCustomFont,
  refreshDefaultFontLabel,
  CUSTOM_FONTS_KEY,
} from './font';
import { loadGoogleFont } from '../utils/google-font';
import { fitQuote } from '../utils';
import { createStore, store } from '../store';

vi.mock('../utils', () => ({ fitQuote: vi.fn(), loadFontIfNotExists: vi.fn() }));
vi.mock('../utils/google-font', async (original) => ({
  ...(await original<typeof import('../utils/google-font')>()),
  loadGoogleFont: vi.fn(),
}));

beforeEach(() => {
  document.body.innerHTML =
    '<select id="font-select"><option value="default">Default</option></select><button id="reset-font" hidden></button><form id="custom-font-form"><input id="custom-font-name"></form><p id="custom-font-status"></p>';
  createStore();
  initFont();
});
afterEach(() => {
  resetFont();
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.body.innerHTML = '';
  delete document.documentElement.dataset.theme;
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

test('the default label follows the theme and interface language', () => {
  store.set('ui-locale', 'es-ES');
  document.documentElement.dataset.theme = 'poster-light';
  refreshDefaultFontLabel();
  expect(document.querySelector('option[value="default"]')!.textContent).toBe('Por defecto (Averia Serif Libre)');
  document.documentElement.dataset.theme = 'base-dark';
  refreshDefaultFontLabel();
  expect(document.querySelector('option[value="default"]')!.textContent).toBe('Por defecto (Special Elite)');
});

test('adding a font clears the input after success and preserves it on failure', async () => {
  const input = document.querySelector<HTMLInputElement>('#custom-font-name')!;
  const form = document.getElementById('custom-font-form')!;
  vi.mocked(loadGoogleFont).mockResolvedValue();
  input.value = 'Lora';
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  await vi.waitFor(() => expect(input.value).toBe(''));
  vi.mocked(loadGoogleFont).mockRejectedValue(new Error('Not found'));
  input.value = 'Missing Family';
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  await vi.waitFor(() => expect(document.getElementById('custom-font-status')!.textContent).toContain('not added'));
  expect(input.value).toBe('Missing Family');
});

test.each([
  ['el-GR', 'base-dark', 'Sansation'],
  ['el-GR-draft', 'retro-light', 'Handjet'],
  ['el-GR', 'handwriting-dark', 'Mansalva'],
  ['zh-CN', 'base-light', 'ZCOOL KuaiLe'],
  ['zh-CN', 'poster-dark', 'Liu Jian Mao Cao'],
  ['en-GB', 'base-light', 'Special Elite'],
])('default label follows the displayed %s passage in %s', (locale, theme, font) => {
  store.set('ui-locale', 'es-ES');
  store.set('locale', 'en-GB');
  const quote = document.createElement('blockquote');
  quote.id = 'quote';
  quote.lang = locale;
  document.body.append(quote);
  document.documentElement.dataset.theme = theme;
  refreshDefaultFontLabel();
  expect(document.querySelector('option[value="default"]')!.textContent).toBe(`Por defecto (${font})`);
  expect(store.get('font')).toBe('default');
  quote.lang = 'en-GB';
  refreshDefaultFontLabel();
  expect(document.querySelector('option[value="default"]')!.textContent).not.toContain('Sansation');
});

test('rotation filters the selector, falls back for Chinese and restores the Spanish choice', async () => {
  const quote = document.createElement('blockquote');
  quote.id = 'quote';
  quote.lang = 'es-ES';
  document.body.append(quote);
  document.documentElement.dataset.theme = 'terminal-light';
  await applyCustomFont('B612 Mono');
  quote.lang = 'zh-CN';
  refreshDefaultFontLabel();
  expect(store.get('font')).toBe('default');
  expect(document.querySelector('option[value="B612 Mono"]')).toBeNull();
  expect(document.querySelector('option[value="ZCOOL KuaiLe"]')).not.toBeNull();
  expect(document.querySelector<HTMLSelectElement>('#font-select')!.value).toBe('default');
  expect(document.querySelector('option[value="default"]')!.textContent).toContain('ZCOOL QingKe HuangYou');
  expect(quote.style.getPropertyValue('--override-quote-font-family')).toBe('initial');
  quote.lang = 'es-ES';
  refreshDefaultFontLabel();
  expect(store.get('font')).toBe('B612 Mono');
  expect(quote.style.getPropertyValue('--override-quote-font-family')).toContain('B612 Mono');
});

test('compatible choices survive language and theme changes, while explicit choices stay per language', async () => {
  const quote = document.createElement('blockquote');
  quote.id = 'quote';
  quote.lang = 'es-ES';
  document.body.append(quote);
  await applyCustomFont('Literata');
  quote.lang = 'eo';
  document.documentElement.dataset.theme = 'festive-dark';
  refreshDefaultFontLabel();
  expect(store.get('font')).toBe('Literata');
  await applyCustomFont('Give You Glory');
  quote.lang = 'es-ES';
  refreshDefaultFontLabel();
  expect(store.get('font')).toBe('Literata');
  quote.lang = 'eo';
  refreshDefaultFontLabel();
  expect(store.get('font')).toBe('Give You Glory');
  initFont();
  expect(store.get('font')).toBe('Give You Glory');
});

test('bilingual fonts follow each passage and never inherit an incompatible primary override', async () => {
  document.body.insertAdjacentHTML(
    'beforeend',
    '<blockquote id="quote" lang="es-ES"><section id="quote-translation"><div class="translation-content" lang="zh-CN"></div></section></blockquote>',
  );
  await applyCustomFont('Special Elite');
  const primary = document.getElementById('quote')!;
  const secondary = document.querySelector<HTMLElement>('.translation-content')!;
  expect(primary.style.getPropertyValue('--override-quote-font-family')).toContain('Special Elite');
  expect(secondary.style.getPropertyValue('--override-quote-font-family')).toBe('initial');
  expect(secondary.style.getPropertyValue('--locale-quote-font-family')).toContain('ZCOOL KuaiLe');
  primary.lang = 'zh-CN';
  secondary.lang = 'es-ES';
  refreshDefaultFontLabel();
  expect(primary.style.getPropertyValue('--override-quote-font-family')).toBe('initial');
  expect(secondary.style.getPropertyValue('--override-quote-font-family')).toContain('Special Elite');
});

test('unverified custom fonts remain selected with a translated coverage notice', async () => {
  vi.mocked(loadGoogleFont).mockResolvedValue();
  await applyCustomFont('Lora');
  const quote = document.createElement('blockquote');
  quote.id = 'quote';
  quote.lang = 'zh-CN';
  document.body.append(quote);
  store.set('ui-locale', 'es-ES');
  refreshDefaultFontLabel();
  expect(store.get('font')).toBe('Lora');
  expect(document.querySelector<HTMLSelectElement>('#font-select')!.value).toBe('Lora');
  expect(document.getElementById('custom-font-status')!.textContent).toContain('No se verificó');
});

test('a custom font response for the previous language cannot replace the new language choice', async () => {
  const quote = document.createElement('blockquote');
  quote.id = 'quote';
  quote.lang = 'es-ES';
  document.body.append(quote);
  refreshDefaultFontLabel();
  let finish!: () => void;
  vi.mocked(loadGoogleFont).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const pending = applyCustomFont('Lora');
  quote.lang = 'zh-CN';
  refreshDefaultFontLabel();
  finish();
  await pending;
  expect(store.get('font')).toBe('default');
  expect(document.querySelector('option[value="Lora"]')).toBeNull();
});

test('the curated list excludes other-language additions and incompatible saved fonts remain removable', async () => {
  const quote = document.createElement('blockquote');
  quote.id = 'quote';
  quote.lang = 'es-ES';
  document.body.append(quote);
  document.body.insertAdjacentHTML('beforeend', '<button id="remove-custom-font" hidden></button>');
  refreshDefaultFontLabel();
  expect(document.querySelector('option[value="ZCOOL KuaiLe"]')).toBeNull();
  // Adding a known family outside the suggested list keeps it in the user's library.
  await applyCustomFont('Give You Glory');
  expect(JSON.parse(localStorage.getItem(CUSTOM_FONTS_KEY)!)).toContain('Give You Glory');
  quote.lang = 'zh-CN';
  refreshDefaultFontLabel();
  const saved = document.querySelector<HTMLOptionElement>('option[value="Give You Glory"]')!;
  expect(saved.disabled).toBe(true);
  expect(saved.textContent).toContain('incompatible');
  expect(document.getElementById('remove-custom-font')!.hidden).toBe(false);
  expect(document.getElementById('remove-custom-font')!.getAttribute('aria-label')).toContain('Give You Glory');
  expect(document.getElementById('custom-font-status')!.textContent).toContain('choice remains saved');
  initFont();
  expect(document.querySelector<HTMLOptionElement>('option[value="Give You Glory"]')!.disabled).toBe(true);
  removeCustomFont();
  expect(document.querySelector('option[value="Give You Glory"]')).toBeNull();
  quote.lang = 'es-ES';
  refreshDefaultFontLabel();
  expect(store.get('font')).toBe('default');
});

test('regional variants of the same language do not cancel a pending font choice', async () => {
  const quote = document.createElement('blockquote');
  quote.id = 'quote';
  quote.lang = 'en-GB';
  document.body.append(quote);
  refreshDefaultFontLabel();
  let finish!: () => void;
  vi.mocked(loadGoogleFont).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const pending = applyCustomFont('Lora');
  quote.lang = 'en-US';
  refreshDefaultFontLabel();
  finish();
  await pending;
  expect(store.get('font')).toBe('Lora');
});

test('reset control clears the preference without removing a saved custom font', async () => {
  vi.mocked(loadGoogleFont).mockResolvedValue();
  expect(document.getElementById('reset-font')!.hidden).toBe(true);
  await applyCustomFont('Lora');
  expect(document.getElementById('reset-font')!.hidden).toBe(false);
  document.getElementById('reset-font')!.click();
  expect(store.get('font')).toBe('default');
  expect(document.getElementById('reset-font')!.hidden).toBe(true);
  expect(JSON.parse(localStorage.getItem(CUSTOM_FONTS_KEY)!)).toContain('Lora');
});

test('selects a suggested font immediately and refits after the full font finishes loading', async () => {
  let finish!: () => void;
  vi.mocked(loadGoogleFont).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const pending = applyCustomFont('Roboto', true);
  expect(store.get('font')).toBe('Roboto');
  expect(document.querySelector<HTMLSelectElement>('#font-select')!.value).toBe('Roboto');
  expect(document.getElementById('custom-font-status')!.dataset.text).toBe('settings_font_loading');
  vi.mocked(fitQuote).mockClear();
  finish();
  await pending;
  expect(fitQuote).toHaveBeenCalledTimes(1);
  expect(document.getElementById('custom-font-status')!.textContent).toBe('');
});

test('a suggested font finishing late does not clear a newer loading status', async () => {
  let finish!: () => void;
  vi.mocked(loadGoogleFont).mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const pending = applyCustomFont('Roboto', true);
  vi.mocked(loadGoogleFont).mockImplementationOnce(() => new Promise<void>(() => {}));
  void applyCustomFont('Lora');
  finish();
  await pending;
  expect(document.getElementById('custom-font-status')!.dataset.text).toBe('settings_font_loading');
});
