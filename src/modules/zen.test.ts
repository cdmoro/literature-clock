import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createStore, store } from '../store';
import { initZenMode } from './zen';
import ZEN from '../strings/zen.json';
import TRANSLATIONS from '../strings/translations.json';

vi.mock('./screensaver', () => ({ exitScreensaverMode: vi.fn() }));
vi.mock('./locales', () => ({
  resolveLocale: () => 'en-GB',
  getBaseLocale: (locale: string) => locale,
  getInterfaceLocale: () => store.get('ui-locale') || store.get('locale'),
  getStrings: (locale: keyof typeof TRANSLATIONS) => TRANSLATIONS[locale],
}));

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.body.className = '';
  document.body.innerHTML =
    '<button id="exit-zen"></button><p id="zen-hint" hidden></p><footer><div id="menu"><button id="zen"></button></div></footer>';
  createStore();
  store.set('locale', 'en-GB');
  initZenMode();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

const click = (id: string) => document.getElementById(id)!.click();

test('suppresses presentation without changing appearance preferences, then restores them on Escape', () => {
  store.set('background', 'photo');
  store.set('background-pattern', 'christmas');
  store.set('background-effect', 'snow');
  store.set('font', 'serif');
  store.set('quote-attribution', 'hidden');
  const keys = [
    'background',
    'background-pattern',
    'background-effect',
    'font',
    'quote-attribution',
    'fuzzy-clock',
    'progressbar',
    'theme',
  ] as const;
  const before = keys.map((key) => store.get(key));
  click('zen');
  expect(document.body.classList.contains('zen')).toBe(true);
  expect(document.getElementById('zen-hint')!.hidden).toBe(false);
  expect(document.activeElement?.id).toBe('exit-zen');
  expect(keys.map((key) => store.get(key))).toEqual(before);
  document.querySelector('footer')!.classList.add('hidden');
  document.querySelector('footer')!.style.display = 'none';
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  expect(store.get('zen')).toBe(false);
  expect(keys.map((key) => store.get(key))).toEqual(before);
  expect(document.activeElement?.id).toBe('zen');
  expect(document.querySelector('footer')!.style.display).toBe('');
  expect(document.getElementById('zen-hint')!.hidden).toBe(true);
});

test('reveals exit on pointer interaction after the hint expires and supports touch activation', () => {
  click('zen');
  vi.advanceTimersByTime(4000);
  expect(document.getElementById('zen-hint')!.classList.contains('zen-hint-fading')).toBe(true);
  expect(document.getElementById('zen-hint')!.hidden).toBe(false);
  vi.advanceTimersByTime(300);
  expect(document.getElementById('zen-hint')!.hidden).toBe(true);
  expect(document.body.classList.contains('zen-controls-visible')).toBe(false);
  document.dispatchEvent(new Event('pointerdown'));
  expect(document.body.classList.contains('zen-controls-visible')).toBe(true);
  click('exit-zen');
  expect(store.get('zen')).toBe(false);
  vi.advanceTimersByTime(4000);
  expect(document.body.classList.contains('zen-controls-visible')).toBe(false);
});

test('provides hints in every interface locale and an accessible exit label', () => {
  expect(Object.keys(ZEN).sort()).toEqual(Object.keys(TRANSLATIONS).sort());
  click('zen');
  store.set('ui-locale', 'ar-AE');
  expect(document.getElementById('zen-hint')!.textContent).toBe(ZEN['ar-AE'].hint);
  expect(document.getElementById('exit-zen')!.getAttribute('aria-label')).toBe(TRANSLATIONS['ar-AE'].exit_zen_title);
});

test('stops the particle animation in Zen and resumes the selected effect on exit', async () => {
  const { initBackgroundEffects } = await import('./background-effects');
  const canvas = document.createElement('canvas');
  canvas.id = 'background-effect-canvas';
  document.body.append(canvas);
  const context = { setTransform: vi.fn(), clearRect: vi.fn() };
  vi.spyOn(canvas, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn() }));
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 42));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  store.set('theme', 'base-light');
  store.set('background-effect', 'snow');
  initBackgroundEffects();
  expect(document.documentElement.dataset.backgroundEffect).toBe('snow');
  click('zen');
  expect(document.documentElement.dataset.backgroundEffect).toBe('none');
  expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  expect(store.get('background-effect')).toBe('snow');
  click('exit-zen');
  expect(document.documentElement.dataset.backgroundEffect).toBe('snow');
  expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
  vi.unstubAllGlobals();
});
