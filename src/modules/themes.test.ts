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
  delete document.documentElement.dataset.accentPalette;
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

  test('custom colors remain selected across skins', () => {
    history.replaceState({}, '', '/?color=%23123456');
    createStore();
    initTheme();
    changeTheme();
    expect(store.get('color')).toBe('#123456');
    const select = document.querySelector<HTMLSelectElement>('#theme-select')!;
    select.value = 'base';
    select.dispatchEvent(new Event('change'));
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
)('migrates the legacy %s URL into a Base palette', (palette, color) => {
  history.replaceState({}, '', `/?theme=${palette}-light`);
  createStore();
  initTheme();
  expect(store.get('theme')).toBe('base-light');
  expect(store.get('palette')).toBe(palette);
  expect(document.documentElement.dataset.theme).toBe('base-light');
  expect(document.documentElement.dataset.palette).toBe(palette);
  expect(store.get('color')).toBe(color);
  expect(document.querySelector<HTMLInputElement>('#color-picker')!.disabled).toBe(false);
  document.querySelector<HTMLButtonElement>('#reset-color')!.click();
  expect(store.get('palette')).toBe('default');
  expect(store.get('color')).toBe('#d24335');
});

test('custom swatches persist, survive reset, and can be removed without changing the active color', async () => {
  createStore();
  initTheme();
  const picker = document.querySelector<HTMLInputElement>('#color-picker')!;
  picker.value = '#123456';
  picker.dispatchEvent(new Event('input'));
  picker.dispatchEvent(new Event('change'));
  expect(JSON.parse(localStorage.getItem('custom-colors')!)).toEqual(['#123456']);
  document.querySelector<HTMLButtonElement>('#reset-color')!.click();
  await Promise.resolve();
  const swatch = () => document.querySelector<HTMLButtonElement>('.color-swatch[data-color="#123456"]')!;
  swatch().click();
  await Promise.resolve();
  document.querySelector<HTMLButtonElement>('.color-manage')!.click();
  swatch().click();
  expect(JSON.parse(localStorage.getItem('custom-colors')!)).toEqual([]);
  expect(store.get('color')).toBe('#123456');
});

test('gray palette adapts to the system scheme while keeping its palette selection', () => {
  history.replaceState({}, '', '/?theme=gray-system');
  createStore();
  initTheme();
  systemChange({ matches: true });
  expect(store.get('color')).toBe('#f1f1f1');
  expect(store.get('palette')).toBe('gray');
});

test('the toolbar opens a palette, applies presets and closes with Escape or an outside click', async () => {
  createStore();
  initTheme();
  const toggle = document.getElementById('toolbar-color-toggle')!;
  const panel = document.getElementById('toolbar-color-palette')!;
  expect(panel.hidden).toBe(true);
  toggle.click();
  expect(panel.hidden).toBe(false);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  panel.querySelector<HTMLButtonElement>('[data-color="#2c97df"]')!.click();
  await Promise.resolve();
  expect(store.get('palette')).toBe('blue');
  expect(store.get('color')).toBe('#2c97df');
  expect(panel.hidden).toBe(false);
  panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(panel.hidden).toBe(true);
  expect(document.activeElement).toBe(toggle);
  toggle.click();
  document.body.click();
  expect(panel.hidden).toBe(true);
});

test('custom color additions and removals stay synchronized between toolbar and settings', async () => {
  document.body.insertAdjacentHTML(
    'beforeend',
    '<div id="settings-color-controls"><input id="settings-color-picker" type="color"><button id="settings-reset-color">Reset</button></div>',
  );
  createStore();
  initTheme();
  const picker = document.querySelector<HTMLInputElement>('#color-picker')!;
  picker.value = '#123456';
  picker.dispatchEvent(new Event('input'));
  picker.dispatchEvent(new Event('change'));
  await Promise.resolve();
  const selector = '.color-swatch[data-color="#123456"]';
  expect(document.querySelector('#settings-color-controls')!.querySelector(selector)).not.toBeNull();
  document.querySelector<HTMLButtonElement>('#settings-color-controls .color-manage')!.click();
  document.querySelector<HTMLButtonElement>(`#settings-color-controls ${selector}`)!.click();
  expect(document.querySelector('#toolbar-color-palette')!.querySelector(selector)).toBeNull();
  expect(store.get('color')).toBe('#123456');
});

test.each(['base', 'retro'])(
  'random colors rotate each minute on %s without repeating the previous accent',
  (theme) => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    history.replaceState({}, '', `/?theme=${theme}-light&palette=random`);
    createStore();
    initTheme();
    expect(store.get('color')).toBe('#d24335');
    setTheme({ syncToUrl: false });
    expect(store.get('color')).toBe('#ff89d8');
    expect(store.get('theme')).toBe(`${theme}-light`);
    expect(store.get('palette')).toBe('random');
  },
);

test('the original Base red remains available on special themes', () => {
  createStore();
  initTheme();
  changeTheme();
  document.querySelector<HTMLButtonElement>('.color-swatch[data-palette-key="red"]')!.click();
  expect(store.get('color')).toBe('#d24335');
  expect(store.get('palette')).toBe('red');
});
