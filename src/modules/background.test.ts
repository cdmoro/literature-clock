import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore, store, validateSettings } from '../store';
import { resolveBackground } from '../utils/background';
import { initBackground } from './background';
import { initBackgroundPatterns } from './background-patterns';
vi.mock('./photo-background', () => ({ updatePhotoBackground: vi.fn(), clearPhotoBackground: vi.fn() }));

beforeEach(() => {
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.body.innerHTML = '';
  createStore();
});

describe('independent backgrounds', () => {
  it('preserves theme-owned backgrounds and supports decorated themes', () => {
    expect(resolveBackground('photo-dark', 'plain')).toBe('photo');
    expect(resolveBackground('book-light', 'photo')).toBe('default');
    expect(resolveBackground('horizon-system', 'tinted')).toBe('default');
    for (const theme of ['retro', 'festive', 'anaglyph', 'whatsapp', 'terminal']) {
      expect(resolveBackground(`${theme}-dark`, 'photo')).toBe('photo');
    }
  });
  it('validates, stores and shares the preference', () => {
    expect(validateSettings({ background: 'invalid' }, true)).toEqual({});
    store.set('background', 'photo');
    expect(new URLSearchParams(location.search).get('background')).toBe('photo');
    createStore();
    expect(store.get('background')).toBe('photo');
    store.set('background', 'default');
    expect(new URLSearchParams(location.search).has('background')).toBe(false);
  });
  it('locks owned backgrounds without losing the choice and keeps patterns available in Plain', () => {
    const dialog = document.createElement('dialog');
    dialog.innerHTML = '<div class="settings-theme-picker"></div>';
    document.body.append(dialog);
    initBackground(dialog);
    initBackgroundPatterns(dialog);
    const select = dialog.querySelector<HTMLSelectElement>('#background-select')!;
    const pattern = dialog.querySelector<HTMLSelectElement>('#background-pattern')!;
    store.set('background', 'photo');
    store.set('theme', 'photo-dark');
    expect(select.disabled).toBe(true);
    expect(select.value).toBe('photo');
    store.set('theme', 'book-dark');
    expect(select.value).toBe('default');
    store.set('theme', 'base-dark');
    expect(select.disabled).toBe(false);
    expect(select.value).toBe('photo');
    store.set('background-pattern', 'dots');
    store.set('background', 'plain');
    expect(pattern.disabled).toBe(false);
    expect(document.documentElement.dataset.backgroundPattern).toBe('dots');
    store.set('background-pattern', 'none');
    expect(document.documentElement.dataset.backgroundPattern).toBe('none');
    store.set('background-pattern', 'dots');
    store.set('background', 'tinted');
    expect(pattern.disabled).toBe(false);
    expect(store.get('background-pattern')).toBe('dots');
  });
});
