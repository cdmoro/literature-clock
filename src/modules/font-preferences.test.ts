import { afterEach, expect, test } from 'vitest';
import COVERAGE from '../font-coverage.json';
import { THEME_FONTS } from './font-catalogue';
import { LOCALE_THEME_FONTS, getLocaleThemeFont } from './locale-fonts';
import {
  FONT_PREFERENCES_KEY,
  effectiveFont,
  preferredFont,
  fontSupportsLocale,
  initFontPreferences,
  rememberFont,
  forgetFont,
} from './font-preferences';

afterEach(() => {
  localStorage.clear();
  history.replaceState({}, '', '/');
  initFontPreferences('default', 'en-GB');
  localStorage.clear();
});

test('every included family has explicit coverage, including Esperanto diacritics and Chinese', () => {
  const fonts = [
    'Special Elite',
    ...Object.values(THEME_FONTS).flat(),
    ...Object.values(LOCALE_THEME_FONTS).flatMap(Object.values),
  ];
  for (const font of fonts) expect(COVERAGE).toHaveProperty(font);
  expect(fontSupportsLocale('Reenie Beanie', 'eo')).toBe(false);
  expect(fontSupportsLocale('Give You Glory', 'eo-draft')).toBe(true);
  expect(fontSupportsLocale('Special Elite', 'zh-CN')).toBe(false);
  expect(fontSupportsLocale('LXGW WenKai Mono TC', 'zh-CN')).toBe(true);
  expect(fontSupportsLocale('Lora', 'zh-CN')).toBeUndefined();
  expect(fontSupportsLocale('constructor', 'eo')).toBeUndefined();
  for (const alternatives of Object.values(LOCALE_THEME_FONTS)) {
    for (const [locale, font] of Object.entries(alternatives)) expect(fontSupportsLocale(font, locale)).toBe(true);
  }
});

test('incompatible rotation preserves choices across a reload and respects an explicit automatic preference', () => {
  initFontPreferences('B612 Mono', 'es-ES');
  expect(effectiveFont('zh-CN')).toBe('default');
  initFontPreferences('default', 'zh-CN');
  expect(effectiveFont('es-ES')).toBe('B612 Mono');
  rememberFont('default', 'zh-CN');
  rememberFont('LXGW WenKai Mono TC', 'es-ES');
  expect(effectiveFont('zh-CN')).toBe('default');
  expect(effectiveFont('es-ES')).toBe('LXGW WenKai Mono TC');
});

test('explicit shared links override saved preferences only for their language', () => {
  initFontPreferences('Roboto', 'es-ES');
  rememberFont('Spectral', 'eo');
  history.replaceState({}, '', '/?font=Literata');
  initFontPreferences('Literata', 'eo');
  expect(preferredFont('eo')).toBe('Literata');
  expect(preferredFont('es-ES')).toBe('Roboto');
});

test('removing a family clears all its remembered choices, not unrelated preferences', () => {
  initFontPreferences('Lora', 'es-ES');
  rememberFont('Lora', 'eo');
  rememberFont('Roboto', 'ru-RU');
  forgetFont('Lora');
  expect(preferredFont('es-ES')).toBe('default');
  expect(preferredFont('eo')).toBe('default');
  expect(preferredFont('ru-RU')).toBe('Roboto');
});

test('malformed preference records migrate the existing selection safely', () => {
  for (const value of ['{broken', '[]', '{"choices":{"eo":1},"sharedChoice":3}']) {
    localStorage.setItem(FONT_PREFERENCES_KEY, value);
    expect(() => initFontPreferences('Literata', 'eo')).not.toThrow();
    expect(effectiveFont('eo')).toBe('Literata');
  }
});

test('automatic theme fonts fall back when the original lacks the language alphabet', () => {
  expect(getLocaleThemeFont('base-light', 'de-DE')).toBe('Noto Serif');
  expect(getLocaleThemeFont('retro-dark', 'ru-RU')).toBe('DotGothic16');
  expect(getLocaleThemeFont('book-dark', 'el-GR')).toBe('Noto Serif');
});

test('an initial automatic font does not pin unchosen languages to their startup default', () => {
  initFontPreferences('default', 'en-GB');
  rememberFont('Literata', 'es-ES');
  expect(effectiveFont('en-GB')).toBe('Literata');
  rememberFont('default', 'en-GB');
  rememberFont('Roboto', 'es-ES');
  expect(effectiveFont('en-GB')).toBe('default');
});
