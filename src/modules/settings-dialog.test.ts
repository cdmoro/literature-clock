/// <reference types="vite/client" />
import page from '../../index.html?raw';
import { afterEach, expect, test, vi } from 'vitest';
import { initSettingsDialog } from './settings-dialog';
import { initTheme } from './themes';
import { createStore, store } from '../store';

vi.mock('../utils', () => ({ doFitQuote: vi.fn(), fitQuote: vi.fn(), loadFontIfNotExists: vi.fn() }));
vi.mock('./font', () => ({ THEME_FONTS: {}, resetFont: vi.fn() }));
vi.mock('./horizon', () => ({ setDayParameters: vi.fn() }));

afterEach(() => {
  document.body.innerHTML = '';
  document.head.querySelector('#test-theme-styles')?.remove();
  localStorage.clear();
  history.replaceState({}, '', '/');
  vi.unstubAllGlobals();
});

test('keeps quick actions outside and moves every settings control without replacing it', () => {
  document.body.innerHTML = page;
  const theme = document.getElementById('theme-select');
  createStore();
  initSettingsDialog();
  for (const id of ['zen', 'fullscreen', 'screensaver', 'color-picker', 'copy', 'share', 'download']) {
    expect(document.querySelector(`#settings #${id}`)).not.toBeNull();
  }
  for (const id of [
    'theme-select',
    'variant-select',
    'font-select',
    'transition-select',
    'ui-locale-select',
    'work',
    'show-time',
    'hide-book-title',
    'progressbar',
    'settings-color-picker',
  ]) {
    expect(document.querySelector(`#settings-dialog #${id}`)).not.toBeNull();
  }
  expect(document.getElementById('theme-select')).toBe(theme);
  const navigation = document.querySelector('.settings-theme-navigation')!;
  expect([...navigation.children].map((element) => element.id || element.className)).toEqual([
    'theme-previous',
    'theme-picker-toggle',
    'settings-color-controls',
    'theme-next',
  ]);
  expect(document.querySelector('#settings-color-controls')!.closest('.settings-row')).toBeNull();
  const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
  expect(new Set(ids).size).toBe(ids.length);
  const dialog = document.querySelector<HTMLDialogElement>('dialog')!;
  dialog.showModal = vi.fn();
  dialog.close = vi.fn();
  document.getElementById('open-settings')!.click();
  expect(dialog.showModal).toHaveBeenCalledOnce();
  document.getElementById('close-settings')!.click();
  expect(dialog.close).toHaveBeenCalledOnce();
  dialog.dispatchEvent(new Event('close'));
  expect(document.activeElement?.id).toBe('open-settings');
});

test('both color pickers and resets share state, including theme availability', () => {
  document.body.innerHTML = page;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn() })),
  );
  createStore();
  initSettingsDialog();
  initTheme();
  const outside = document.querySelector<HTMLInputElement>('#color-picker')!;
  const inside = document.querySelector<HTMLInputElement>('#settings-color-picker')!;
  inside.value = '#123456';
  inside.dispatchEvent(new Event('input'));
  expect(outside.value).toBe('#123456');
  expect(store.get('color')).toBe('#123456');
  expect(document.documentElement.style.getPropertyValue('--accent-text')).toBe('#ffffff');
  outside.value = '#abcdef';
  outside.dispatchEvent(new Event('input'));
  expect(inside.value).toBe('#abcdef');
  expect(document.documentElement.style.getPropertyValue('--accent-text')).toBe('#000000');
  document.getElementById('settings-reset-color')!.click();
  expect(inside.value).toBe('#d24335');
  expect(outside.value).toBe(inside.value);
  const theme = document.querySelector<HTMLSelectElement>('#theme-select')!;
  theme.value = 'pink';
  theme.dispatchEvent(new Event('change'));
  expect(outside.disabled).toBe(true);
  expect(inside.disabled).toBe(true);
  expect(document.getElementById('settings-color-controls')!.hidden).toBe(true);
});

