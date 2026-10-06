import { getCurrentBackgroundPattern } from './background-patterns';
import { sharePatternTile } from '../utils/share-pattern';
import { store } from '../store';
import { type BackgroundPattern } from '../utils/background-patterns';
import html2canvas from 'html2canvas-pro';
import type { ResolvedQuote } from '../types';
import { fontSupportsLocale } from './font-preferences';
import { loadGoogleFont, normalizeFontName } from '../utils/google-font';
import { getLocaleThemeFont } from './locale-fonts';
import { quoteMarkup } from '../utils/quote-markup';
import { defaultColor } from './themes';

export const cardFormats = { square: [1080, 1080], portrait: [1080, 1920], landscape: [1920, 1080] } as const;
export type CardFormat = keyof typeof cardFormats;
export type CardAppearance = 'light' | 'dark';
export interface CardOptions {
  pattern?: BackgroundPattern;
  color?: string;
  palette?: string;
  font?: string;
  useDefaultColor?: boolean;
}
const themeFontLoads = new Map<string, Promise<void>>();

/** Render a snapshot of the quote, without viewport dimensions or clock animation. */
export async function renderShareCard(
  quote: ResolvedQuote,
  format: CardFormat,
  appearance?: CardAppearance,
  theme?: string,
  options: CardOptions = {},
): Promise<HTMLCanvasElement> {
  const [width, height] = cardFormats[format];
  const bodyStyle = getComputedStyle(document.body);
  const quoteStyle = getComputedStyle(document.getElementById('quote') || document.body);
  const card = document.createElement('div');
  // Resolve the existing theme variant on an isolated element, never changing the clock.
  const palette = document.createElement('div');
  palette.hidden = true;
  const liveTheme = document.documentElement.dataset.theme || 'base-light';
  const skin = theme || liveTheme.replace(/-(light|dark)$/, '');
  palette.dataset.theme = `${skin}-${appearance || (liveTheme.endsWith('-dark') ? 'dark' : 'light')}`;
  palette.classList.toggle(
    'custom-accent',
    (!theme || theme === liveTheme.replace(/-(light|dark)$/, '')) &&
      document.documentElement.classList.contains('custom-accent'),
  );
  const selectedPalette =
    options.palette === 'random'
      ? document.documentElement.dataset.accentPalette || document.documentElement.dataset.palette
      : options.palette;
  if (selectedPalette && selectedPalette !== 'default' && skin === 'base') palette.classList.remove('custom-accent');
  if (skin === 'base' && !options.color && !options.useDefaultColor) {
    palette.dataset.palette =
      selectedPalette ||
      (liveTheme.startsWith('base-') ? document.documentElement.dataset.palette : undefined) ||
      'default';
  }
  if (
    selectedPalette &&
    selectedPalette !== 'default' &&
    skin !== 'base' &&
    !options.color &&
    !options.useDefaultColor
  ) {
    palette.classList.add('custom-accent');
    palette.style.setProperty('--accent-color', defaultColor(selectedPalette, palette.dataset.theme.endsWith('-dark')));
  }
  if (
    !selectedPalette &&
    (!theme || theme === liveTheme.replace(/-(light|dark)$/, '')) &&
    (!palette.dataset.palette || palette.dataset.palette === 'default')
  ) {
    palette.style.setProperty(
      '--accent-color',
      getComputedStyle(document.documentElement).getPropertyValue('--accent-color'),
    );
  }
  if (theme && theme !== liveTheme.replace(/-(light|dark)$/, '')) {
    palette.style.setProperty('--background-image', 'none');
  }
  const pattern = getCurrentBackgroundPattern(options.pattern || store.get('background-pattern') || 'none');
  const customColor = options.color && /^#[0-9a-f]{6}$/i.test(options.color) ? options.color : undefined;
  if (customColor) {
    palette.classList.add('custom-accent');
    palette.style.setProperty('--accent-color', customColor);
  }
  if (options.useDefaultColor) {
    palette.classList.remove('custom-accent');
    palette.style.removeProperty('--accent-color');
  }
  palette.classList.add('background-pattern-surface');
  palette.dataset.backgroundPattern = pattern;
  palette.style.color = 'var(--font-color)';
  palette.style.backgroundColor = 'var(--background)';
  if (pattern === 'none') palette.style.backgroundImage = 'var(--background-image, none)';
  document.body.append(palette);
  const paletteStyle = getComputedStyle(palette);
  const patternChanged = pattern !== (document.documentElement.dataset.backgroundPattern || 'none');
  const isolated =
    appearance ||
    theme ||
    customColor ||
    options.palette ||
    options.useDefaultColor ||
    patternChanged ||
    pattern !== 'none';
  const color = isolated ? paletteStyle.color : bodyStyle.color;
  const backgroundColor = isolated ? paletteStyle.backgroundColor : bodyStyle.backgroundColor;
  const backgroundImage = isolated ? paletteStyle.backgroundImage : bodyStyle.backgroundImage;
  const accent = isolated
    ? paletteStyle.getPropertyValue('--accent-color')
    : getComputedStyle(document.documentElement).getPropertyValue('--accent-color');
  const localeFont = getLocaleThemeFont(skin, quote.locale);
  const themeFontFamily = localeFont
    ? `"${localeFont}", serif`
    : quote.locale.startsWith('ar')
      ? 'system-ui, sans-serif'
      : paletteStyle.getPropertyValue('--quote-font-family') || 'serif';
  const candidate = options.font && options.font !== 'default' ? normalizeFontName(options.font) : undefined;
  const customFont = candidate && fontSupportsLocale(candidate, quote.locale) !== false ? candidate : undefined;
  const fontFamily = customFont
    ? `"${customFont}", ${themeFontFamily}`
    : theme || options.font !== undefined
      ? themeFontFamily
      : quoteStyle.fontFamily;
  let fontLoading: Promise<void> | undefined;
  const requestedFont =
    customFont ||
    (theme || options.font !== undefined
      ? localeFont || themeFontFamily.split(',')[0].replace(/["']/g, '').trim()
      : undefined);
  if (requestedFont && !['system-ui', 'serif', 'sans-serif', 'monospace'].includes(requestedFont)) {
    let loading = themeFontLoads.get(requestedFont);
    if (!loading) {
      loading = loadGoogleFont(requestedFont);
      themeFontLoads.set(requestedFont, loading);
    }
    fontLoading = loading.catch(() => {
      themeFontLoads.delete(requestedFont);
      card.style.fontFamily = themeFontFamily;
    });
  }
  const patternTile = sharePatternTile(pattern, color, palette.dataset.theme?.endsWith('-dark') || false);
  const backgroundSize = patternTile?.size || (pattern !== 'none' ? paletteStyle.backgroundSize : 'cover');
  const backgroundPosition = pattern !== 'none' ? paletteStyle.backgroundPosition : 'center';
  palette.remove();
  Object.assign(card.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${width}px`,
    height: `${height}px`,
    boxSizing: 'border-box',
    padding: '96px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    color,
    backgroundColor,
    backgroundImage: patternTile?.image || backgroundImage,
    backgroundSize,
    backgroundPosition,
    fontFamily,
    lineHeight: quote.locale.startsWith('ar') ? '1.65' : '1.3',
    overflowWrap: 'anywhere',
  });
  card.lang = quote.locale;
  card.setAttribute('aria-hidden', 'true');
  const time = document.createElement('div');
  time.textContent = quote.time;
  Object.assign(time.style, {
    fontSize: '32px',
    color: accent,
  });
  const content = document.createElement('div');
  const passage = document.createElement('div');
  passage.dir = 'auto';
  passage.style.whiteSpace = 'pre-wrap';
  for (const [text, highlighted] of [
    [quote.quote_first, false],
    [quote.quote_time_case, true],
    [quote.quote_last, false],
  ] as const) {
    const span = document.createElement('span');
    span.append(quoteMarkup(text || ''));
    if (highlighted) span.style.color = time.style.color;
    passage.append(span);
  }
  if (!passage.textContent) passage.textContent = quote.quote_raw;
  const credit = document.createElement('div');
  credit.dir = 'auto';
  credit.className = 'share-card-credit';
  credit.append('— ');
  const attribution = store.get('hide-book-title') ? [quote.author] : [quote.title, quote.author];
  attribution.forEach((text, index) => {
    if (index) credit.append(', ');
    const part = document.createElement('span');
    part.dir = 'auto';
    part.style.unicodeBidi = 'isolate';
    part.textContent = text;
    credit.append(part);
  });
  Object.assign(credit.style, { marginTop: '40px', fontSize: '28px' });
  content.append(passage, credit);
  const signature = document.createElement('div');
  signature.textContent = 'Literature Clock · literatureclock.netlify.app';
  signature.style.fontSize = '22px';
  if (pattern === 'noise') {
    const veil = document.createElement('div');
    Object.assign(veil.style, {
      position: 'absolute',
      inset: '0',
      backgroundColor: paletteStyle.backgroundColor,
      opacity: palette.dataset.theme?.endsWith('-dark') ? '0.65' : '0.35',
    });
    card.append(veil);
    for (const element of [time, content, signature]) element.style.position = 'relative';
  }
  card.append(time, content, signature);
  document.body.append(card);
  try {
    await fontLoading;
    await document.fonts?.ready;
    let size = 64;
    passage.style.fontSize = `${size}px`;
    const available = height - 192 - 150;
    while (content.scrollHeight > available && size > 28) passage.style.fontSize = `${--size}px`;
    // Exceptionally long passages grow the card rather than becoming unreadable or clipped.
    const finalHeight = Math.max(height, content.scrollHeight + 192 + 150);
    card.style.height = `${finalHeight}px`;
    return await html2canvas(card, { useCORS: true, scale: 1, width, height: finalHeight, logging: false });
  } finally {
    card.remove();
  }
}
