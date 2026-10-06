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

test('a custom color matching the theme default stays explicit until reset', () => {
  history.replaceState({}, '', '/?theme=retro-system&color=%23123456');
  createStore();
  initTheme();
  const picker = document.querySelector<HTMLInputElement>('#color-picker')!;
  picker.value = '#daa908';
  picker.dispatchEvent(new Event('input'));
  expect(store.get('custom-color')).toBe('#daa908');
  expect(document.querySelector<HTMLButtonElement>('#reset-color')!.hidden).toBe(false);
  systemChange({ matches: true });
  expect(store.get('color')).toBe('#daa908');
  document.querySelector<HTMLButtonElement>('#reset-color')!.click();
  expect(store.get('custom-color')).toBe('');
  expect(store.get('color')).toBe('#f1ba08');
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
  expect(store.get('color')).toBe('#808686');
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

test('picker slider changes save only the final colour from each opening', () => {
  createStore();
  initTheme();
  const picker = document.querySelector<HTMLInputElement>('#color-picker')!;
  picker.dispatchEvent(new Event('click'));
  for (const color of ['#123456', '#123457', '#123458']) {
    picker.value = color;
    picker.dispatchEvent(new Event('input'));
    picker.dispatchEvent(new Event('change'));
  }
  expect(JSON.parse(localStorage.getItem('custom-colors')!)).toEqual(['#123458']);
  picker.dispatchEvent(new Event('click'));
  picker.value = '#abcdef';
  picker.dispatchEvent(new Event('change'));
  expect(JSON.parse(localStorage.getItem('custom-colors')!)).toEqual(['#123458', '#abcdef']);
});

test('the palette has a fixed red preset and no extra default swatch', () => {
  createStore();
  initTheme();
  expect(document.querySelector('.color-swatch[data-palette-key="default"]')).toBeNull();
  expect(document.querySelectorAll('.color-swatch[data-color="#d24335"]')).toHaveLength(1);
  const count = document.querySelectorAll('.color-swatch').length;
  changeTheme();
  expect(document.querySelectorAll('.color-swatch')).toHaveLength(count);
});

test.each([true, false])('restoring a custom color reuses or saves its swatch (already saved: %s)', (alreadySaved) => {
  localStorage.setItem('settings', JSON.stringify({ palette: 'default', color: '#E5EF68', 'custom-color': '#E5EF68' }));
  localStorage.setItem('custom-colors', JSON.stringify(alreadySaved ? ['#f3c565', '#e5ef68'] : ['#f3c565']));
  createStore();
  initTheme();
  const selected = document.querySelector<HTMLButtonElement>('.color-swatch[data-color="#e5ef68"]')!;
  expect(selected.getAttribute('aria-pressed')).toBe('true');
  expect(selected.querySelector('.color-swatch-mark svg')).not.toBeNull();
  expect(document.querySelectorAll('.color-swatch[data-color="#e5ef68"]')).toHaveLength(1);
  expect(JSON.parse(localStorage.getItem('custom-colors')!)).toEqual(['#f3c565', '#e5ef68']);
});

test('a saved custom color matching the default keeps its own check after reload', () => {
  localStorage.setItem(
    'settings',
    JSON.stringify({ theme: 'retro-light', color: '#daa908', 'custom-color': '#daa908' }),
  );
  localStorage.setItem('custom-colors', JSON.stringify(['#daa908']));
  history.replaceState({}, '', '/?theme=retro-light&color=%23daa908');
  createStore();
  initTheme();
  expect(store.get('custom-color')).toBe('#daa908');
  expect(document.querySelector('.color-swatch[data-color="#daa908"]')!.getAttribute('aria-pressed')).toBe('true');
  expect(document.querySelector('.palette-reset')!.getAttribute('aria-pressed')).toBe('false');
});

test('the gray swatch matches the applied color when appearance changes', async () => {
  history.replaceState({}, '', '/?theme=base-system&palette=gray');
  createStore();
  initTheme();
  const swatch = () => document.querySelector<HTMLButtonElement>('[data-palette-key="gray"]')!;
  expect(swatch().dataset.color).toBe(store.get('color'));
  systemChange({ matches: true });
  await Promise.resolve();
  expect(swatch().dataset.color).toBe('#808686');
  expect(swatch().dataset.color).toBe(store.get('color'));
  expect(swatch().getAttribute('aria-pressed')).toBe('true');
  systemChange({ matches: false });
  await Promise.resolve();
  expect(swatch().dataset.color).toBe('#808686');
  expect(swatch().dataset.color).toBe(store.get('color'));
});

test('the toolbar scheme button cycles system, light and dark and syncs settings', () => {
  document.body.insertAdjacentHTML('beforeend', '<button id="scheme-toggle" type="button"></button>');
  createStore();
  initTheme();
  const button = document.getElementById('scheme-toggle')!;
  const select = document.querySelector<HTMLSelectElement>('#variant-select')!;
  for (const scheme of ['light', 'dark', 'system']) {
    button.click();
    expect(store.get('theme')).toBe(`base-${scheme}`);
    expect(select.value).toBe(scheme);
    expect(document.documentElement.dataset.variant).toBe(scheme);
    expect(JSON.parse(localStorage.getItem('settings')!).theme).toBe(`base-${scheme}`);
  }
  select.value = 'dark';
  select.dispatchEvent(new Event('change'));
  expect(button.getAttribute('aria-label')).toContain('Dark');
  button.click();
  expect(select.value).toBe('system');
});

test('opening the palette with a pointer keeps focus on its toggle', () => {
  createStore();
  initTheme();
  const toggle = document.getElementById('toolbar-color-toggle')!;
  toggle.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
  expect(document.getElementById('toolbar-color-palette')!.hidden).toBe(false);
  expect(document.activeElement).toBe(toggle);
});

test.each(['default', 'blue'])('opening the palette with the keyboard focuses the selected %s option', (palette) => {
  createStore();
  store.set('palette', palette);
  initTheme();
  const toggle = document.getElementById('toolbar-color-toggle')!;
  toggle.focus();
  toggle.click();
  const selector = palette === 'default' ? '.palette-reset' : '[data-palette-key="blue"]';
  const selected = document.querySelector(`#toolbar-color-palette ${selector}`)!;
  expect(selected.getAttribute('aria-pressed')).toBe('true');
  expect(document.activeElement).toBe(selected);
  selected.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(document.getElementById('toolbar-color-palette')!.hidden).toBe(true);
  expect(document.activeElement).toBe(toggle);
});

test.each(['toggle', 'outside', 'escape', 'resize', 'focusout', 'default'])(
  'closing the palette via %s cancels editing before reopening',
  (method) => {
    localStorage.setItem('custom-colors', JSON.stringify(['#123456']));
    createStore();
    initTheme();
    const toggle = document.getElementById('toolbar-color-toggle')!;
    const panel = document.getElementById('toolbar-color-palette')!;
    toggle.click();
    const manage = panel.querySelector<HTMLButtonElement>('.color-manage')!;
    manage.click();
    expect(manage.getAttribute('aria-pressed')).toBe('true');
    expect(panel.querySelector('.is-removing')).not.toBeNull();
    if (method === 'toggle') toggle.click();
    if (method === 'outside') document.body.click();
    if (method === 'escape') panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    if (method === 'resize') window.dispatchEvent(new Event('resize'));
    if (method === 'focusout')
      panel.dispatchEvent(new FocusEvent('focusout', { relatedTarget: document.body, bubbles: true }));
    if (method === 'default') panel.querySelector<HTMLButtonElement>('.palette-reset')!.click();
    expect(panel.hidden).toBe(true);
    toggle.click();
    expect(manage.getAttribute('aria-pressed')).toBe('false');
    expect(panel.querySelector('.is-removing')).toBeNull();
    expect(JSON.parse(localStorage.getItem('custom-colors')!)).toEqual(['#123456']);
  },
);
