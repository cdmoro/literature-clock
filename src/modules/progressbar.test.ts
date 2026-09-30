// @ts-expect-error Node filesystem is available in Vitest; the app excludes Node types.
import { readFileSync } from 'node:fs';
import { afterEach, expect, test } from 'vitest';
import { createStore, store, parseUrlParams, getStateFromLocalStorage } from '../store';
import { initProgressbarMode } from './progressbar';

afterEach(() => {
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.body.innerHTML = '';
  delete document.documentElement.dataset.progressbar;
  delete document.documentElement.dataset.theme;
  document.getElementById('progress-test-styles')?.remove();
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

test('explicit positions override theme backgrounds and theme mode restores their styling', () => {
  const styles = document.createElement('style');
  styles.id = 'progress-test-styles';
  const css = (name: string) => readFileSync(`src/styles/${name}.css`, 'utf8');
  const base = css('main');
  styles.textContent = [
    base.match(/#progress-bar \{[^}]+\}/)![0],
    base.match(/html\[data-progressbar='none'\] #progress-bar \{[^}]+\}/)![0],
    css('themes/retro'),
    css('themes/bohemian'),
    css('progressbar'),
  ].join('\n');
  document.head.append(styles);
  document.body.innerHTML = '<div id="progress-bar"></div>';
  for (const theme of ['base-light', 'retro-dark', 'bohemian-light']) {
    document.documentElement.dataset.theme = theme;
    for (const mode of ['bottom', 'top', 'background', 'none', 'theme']) {
      document.documentElement.dataset.progressbar = mode;
      document.body.innerHTML = '<div id="progress-bar"></div>';
      const computed = getComputedStyle(document.getElementById('progress-bar')!);
      if (mode === 'none') expect(computed.display).toBe('none');
      if (mode === 'top') expect(computed.top).toBe('0px');
      if (mode === 'bottom' || mode === 'top') {
        expect(computed.getPropertyValue('--progress-height').trim()).toBe('4px');
        expect(computed.getPropertyValue('--progress-opacity').trim()).toBe('1');
      }
      if (mode === 'background') {
        expect(computed.getPropertyValue('--progress-height').trim()).toBe('100%');
        expect(computed.zIndex).toBe('1');
        expect(computed.pointerEvents).toBe('none');
      }
      if (mode === 'theme' && !theme.startsWith('base'))
        expect(computed.getPropertyValue('--progress-height').trim()).toBe('100vh');
    }
  }
});
