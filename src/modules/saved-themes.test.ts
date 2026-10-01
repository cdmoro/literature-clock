/// <reference types="vite/client" />
import page from '../../index.html?raw';
import { afterEach, expect, test, vi } from 'vitest';
import { createStore, store } from '../store';
import { initSettingsDialog } from './settings-dialog';
import { readSavedThemes, SAVED_THEMES_KEY, applySavedTheme } from './saved-themes';
import { initTheme } from './themes';
import { initProgressbarMode } from './progressbar';
import { initShowTimeMode } from './show-time';
import { initTransitions } from './transitions';

vi.mock('../utils', () => ({ doFitQuote: vi.fn(), fitQuote: vi.fn(), loadFontIfNotExists: vi.fn() }));
vi.mock('./font', () => ({
  THEME_FONTS: {},
  resetFont: vi.fn(),
  refreshDefaultFontLabel: vi.fn(),
  applyCustomFont: vi.fn(),
}));
vi.mock('./horizon', () => ({ setDayParameters: vi.fn() }));

afterEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  history.replaceState({}, '', '/');
  vi.unstubAllGlobals();
});
function setup() {
  document.body.innerHTML = page;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn() })),
  );
  createStore();
  initSettingsDialog();
}
test('saves independent snapshots with automatic and optional user names', () => {
  setup();
  const form = document.getElementById('save-theme-form')!;
  store.set('color', '#123456');
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  store.set('color', '#654321');
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  expect(readSavedThemes().map((entry) => entry.name)).toEqual(['Base (custom) 1', 'Base (custom) 2']);
  expect(readSavedThemes()[0].settings.color).toBe('#123456');
  (document.getElementById('saved-theme-name') as HTMLInputElement).value = '<My reading theme>';
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  expect(readSavedThemes()[2].name).toBe('<My reading theme>');
  document.getElementById('delete-saved-theme')!.click();
  expect(readSavedThemes()).toHaveLength(2);
});
test('restores controls and URL overrides and persists on reload', async () => {
  setup();
  initTheme();
  initProgressbarMode();
  initShowTimeMode();
  initTransitions();
  store.set('color', '#111111');
  await applySavedTheme({
    theme: 'retro-dark',
    color: '#123456',
    font: 'default',
    transition: 'none',
    work: false,
    'show-time': false,
    'hide-book-title': false,
    progressbar: 'top',
  });
  expect(document.documentElement.dataset.theme).toBe('retro-dark');
  expect(document.documentElement.style.getPropertyValue('--accent-color')).toBe('#123456');
  expect(document.documentElement.dataset.progressbar).toBe('top');
  createStore();
  expect(store.get('theme')).toBe('retro-dark');
  expect(store.get('color')).toBe('#123456');
  expect(store.get('show-time')).toBe(false);
  expect(store.get('transition')).toBe('none');
  expect(store.get('progressbar')).toBe('top');
});
test('ignores malformed storage and rejects incomplete snapshots', () => {
  localStorage.setItem(SAVED_THEMES_KEY, '{');
  expect(readSavedThemes()).toEqual([]);
  localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify([{ id: '1', name: 'bad', settings: { theme: 'invalid' } }]));
  expect(readSavedThemes()).toEqual([]);
});
test('reports storage failure without adding a phantom saved theme', () => {
  setup();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('full');
  });
  document.getElementById('save-theme-form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  expect(document.getElementById('saved-theme-status')!.textContent).toContain('Could not save');
  expect((document.getElementById('saved-theme-select') as HTMLSelectElement).options).toHaveLength(1);
  vi.restoreAllMocks();
});

test('updates the active snapshot without creating or renaming another theme', () => {
  setup();
  const form = document.getElementById('save-theme-form')!;
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  const original = readSavedThemes()[0];
  const update = document.getElementById('update-saved-theme') as HTMLButtonElement;
  expect(update.hidden).toBe(false);
  expect(update.disabled).toBe(true);
  store.set('color', '#abcdef');
  expect(update.disabled).toBe(false);
  update.click();
  expect(readSavedThemes()).toEqual([{ ...original, settings: { ...original.settings, color: '#abcdef' } }]);
  expect(update.disabled).toBe(true);
});

test('keeps the active theme available for updating after edits and reload', () => {
  setup();
  document.getElementById('save-theme-form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  const id = readSavedThemes()[0].id;
  store.set('color', '#abcdef');
  document.body.innerHTML = page;
  createStore();
  initSettingsDialog();
  expect((document.getElementById('saved-theme-select') as HTMLSelectElement).value).toBe(id);
  expect((document.getElementById('update-saved-theme') as HTMLButtonElement).disabled).toBe(false);
  document.getElementById('update-saved-theme')!.click();
  expect(readSavedThemes()[0].settings.color).toBe('#abcdef');
});

test('selecting another saved entry does not offer to overwrite it as the active theme', () => {
  setup();
  const form = document.getElementById('save-theme-form')!;
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  const select = document.getElementById('saved-theme-select') as HTMLSelectElement;
  select.value = readSavedThemes()[0].id;
  select.dispatchEvent(new Event('change'));
  expect((document.getElementById('update-saved-theme') as HTMLButtonElement).hidden).toBe(true);
});