test('hide book title persists, restores, and allows URL overrides', () => {
  document.body.innerHTML = page;
  createStore();
  initSettingsDialog();
  const button = document.getElementById('hide-book-title')!;
  expect(button.getAttribute('aria-checked')).toBe('false');
  button.click();
  expect(button.getAttribute('aria-checked')).toBe('true');
  expect(document.body.classList.contains('hide-book-title')).toBe(true);
  expect(JSON.parse(localStorage.getItem('settings')!)['hide-book-title']).toBe(true);
  expect(new URLSearchParams(location.search).get('hide-book-title')).toBe('true');
  history.replaceState({}, '', '/');
  createStore();
  expect(store.get('hide-book-title')).toBe(true);
  history.replaceState({}, '', '/?hide-book-title=false');
  createStore();
  expect(store.get('hide-book-title')).toBe(false);
  expect(document.body.classList.contains('hide-book-title')).toBe(false);
});

test('tabs show one panel and support keyboard navigation with roving focus', () => {
  document.body.innerHTML = page;
  createStore();
  initSettingsDialog();
  const appearance = document.getElementById('tab-appearance')!;
  const content = document.getElementById('tab-content')!;
  const behavior = document.getElementById('tab-behavior')!;
  expect([...document.querySelectorAll('[role=tab]')].map((tab) => tab.id)).toEqual([
    'tab-content',
    'tab-appearance',
    'tab-behavior',
  ]);
  expect(document.getElementById('settings-content')!.hidden).toBe(false);
  content.click();
  expect(content.getAttribute('aria-selected')).toBe('true');
  expect(appearance.tabIndex).toBe(-1);
  expect(document.getElementById('settings-appearance')!.hidden).toBe(true);
  expect(document.getElementById('settings-content')!.hidden).toBe(false);
  content.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  expect(document.activeElement).toBe(appearance);
  expect(appearance.getAttribute('aria-selected')).toBe('true');
  appearance.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  expect(document.activeElement).toBe(behavior);
  behavior.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  expect(document.activeElement).toBe(content);
  content.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  expect(document.activeElement).toBe(behavior);
  behavior.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  expect(document.activeElement).toBe(content);
  const dialog = document.querySelector<HTMLDialogElement>('#settings-dialog')!;
  dialog.showModal = vi.fn();
  for (const tab of [appearance, behavior]) {
    tab.click();
    document.getElementById('open-settings')!.click();
    expect(content.getAttribute('aria-selected')).toBe('true');
    expect(content.tabIndex).toBe(0);
    expect(tab.tabIndex).toBe(-1);
    expect(document.getElementById('settings-content')!.hidden).toBe(false);
    expect(document.getElementById(tab.getAttribute('aria-controls')!)!.hidden).toBe(true);
  }
  expect(document.querySelector('#settings-behavior #work')).not.toBeNull();
  expect(document.querySelector('#settings-behavior #transition-select')).not.toBeNull();
});

test('visual theme choices preserve theme events, URL state and current quote without duplicate IDs', async () => {
  document.body.innerHTML = page;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn() })),
  );
  createStore();
  initSettingsDialog();
  initTheme();
  const dialog = document.querySelector<HTMLDialogElement>('#settings-dialog')!;
  dialog.setAttribute('open', '');
  const quote = document.getElementById('quote')!;
  quote.innerHTML = '<p>A quote at <span class="time">noon</span>.</p><cite><span id="author">An author</span></cite>';
  dialog.dispatchEvent(new Event('settings-preview'));
  const retro = document.querySelector<HTMLButtonElement>('.settings-theme-option[data-value="retro"]')!;
  retro.click();
  await Promise.resolve();
  expect(store.get('theme')).toBe('retro-system');
  expect(new URLSearchParams(location.search).get('theme')).toBe('retro-system');
  expect(retro.getAttribute('aria-pressed')).toBe('true');
  expect(document.querySelectorAll('.settings-theme-option[aria-pressed="true"]')).toHaveLength(1);
  const previewDocument = () =>
    new DOMParser().parseFromString(
      document.querySelector<HTMLIFrameElement>('#settings-theme-preview')!.srcdoc,
      'text/html',
    );
  expect(previewDocument().querySelector('#quote p')!.textContent).toBe(quote.querySelector('p')!.textContent);
  expect(previewDocument().querySelector('.time')!.textContent).toBe('noon');
  expect(document.querySelectorAll('#author')).toHaveLength(1);
  quote.querySelector('p')!.textContent = 'The next quote';
  await Promise.resolve();
  await Promise.resolve();
  expect(previewDocument().querySelector('#quote p')!.textContent).toBe('The next quote');
});

