import html2canvas from 'html2canvas-pro';
import type { ResolvedQuote } from '../types';
import { loadGoogleFont } from '../utils/google-font';
import { getLocaleThemeFont } from './locale-fonts';
import { quoteMarkup } from '../utils/quote-markup';

export const cardFormats = { square: [1080, 1080], portrait: [1080, 1920], landscape: [1920, 1080] } as const;
export type CardFormat = keyof typeof cardFormats;
export type CardAppearance = 'light' | 'dark';
const themeFontLoads = new Map<string, Promise<void>>();

/** Render a snapshot of the quote, without viewport dimensions or clock animation. */
export async function renderShareCard(
  quote: ResolvedQuote,
  format: CardFormat,
  appearance?: CardAppearance,
  theme?: string,
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
  if (!theme || theme === liveTheme.replace(/-(light|dark)$/, '')) {
    palette.style.setProperty(
      '--accent-color',
      getComputedStyle(document.documentElement).getPropertyValue('--accent-color'),
    );
  } else {
    palette.style.setProperty('--background-image', 'none');
  }
  palette.style.color = 'var(--font-color)';
  palette.style.backgroundColor = 'var(--background)';
  palette.style.backgroundImage = 'var(--background-image, none)';
  document.body.append(palette);
  const paletteStyle = getComputedStyle(palette);
  const color = appearance || theme ? paletteStyle.color : bodyStyle.color;
  const backgroundColor = appearance || theme ? paletteStyle.backgroundColor : bodyStyle.backgroundColor;
  const backgroundImage = appearance || theme ? paletteStyle.backgroundImage : bodyStyle.backgroundImage;
  const accent =
    appearance || theme
      ? paletteStyle.getPropertyValue('--accent-color')
      : getComputedStyle(document.documentElement).getPropertyValue('--accent-color');
  const localeFont = theme ? getLocaleThemeFont(theme, quote.locale) : undefined;
  const fontFamily = theme
    ? localeFont
      ? `"${localeFont}", serif`
      : quote.locale.startsWith('ar')
        ? 'system-ui, sans-serif'
        : paletteStyle.getPropertyValue('--quote-font-family')
    : quoteStyle.fontFamily;
  let fontLoading: Promise<void> | undefined;
  if (theme) {
    const font = localeFont || fontFamily.split(',')[0].replace(/["']/g, '').trim();
    if (font && !['system-ui', 'serif', 'sans-serif', 'monospace'].includes(font)) {
      fontLoading = themeFontLoads.get(font);
      if (!fontLoading) {
        fontLoading = loadGoogleFont(font).catch(() => {
          themeFontLoads.delete(font);
        });
        themeFontLoads.set(font, fontLoading);
      }
    }
  }
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
    backgroundImage,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
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
  credit.textContent = `${quote.title} — ${quote.author}`;
  Object.assign(credit.style, { marginTop: '40px', fontSize: '28px' });
  content.append(passage, credit);
  const signature = document.createElement('div');
  signature.textContent = 'Literature Clock · literatureclock.netlify.app';
  signature.style.fontSize = '22px';
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
