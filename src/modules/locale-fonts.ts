import { loadFontIfNotExists } from '../utils';

// Alternatives belong to the passage language, including unregistered draft
// catalogues; the interface language can be different.
export const LOCALE_THEME_FONTS: Record<string, Record<string, string>> = {
  base: { ru: 'PT Mono', el: 'Sansation', zh: 'Noto Sans SC' },
  retro: { ru: 'PT Mono', el: 'Handjet', zh: 'ZCOOL QingKe HuangYou' },
  handwriting: { ru: 'Caveat', el: 'Mansalva', zh: 'Long Cang' },
  subtle: { ru: 'Literata' },
  horizon: { ru: 'Literata' },
  book: { ru: 'Literata' },
  anaglyph: { ru: 'Russo One' },
  elegant: { zh: 'ZCOOL XiaoWei' },
  poster: { ru: 'Literata', zh: 'Liu Jian Mao Cao' },
  festive: { ru: 'Caveat', el: 'Comic Relief' },
  terminal: { ru: 'PT Mono', el: 'Victor Mono', zh: 'ZCOOL QingKe HuangYou' },
  bohemian: { el: 'M PLUS Rounded 1c' },
  photo: { ru: 'Russo One', el: 'Dela Gothic One', zh: 'ZCOOL KuaiLe' },
};
const BASE_FONT_THEMES = new Set(['base', 'pink', 'green', 'orange', 'purple', 'blue', 'gray']);

export function getLocaleThemeFont(theme: string, locale: string) {
  const name = theme.split('-')[0];
  const language = locale.split('-')[0].toLowerCase();
  return (
    LOCALE_THEME_FONTS[BASE_FONT_THEMES.has(name) ? 'base' : name]?.[language] ||
    (language === 'zh' ? LOCALE_THEME_FONTS.base.zh : undefined)
  );
}

export function applyLocaleThemeFont(element: HTMLElement, locale = element.lang) {
  const theme = document.documentElement.dataset.theme || 'base';
  const font = getLocaleThemeFont(theme, locale);
  // Block inheritance when secondary reading content uses another language.
  element.style.setProperty('--locale-quote-font-family', font ? `"${font}", monospace` : 'initial');
  if (font) loadFontIfNotExists(font);
}

export function refreshLocaleThemeFonts() {
  document
    .querySelectorAll<HTMLElement>('#quote, #quote-translation .translation-content[lang]')
    .forEach((element) => applyLocaleThemeFont(element));
}