test('theme list stays collapsed, supports stepping and closes after choosing or Escape', async () => {
  document.body.innerHTML = page;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn() })),
  );
  createStore();
  initSettingsDialog();
  initTheme();
  const toggle = document.getElementById('theme-picker-toggle')!;
  const list = document.getElementById('theme-picker-list')!;
  const preview = document.getElementById('settings-theme-preview')!;
  expect(list.parentElement).toBe(preview.parentElement);
  expect(list.hidden).toBe(true);
  expect(preview.hidden).toBe(false);
  expect(document.querySelectorAll('.settings-theme-swatch')).toHaveLength(23);
  expect(
    document
      .querySelector('.settings-theme-option[data-value=green] .settings-theme-swatch')!
      .getAttribute('data-theme'),
  ).toBe('green-light');
  expect(document.getElementById('font-preview')).toBeNull();
  document.querySelector<HTMLButtonElement>('.theme-next')!.click();
  await Promise.resolve();
  expect(store.get('theme')).toBe('pink-system');
  document.querySelector<HTMLButtonElement>('.theme-previous')!.click();
  await Promise.resolve();
  expect(store.get('theme')).toBe('base-system');
  toggle.click();
  expect(list.hidden).toBe(false);
  expect(preview.hidden).toBe(true);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  document.querySelector<HTMLButtonElement>('.settings-theme-option[data-value="green"]')!.click();
  await Promise.resolve();
  expect(store.get('theme')).toBe('green-system');
  expect(list.hidden).toBe(true);
  expect(preview.hidden).toBe(false);
  expect(document.activeElement).toBe(toggle);
  toggle.click();
  list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(list.hidden).toBe(true);
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
});

test('isolated preview preserves current scheme, theme CSS, title visibility and Horizon layers', async () => {
  document.body.innerHTML = page;
  // The raw HTML fixture is assigned to body; emulate the real stylesheet in head.
  document.head.insertAdjacentHTML(
    'beforeend',
    '<link id="test-theme-styles" rel="stylesheet" href="/src/styles/styles.css">',
  );
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn() })),
  );
  createStore();
  initSettingsDialog();
  initTheme();
  const dialog = document.querySelector<HTMLDialogElement>('#settings-dialog')!;
  dialog.setAttribute('open', '');
  const quote = document.getElementById('quote')!;
  quote.innerHTML = '<p>Current quote</p><cite><span id="title">A book</span><span id="author">An author</span></cite>';
  const theme = document.querySelector<HTMLSelectElement>('#theme-select')!;
  const scheme = document.querySelector<HTMLSelectElement>('#variant-select')!;
  const previewDocument = () =>
    new DOMParser().parseFromString(
      document.querySelector<HTMLIFrameElement>('#settings-theme-preview')!.srcdoc,
      'text/html',
    );
  for (const value of ['pink', 'green', 'book', 'terminal']) {
    theme.value = value;
    theme.dispatchEvent(new Event('change'));
    scheme.value = 'dark';
    scheme.dispatchEvent(new Event('change'));
    await Promise.resolve();
    const preview = previewDocument();
    expect(preview.documentElement.dataset.theme).toBe(`${value}-dark`);
    expect(preview.querySelector('link[rel="stylesheet"]')!.getAttribute('href')).toContain('styles/styles.css');
    expect(preview.body.style.backgroundColor).toBe('');
    expect(preview.querySelector('#quote #title')!.textContent).toBe('A book');
    expect(preview.querySelector('style')!.textContent).toContain('transition: none');
  }
  document.getElementById('hide-book-title')!.click();
  await Promise.resolve();
  expect(previewDocument().body.classList.contains('hide-book-title')).toBe(true);
  document.body.insertAdjacentHTML(
    'afterbegin',
    '<div class="living-sky"><div class="sky-sun" style="left: 60%"></div></div>',
  );
  theme.value = 'horizon';
  theme.dispatchEvent(new Event('change'));
  document.documentElement.style.setProperty('--sky-0', '#123456');
  await Promise.resolve();
  expect(previewDocument().querySelector('.living-sky .sky-sun')!.getAttribute('style')).toContain('60%');
  expect(previewDocument().documentElement.style.getPropertyValue('--sky-0')).toBe('#123456');
  expect(document.querySelector<HTMLIFrameElement>('#settings-theme-preview')!.getAttribute('sandbox')).toBe('');
});

