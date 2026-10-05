import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createStore, store } from '../store';
import { initTheme, setTheme } from './themes';

vi.mock('../utils', () => ({ doFitQuote: vi.fn(), fitQuote: vi.fn(), loadFontIfNotExists: vi.fn() }));
vi.mock('./font', () => ({ THEME_FONTS: {}, resetFont: vi.fn(), refreshDefaultFontLabel: vi.fn() }));
vi.mock('./horizon', () => ({ setDayParameters: vi.fn() }));

let systemChange: (event: { matches: boolean }) => void;

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: (_event: string, callback: typeof systemChange) => {
        systemChange = callback;
      },
    })),
  );
  document.body.innerHTML = `
    <select id="theme-select"><option value="base">Base</option><option value="retro">Retro</option></select>
    <select id="variant-select"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select>
    <div id="color-controls"><input id="color-picker" type="color"><button id="reset-color">Reset</button></div>`;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('style');
  document.documentElement.removeAttribute('class');
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.variant;
});

function addRandomColors() {
  document.querySelector('#theme-select')!.insertAdjacentHTML(
    'beforeend',
    `
    <optgroup id="colors"><option value="color">Random</option><option value="pink">Pink</option>
    <option value="green">Green</option><option value="gray">Gray</option></optgroup>`,
  );
  document.body.insertAdjacentHTML('beforeend', '<input id="settings-color-picker" type="color">');
  vi.spyOn(Math, 'random').mockReturnValue(0);
}

test('random colors ignore custom accents, disable both pickers and never repeat the visible palette', () => {
  addRandomColors();
  history.replaceState({}, '', '/?theme=color-light&color=%23123456');
  createStore();
  initTheme();
  expect(document.documentElement.dataset.theme).toBe('pink-light');
  expect(store.get('color')).toBe('#ff89d8');
  expect(document.documentElement.style.getPropertyValue('--accent-color')).toBe('');
  expect(new URLSearchParams(location.search).has('color')).toBe(false);
  expect(document.querySelector<HTMLButtonElement>('#reset-color')!.hidden).toBe(true);
  expect(document.querySelector<HTMLButtonElement>('#reset-color')!.disabled).toBe(true);
  document.querySelectorAll<HTMLInputElement>('#color-picker, #settings-color-picker').forEach((picker) => {
    expect(picker.disabled).toBe(true);
    picker.value = '#123456';
    picker.dispatchEvent(new Event('input'));
    expect(store.get('color')).toBe('#ff89d8');
    expect(store.get('custom-color')).toBe('#123456');
  });
  setTheme({ syncToUrl: false });
  expect(document.documentElement.dataset.theme).toBe('green-light');
  expect(store.get('color')).toBe('#2ecc71');
  setTheme({ syncToUrl: false });
  expect(document.documentElement.dataset.theme).toBe('pink-light');
  expect(store.get('theme')).toBe('color-light');
  changeTheme();
  expect(document.querySelector<HTMLInputElement>('#color-picker')!.disabled).toBe(false);
  expect(document.querySelector<HTMLButtonElement>('#reset-color')!.disabled).toBe(false);
});

