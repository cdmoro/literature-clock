import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createStore, store } from '../store';
import { initTheme } from './themes';

vi.mock('../utils', () => ({ doFitQuote: vi.fn(), fitQuote: vi.fn(), loadFontIfNotExists: vi.fn() }));
vi.mock('./font', () => ({ THEME_FONTS: {}, resetFont: vi.fn() }));
vi.mock('./horizon', () => ({ setDayParameters: vi.fn() }));

let systemChange: (event: { matches: boolean }) => void;

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false,
    addEventListener: (_event: string, callback: typeof systemChange) => { systemChange = callback; },
  })));
  document.body.innerHTML = `
    <select id="theme-select"><option value="base">Base</option><option value="retro">Retro</option></select>
    <select id="variant-select"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select>
    <div id="color-controls"><input id="color-picker" type="color"><button id="reset-color">Reset</button></div>`;
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('style');
  document.documentElement.removeAttribute('class');
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.variant;
});

function changeTheme() {
  const select = document.querySelector<HTMLSelectElement>('#theme-select')!;
  select.value = 'retro';
  select.dispatchEvent(new Event('change'));
}

describe('theme color URLs', () => {
  test('switching skins keeps default colors local and preserves unrelated URL settings', () => {
    history.replaceState({}, '', '/?color=%23d24335&time=12:34');
    createStore();
    initTheme();
    changeTheme();
    expect(store.get('color')).toBe('#daa908');
    expect(JSON.parse(localStorage.getItem('settings')!).color).toBe('#daa908');
    expect(new URLSearchParams(location.search).has('color')).toBe(false);
    expect(new URLSearchParams(location.search).get('time')).toBe('12:34');
  });

  test('keeps a custom color shareable when switching skins and system appearance', () => {
    history.replaceState({}, '', '/?color=%23123456');
    createStore();
    initTheme();
    changeTheme();
    systemChange({ matches: true });
    expect(store.get('color')).toBe('#123456');
    expect(new URLSearchParams(location.search).get('color')).toBe('#123456');
  });

  test('resetting the color picker removes a custom color from the URL', () => {
    history.replaceState({}, '', '/?theme=retro-light&color=%23123456');
    createStore();
    initTheme();
    document.querySelector<HTMLButtonElement>('#reset-color')!.click();
    expect(store.get('color')).toBe('#daa908');
    expect(document.querySelector<HTMLInputElement>('#color-picker')!.value).toBe('#daa908');
    expect(new URLSearchParams(location.search).has('color')).toBe(false);
  });

  test('system appearance changes replace default colors without serializing them', () => {
    history.replaceState({}, '', '/?theme=retro-system&color=%23daa908');
    createStore();
    initTheme();
    systemChange({ matches: true });
    expect(store.get('color')).toBe('#f1ba08');
    expect(new URLSearchParams(location.search).has('color')).toBe(false);
  });
});
