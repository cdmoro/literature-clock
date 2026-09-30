import { loadFontIfNotExists } from '../utils';

// Alternatives belong to the passage language, including unregistered draft
// catalogues; the interface language can be different.
export const LOCALE_THEME_FONTS: Record<string, Record<string, string>> = {
  base: { el: 'Moderustic' },
  handwriting: { el: 'Mansalva' },
  terminal: { el: 'Iosevka Charon Mono' },
  bohemian: { el: 'M PLUS Rounded 1c' },
};
const BASE_FONT_THEMES = new Set(['base', 'pink', 'green', 'orange', 'purple', 'blue', 'gray']);

export function applyLocaleThemeFont(element: HTMLElement, locale = element.lang) {
  const theme = document.documentElement.dataset.theme?.split('-')[0] || 'base';
  const language = locale.split('-')[0].toLowerCase();
  const font = LOCALE_THEME_FONTS[BASE_FONT_THEMES.has(theme) ? 'base' : theme]?.[language];
  // Block inheritance when secondary reading content uses another language.
  element.style.setProperty('--locale-quote-font-family', font ? `"${font}", monospace` : 'initial');
  if (font) loadFontIfNotExists(font);
}

export function refreshLocaleThemeFonts() {
  document
    .querySelectorAll<HTMLElement>('#quote, #quote-translation .translation-content[lang]')
    .forEach((element) => applyLocaleThemeFont(element));
}