test('selecting random after a custom accent follows the dark palette and retains random system mode', () => {
  addRandomColors();
  history.replaceState({}, '', '/?color=%23123456');
  createStore();
  initTheme();
  document.querySelector<HTMLSelectElement>('#theme-select')!.value = 'color';
  setTheme();
  expect(store.get('color')).toBe('#ff89d8');
  systemChange({ matches: true });
  expect(document.documentElement.dataset.theme).toBe('pink-dark');
  expect(store.get('theme')).toBe('color-system');
  vi.spyOn(Math, 'random').mockReturnValue(0.99);
  document.querySelector<HTMLSelectElement>('#variant-select')!.value = 'dark';
  setTheme();
  expect(document.documentElement.dataset.theme).toBe('gray-dark');
  expect(store.get('color')).toBe('#f1f1f1');
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

const presets = {
  anaglyph: '#c53a35',
  subtle: '#333333',
  kindle: '#2c2c2e',
  horizon: '#f5cf8e',
};

test.each(Object.entries(presets))('%s supports editing and restoring its own preset', (theme, color) => {
  document
    .querySelector('#theme-select')!
    .insertAdjacentHTML('beforeend', `<option value="${theme}">${theme}</option>`);
  history.replaceState({}, '', `/?theme=${theme}-light`);
  createStore();
  initTheme();
  const picker = document.querySelector<HTMLInputElement>('#color-picker')!;
  expect(picker.disabled).toBe(false);
  expect(picker.hidden).toBe(false);
  expect(document.querySelector<HTMLElement>('#color-controls')!.hidden).toBe(false);
  expect(document.querySelector<HTMLButtonElement>('#reset-color')!.disabled).toBe(false);
  expect(picker.value).toBe(color);
  picker.value = '#123456';
  picker.dispatchEvent(new Event('input'));
  expect(document.documentElement.style.getPropertyValue('--accent-color')).toBe('#123456');
  expect(document.querySelector<HTMLButtonElement>('#reset-color')!.hidden).toBe(false);
  document.querySelector<HTMLButtonElement>('#reset-color')!.click();
  expect(picker.value).toBe(color);
  expect(document.documentElement.style.getPropertyValue('--accent-color')).toBe('');
  expect(new URLSearchParams(location.search).has('color')).toBe(false);
});

test('an explicit shared color overrides a locally restored palette', () => {
  localStorage.setItem('settings', JSON.stringify({ theme: 'retro-light', color: '#daa908' }));
  history.replaceState({}, '', '/?theme=retro-light&color=%23123456');
  createStore();
  initTheme();
  expect(document.documentElement.style.getPropertyValue('--accent-color')).toBe('#123456');
});

test('choosing the preset color uses the existing default comparison', () => {
  history.replaceState({}, '', '/?theme=retro-system&color=%23123456');
  createStore();
  initTheme();
  const picker = document.querySelector<HTMLInputElement>('#color-picker')!;
  picker.value = '#daa908';
  picker.dispatchEvent(new Event('input'));
  expect(document.querySelector<HTMLButtonElement>('#reset-color')!.hidden).toBe(true);
  systemChange({ matches: true });
  expect(store.get('color')).toBe('#f1ba08');
  expect(JSON.parse(localStorage.getItem('settings')!)).not.toHaveProperty('color-default');
});

test.each(
  Object.entries({
    pink: '#ff89d8',
    green: '#2ecc71',
    orange: '#f39c12',
    purple: '#9b59b6',
    blue: '#2c97df',
    gray: '#808686',
  }),
)('%s keeps its preset visible in a disabled picker and restores the custom accent after reload', (theme, color) => {
  document
    .querySelector('#theme-select')!
    .insertAdjacentHTML('beforeend', `<option value="${theme}">${theme}</option>`);
  history.replaceState({}, '', '/?theme=retro-light&color=%23123456');
  createStore();
  initTheme();
  document.querySelector<HTMLSelectElement>('#theme-select')!.value = theme;
  setTheme();
  const picker = document.querySelector<HTMLInputElement>('#color-picker')!;
  expect(picker.hidden).toBe(false);
  expect(picker.disabled).toBe(true);
  expect(picker.value).toBe(color);
  expect(store.get('color')).toBe(color);
  expect(store.get('custom-color')).toBe('#123456');
  expect(document.documentElement.style.getPropertyValue('--accent-color')).toBe('');
  createStore();
  initTheme();
  changeTheme();
  expect(picker.disabled).toBe(false);
  expect(picker.value).toBe('#123456');
  expect(store.get('color')).toBe('#123456');
  expect(document.querySelector<HTMLButtonElement>('#reset-color')!.hidden).toBe(false);
  document.querySelector<HTMLButtonElement>('#reset-color')!.click();
  expect(store.get('custom-color')).toBe('');
  expect(store.get('color')).toBe('#daa908');
});

test('random displays the disabled base swatch while the visible palette rotates and preserves a custom accent', () => {
  addRandomColors();
  history.replaceState({}, '', '/?theme=color-light&color=%23123456');
  createStore();
  initTheme();
  const picker = document.querySelector<HTMLInputElement>('#color-picker')!;
  expect(picker.value).toBe('#d24335');
  expect(picker.disabled).toBe(true);
  expect(document.querySelector<HTMLButtonElement>('#reset-color')!.hidden).toBe(true);
  setTheme({ syncToUrl: false });
  expect(store.get('color')).toBe('#2ecc71');
  expect(picker.value).toBe('#d24335');
  changeTheme();
  expect(picker.value).toBe('#123456');
  expect(picker.disabled).toBe(false);
});
