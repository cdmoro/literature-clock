import { afterEach, expect, test, vi } from 'vitest';
import { applyLocaleThemeFont, refreshLocaleThemeFonts } from './locale-fonts';
import { loadFontIfNotExists } from '../utils';

vi.mock('../utils', () => ({ loadFontIfNotExists: vi.fn() }));
afterEach(() => {
  document.body.innerHTML = '';
  delete document.documentElement.dataset.theme;
  vi.clearAllMocks();
});

test('Greek draft passages use the base alternative in both variants and colour skins', () => {
  const quote = document.createElement('blockquote');
  quote.lang = 'el-GR-draft';
  for (const theme of ['base-light', 'base-dark', 'pink-light']) {
    document.documentElement.dataset.theme = theme;
    applyLocaleThemeFont(quote);
    expect(quote.style.getPropertyValue('--locale-quote-font-family')).toContain('Sansation');
  }
  expect(loadFontIfNotExists).toHaveBeenCalledWith('Sansation');
  // A custom font remains higher priority and is never cleared by language changes.
  document.documentElement.style.setProperty('--override-quote-font-family', 'Lora');
  applyLocaleThemeFont(quote);
  expect(document.documentElement.style.getPropertyValue('--override-quote-font-family')).toBe('Lora');
  document.documentElement.style.removeProperty('--override-quote-font-family');
});

test('theme and quote language changes clear stale alternatives', () => {
  document.body.innerHTML = '<blockquote id="quote" lang="el-GR"></blockquote>';
  const quote = document.getElementById('quote')!;
  document.documentElement.dataset.theme = 'base-dark';
  refreshLocaleThemeFonts();
  document.documentElement.dataset.theme = 'kindle-light';
  refreshLocaleThemeFonts();
  expect(quote.style.getPropertyValue('--locale-quote-font-family')).toBe('initial');
  document.documentElement.dataset.theme = 'base-light';
  quote.lang = 'en-GB';
  refreshLocaleThemeFonts();
  expect(quote.style.getPropertyValue('--locale-quote-font-family')).toBe('initial');
});

test('bilingual passages select fonts independently of their parent language', () => {
  document.documentElement.dataset.theme = 'base-dark';
  document.body.innerHTML =
    '<blockquote id="quote" lang="el-GR"><section id="quote-translation"><div class="translation-content" lang="en-GB"></div></section></blockquote>';
  refreshLocaleThemeFonts();
  const translation = document.querySelector<HTMLElement>('.translation-content')!;
  expect(document.getElementById('quote')!.style.getPropertyValue('--locale-quote-font-family')).toContain('Sansation');
  expect(translation.style.getPropertyValue('--locale-quote-font-family')).toBe('initial');
  translation.lang = 'el-GR';
  document.getElementById('quote')!.lang = 'en-GB';
  refreshLocaleThemeFonts();
  expect(translation.style.getPropertyValue('--locale-quote-font-family')).toContain('Sansation');
});

test.each([
  ['handwriting', 'Mansalva'],
  ['terminal', 'Victor Mono'],
  ['bohemian', 'M PLUS Rounded 1c'],
])('Greek %s passages use %s in both variants', (theme, font) => {
  const quote = document.createElement('blockquote');
  quote.lang = 'el-GR';
  for (const variant of ['light', 'dark']) {
    document.documentElement.dataset.theme = `${theme}-${variant}`;
    applyLocaleThemeFont(quote);
    expect(quote.style.getPropertyValue('--locale-quote-font-family')).toContain(font);
    expect(loadFontIfNotExists).toHaveBeenCalledWith(font);
  }
});
