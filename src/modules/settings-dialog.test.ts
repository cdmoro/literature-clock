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
    'progressbar',
    'settings-color-picker',
  ]) {
    expect(document.querySelector(`#settings-dialog #${id}`)).not.toBeNull();
  }
  expect(document.getElementById('theme-select')).toBe(theme);
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
  outside.value = '#abcdef';
  outside.dispatchEvent(new Event('input'));
  expect(inside.value).toBe('#abcdef');
  document.getElementById('settings-reset-color')!.click();
  expect(inside.value).toBe('#d24335');
  expect(outside.value).toBe(inside.value);
  const theme = document.querySelector<HTMLSelectElement>('#theme-select')!;
  theme.value = 'pink';
  theme.dispatchEvent(new Event('change'));
  expect(outside.disabled).toBe(true);
  expect(inside.disabled).toBe(true);
  expect(inside.closest('.settings-row')!.hasAttribute('hidden')).toBe(true);
});
