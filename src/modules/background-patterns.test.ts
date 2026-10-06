/// <reference types="vite/client" />
import page from '../../index.html?raw';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createStore, store, validateSettings } from '../store';
import { initSettingsDialog } from './settings-dialog';
import { initTheme } from './themes';
import { themePreviewDocument } from './theme-picker';
import { applySavedTheme, readSavedThemes, SAVED_THEMES_KEY } from './saved-themes';

vi.mock('../utils', () => ({ doFitQuote: vi.fn(), fitQuote: vi.fn(), loadFontIfNotExists: vi.fn() }));
vi.mock('./font', () => ({
  THEME_FONTS: {},
  resetFont: vi.fn(),
  refreshDefaultFontLabel: vi.fn(),
  applyCustomFont: vi.fn(),
}));
vi.mock('./horizon', () => ({ setDayParameters: vi.fn() }));

beforeEach(() => {
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.documentElement.removeAttribute('data-theme');
  document.body.innerHTML = page;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn() })),
  );
});
afterEach(() => {
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-background-pattern');
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('style');
  vi.unstubAllGlobals();
});

function setup() {
  createStore();
  initSettingsDialog();
  initTheme();
}
function choosePattern(value: string) {
  const select = document.querySelector<HTMLSelectElement>('#background-pattern')!;
  select.value = value;
  select.dispatchEvent(new Event('change'));
}
function chooseTheme(value: string) {
  const select = document.querySelector<HTMLSelectElement>('#theme-select')!;
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

test('defaults to no pattern and validates URL and stored preferences', () => {
  setup();
  expect(store.get('background-pattern')).toBe('none');
  expect(document.documentElement.dataset.backgroundPattern).toBe('none');
  expect(validateSettings({ 'background-pattern': 'invalid' }, true)).toEqual({});
  expect(validateSettings({ 'background-pattern': 'grid' }, false)).toEqual({ 'background-pattern': 'grid' });
});

test('shares, persists and previews a pattern, and removes the default from links', () => {
  setup();
  choosePattern('dots');
  expect(new URLSearchParams(location.search).get('background-pattern')).toBe('dots');
  expect(JSON.parse(localStorage.getItem('settings')!)['background-pattern']).toBe('dots');
  expect(themePreviewDocument()).toContain('data-background-pattern="dots"');
  history.replaceState({}, '', '/');
  createStore();
  expect(store.get('background-pattern')).toBe('dots');
  choosePattern('none');
  expect(new URLSearchParams(location.search).has('background-pattern')).toBe(false);
});

test('URL pattern overrides the saved preference', () => {
  localStorage.setItem('settings', JSON.stringify({ 'background-pattern': 'dots' }));
  history.replaceState({}, '', '/?background-pattern=grid');
  setup();
  expect(store.get('background-pattern')).toBe('grid');
  expect(document.documentElement.dataset.backgroundPattern).toBe('grid');
});

test.each(['photo', 'retro', 'anaglyph', 'festive', 'book', 'terminal', 'whatsapp', 'horizon'])(
  'suspends patterns on %s and restores them on a plain theme',
  (theme) => {
    setup();
    choosePattern('diagonal');
    chooseTheme(theme);
    const select = document.querySelector<HTMLSelectElement>('#background-pattern')!;
    expect(document.documentElement.dataset.backgroundPattern).toBe('none');
    expect(select.disabled).toBe(true);
    expect(select.closest<HTMLElement>('.settings-row')!.hidden).toBe(true);
    expect(store.get('background-pattern')).toBe('diagonal');
    chooseTheme('base');
    expect(document.documentElement.dataset.backgroundPattern).toBe('diagonal');
    expect(select.disabled).toBe(false);
    expect(select.closest<HTMLElement>('.settings-row')!.hidden).toBe(false);
  },
);

test('uses the resolved plain skin for random colour themes', () => {
  setup();
  choosePattern('grid');
  store.set('palette', 'random');
  chooseTheme('base');
  expect(document.documentElement.dataset.backgroundPattern).toBe('grid');
});

test('saved themes capture patterns and migrate older snapshots', async () => {
  setup();
  choosePattern('zigzag');
  document.getElementById('save-theme-form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  const saved = readSavedThemes()[0];
  expect(saved.settings['background-pattern']).toBe('zigzag');
  choosePattern('none');
  await applySavedTheme(saved.settings);
  expect(document.documentElement.dataset.backgroundPattern).toBe('zigzag');
  delete saved.settings['background-pattern'];
  localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify([saved]));
  const migrated = readSavedThemes()[0];
  expect(migrated.settings['background-pattern']).toBe('none');
  await applySavedTheme(migrated.settings);
  expect(document.documentElement.dataset.backgroundPattern).toBe('none');
});

test.each(['circles', 'waves'])('persists and restores %s through its own URL parameter', (pattern) => {
  setup();
  choosePattern(pattern);
  expect(document.documentElement.dataset.backgroundPattern).toBe(pattern);
  expect(new URLSearchParams(location.search).get('background-pattern')).toBe(pattern);
  createStore();
  expect(store.get('background-pattern')).toBe(pattern);
  expect(validateSettings({ 'background-pattern': pattern }, false)).toEqual({ 'background-pattern': pattern });
});
