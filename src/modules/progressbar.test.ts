import { afterEach, expect, test } from 'vitest';
import { createStore, store, parseUrlParams, getStateFromLocalStorage } from '../store';
import { initProgressbarMode } from './progressbar';

afterEach(() => {
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.body.innerHTML = '';
  delete document.documentElement.dataset.progressbar;
});

test('migrates saved booleans and legacy links while validating positions', () => {
  for (const [value, mode] of [
    [true, 'theme'],
    [false, 'none'],
  ] as const) {
    localStorage.setItem('settings', JSON.stringify({ progressbar: value }));
    expect(getStateFromLocalStorage().progressbar).toBe(mode);
    expect(parseUrlParams(new URLSearchParams(`progressbar=${value}`)).progressbar).toBe(mode);
  }
  for (const mode of ['theme', 'bottom', 'top', 'background', 'none']) {
    expect(parseUrlParams(new URLSearchParams(`progressbar=${mode}`)).progressbar).toBe(mode);
  }
  expect(parseUrlParams(new URLSearchParams('progressbar=invalid')).progressbar).toBeUndefined();
});

test('legacy disabled links override saved preferences and persist the migrated mode', () => {
  localStorage.setItem('settings', JSON.stringify({ progressbar: 'background' }));
  history.replaceState({}, '', '/?progressbar=false');
  createStore();
  expect(store.get('progressbar')).toBe('none');
  expect(new URLSearchParams(location.search).get('progressbar')).toBe('none');
  expect(JSON.parse(localStorage.getItem('settings')!).progressbar).toBe('none');
});

test('the selector follows store updates and preserves explicit choices across themes', () => {
  document.body.innerHTML =
    '<select id="progressbar"><option>theme</option><option>top</option><option>none</option></select>';
  createStore();
  initProgressbarMode();
  const select = document.querySelector<HTMLSelectElement>('#progressbar')!;
  expect(select.value).toBe('theme');
  select.value = 'top';
  select.dispatchEvent(new Event('change'));
  expect(store.get('progressbar')).toBe('top');
  expect(document.documentElement.dataset.progressbar).toBe('top');
  store.set('theme', 'retro-dark');
  expect(store.get('progressbar')).toBe('top');
  store.set('progressbar', 'none');
  expect(select.value).toBe('none');
  expect(document.documentElement.dataset.progressbar).toBe('none');
});
