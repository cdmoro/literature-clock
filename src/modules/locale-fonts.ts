import { loadFontIfNotExists } from '../utils';
import { THEME_FONTS, LOCALE_THEME_FONTS } from './font-catalogue';
export { LOCALE_THEME_FONTS } from './font-catalogue';
import { effectiveFont, fontSupportsLocale } from './font-preferences';

// Alternatives belong to the passage language, including unregistered draft
// catalogues; the interface language can be different.

const BASE_FONT_THEMES = new Set(['base', 'pink', 'green', 'orange', 'purple', 'blue', 'gray']);

export function getLocaleThemeFont(theme: string, locale: string) {
  const name = theme.split('-')[0];
  const language = locale.split('-')[0].toLowerCase();
  const alternative =
    LOCALE_THEME_FONTS[BASE_FONT_THEMES.has(name) ? 'base' : name]?.[language] ||
    (language === 'zh' ? LOCALE_THEME_FONTS.base.zh : undefined);
  if (alternative) return alternative;
  const original = THEME_FONTS[name]?.[0] || 'Special Elite';
  if (fontSupportsLocale(original, locale) === false) {
    return ['terminal', 'retro'].includes(name) ? 'JetBrains Mono' : 'Noto Serif';
  }
  return undefined;
}

export function applyLocaleThemeFont(element: HTMLElement, locale = element.lang) {
  const theme = document.documentElement.dataset.theme || 'base';
  const font = getLocaleThemeFont(theme, locale);
  const selected = effectiveFont(locale);
  element.style.setProperty(
    '--override-quote-font-family',
    selected === 'default' ? 'initial' : `"${selected}", var(--locale-quote-font-family, var(--quote-font-family))`,
  );
  if (selected !== 'default') loadFontIfNotExists(selected);
  // Block inheritance when secondary reading content uses another language.
  element.style.setProperty('--locale-quote-font-family', font ? `"${font}", monospace` : 'initial');
  if (font) loadFontIfNotExists(font);
}

export function refreshLocaleThemeFonts() {
  document
    .querySelectorAll<HTMLElement>('#quote, #quote-translation .translation-content[lang]')
    .forEach((element) => applyLocaleThemeFont(element));
}
