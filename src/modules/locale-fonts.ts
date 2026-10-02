import { loadFontIfNotExists } from '../utils';

// Alternatives belong to the passage language, including unregistered draft
// catalogues; the interface language can be different.
export const LOCALE_THEME_FONTS: Record<string, Record<string, string>> = {
  base: { ru: 'Pangolin', el: 'Sansation', zh: 'ZCOOL KuaiLe' },
  retro: { ru: 'DotGothic16', el: 'Handjet', zh: 'ZCOOL QingKe HuangYou' },
  handwriting: { eo: 'Give You Glory', ru: 'Shantell Sans', el: 'Mansalva', zh: 'Long Cang' },
  subtle: { eo: 'Literata', ru: 'Literata' },
  horizon: { eo: 'Literata', ru: 'Literata' },
  book: { ru: 'Literata' },
  anaglyph: { ru: 'Russo One' },
  elegant: { ru: 'Poiret One', zh: 'ZCOOL XiaoWei' },
  poster: { eo: 'Spectral', ru: 'Rubik Mono One', zh: 'Liu Jian Mao Cao' },
  festive: { eo: 'Playwrite AR', ru: 'Pacifico', el: 'Comic Relief' },
  terminal: { eo: 'LXGW WenKai Mono TC', ru: 'JetBrains Mono', el: 'Victor Mono', zh: 'ZCOOL QingKe HuangYou' },
  bohemian: { ru: 'Comfortaa', el: 'M PLUS Rounded 1c' },
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