test('bilingual content cannot change the primary preview or trigger translation layout rules', async () => {
  document.body.innerHTML = page;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn() })),
  );
  createStore();
  initSettingsDialog();
  initTheme();
  const dialog = document.querySelector<HTMLDialogElement>('#settings-dialog')!;
  dialog.setAttribute('open', '');
  const quote = document.getElementById('quote')!;
  quote.innerHTML =
    '<p>A long primary quote with <span class="time">noon</span> highlighted.</p><cite><span id="title">A book</span></cite>';
  dialog.dispatchEvent(new Event('settings-preview'));
  const preview = document.querySelector<HTMLIFrameElement>('#settings-theme-preview')!;
  const before = preview.srcdoc;
  store.set('bilingual', true);
  quote.insertAdjacentHTML(
    'beforeend',
    '<section id="quote-translation"><h3 id="translation-heading">Spanish</h3><p>A translation that should not affect the preview.</p></section>',
  );
  await Promise.resolve();
  await Promise.resolve();
  expect(preview.srcdoc).toBe(before);
  const source = new DOMParser().parseFromString(preview.srcdoc, 'text/html');
  expect(source.querySelector('#quote-translation')).toBeNull();
  expect(source.querySelectorAll('#quote p')).toHaveLength(1);
  expect(quote.querySelector('#quote-translation')).not.toBeNull();
});

test('production stylesheets load in the opaque preview without changing the main document', () => {
  document.body.innerHTML = page;
  document.head.insertAdjacentHTML(
    'beforeend',
    '<link id="test-theme-styles" rel="stylesheet" crossorigin href="/assets/index-production.css">',
  );
  createStore();
  initSettingsDialog();
  const dialog = document.querySelector<HTMLDialogElement>('#settings-dialog')!;
  dialog.setAttribute('open', '');
  document.documentElement.dataset.theme = 'pink-dark';
  document.getElementById('quote')!.innerHTML = '<p>A production quote</p>';
  dialog.dispatchEvent(new Event('settings-preview'));
  const preview = new DOMParser().parseFromString(
    document.querySelector<HTMLIFrameElement>('#settings-theme-preview')!.srcdoc,
    'text/html',
  );
  const stylesheet = preview.querySelector('link[rel="stylesheet"]')!;
  expect(stylesheet.getAttribute('href')).toBe('http://localhost:3000/assets/index-production.css');
  expect(stylesheet.hasAttribute('crossorigin')).toBe(false);
  expect(document.getElementById('test-theme-styles')!.hasAttribute('crossorigin')).toBe(true);
  expect(preview.documentElement.dataset.theme).toBe('pink-dark');
});
