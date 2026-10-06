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
    expect(select.closest<HTMLElement>('.settings-row')!.hidden).toBe(false);
    expect(document.querySelector<HTMLButtonElement>('#pattern-picker-toggle')!.disabled).toBe(true);
    expect(store.get('background-pattern')).toBe('diagonal');
    chooseTheme('base');
    expect(document.documentElement.dataset.backgroundPattern).toBe('diagonal');
    expect(select.disabled).toBe(false);
    expect(document.querySelector<HTMLButtonElement>('#pattern-picker-toggle')!.disabled).toBe(false);
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

test.each([
  'circles',
  'waves',
  'mixed-stripes',
  'checkerboard',
  'cubes',
  'fans',
  'leaves',
  'vines',
  'contours',
  'woven',
  'zigzag-fine',
  'rain',
  'christmas',
  'hearts',
  'reading',
  'space',
  'garden',
  'clouds',
  'constellations',
])('persists and restores %s through its own URL parameter', (pattern) => {
  setup();
  choosePattern(pattern);
  expect(document.documentElement.dataset.backgroundPattern).toBe(pattern);
  expect(new URLSearchParams(location.search).get('background-pattern')).toBe(pattern);
  createStore();
  expect(store.get('background-pattern')).toBe(pattern);
  expect(validateSettings({ 'background-pattern': pattern }, false)).toEqual({ 'background-pattern': pattern });
});

test('visual picker chooses a pattern, marks it and closes with focus on the trigger', () => {
  setup();
  const toggle = document.getElementById('pattern-picker-toggle')!;
  const menu = document.getElementById('pattern-picker-menu')!;
  toggle.click();
  expect(menu.hidden).toBe(false);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(document.activeElement?.getAttribute('data-pattern')).toBe('none');
  const leaves = menu.querySelector<HTMLButtonElement>('[data-pattern="leaves"]')!;
  leaves.click();
  expect(store.get('background-pattern')).toBe('leaves');
  expect(leaves.getAttribute('aria-pressed')).toBe('true');
  expect(menu.hidden).toBe(true);
  expect(document.activeElement).toBe(toggle);
  expect(document.getElementById('pattern-picker-swatch')!.dataset.backgroundPattern).toBe('leaves');
  toggle.click();
  expect(document.activeElement).toBe(leaves);
  leaves.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(menu.hidden).toBe(true);
  expect(document.activeElement).toBe(toggle);
});

test('visual picker supports arrow navigation and dismisses outside or on dialog close', () => {
  setup();
  const toggle = document.getElementById('pattern-picker-toggle')!;
  const menu = document.getElementById('pattern-picker-menu')!;
  const buttons = [...menu.querySelectorAll<HTMLButtonElement>('button')];
  toggle.click();
  buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  expect(document.activeElement).toBe(buttons[3]);
  document.getElementById('settings-title')!.click();
  expect(menu.hidden).toBe(true);
  toggle.click();
  document.getElementById('settings-dialog')!.dispatchEvent(new Event('close'));
  expect(menu.hidden).toBe(true);
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
});

test('random patterns persist the mode and keep a concrete pattern until the quote minute changes', () => {
  setup();
  choosePattern('random');
  const first = document.documentElement.dataset.backgroundPattern;
  expect(first).not.toBe('random');
  expect(first).not.toBe('none');
  expect(store.get('background-pattern')).toBe('random');
  expect(new URLSearchParams(location.search).get('background-pattern')).toBe('random');
  expect(JSON.parse(localStorage.getItem('settings')!)['background-pattern']).toBe('random');
  store.set('show-time', !store.get('show-time'));
  expect(document.documentElement.dataset.backgroundPattern).toBe(first);
  store.set('time', '01:23');
  expect(document.documentElement.dataset.backgroundPattern).not.toBe(first);
  expect(themePreviewDocument()).toContain(
    `data-background-pattern="${document.documentElement.dataset.backgroundPattern}"`,
  );
});
