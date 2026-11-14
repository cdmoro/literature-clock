import { getCurrentBackgroundPattern } from './background-patterns';
import { sharePatternTile } from '../utils/share-pattern';
import { store } from '../store';
import { type BackgroundPattern } from '../utils/background-patterns';
import html2canvas from 'html2canvas-pro';
import type { ResolvedQuote } from '../types';
import { fontSupportsLocale } from './font-preferences';
import { loadGoogleFont, normalizeFontName, fontFamilyOverride } from '../utils/google-font';
import { getLocaleThemeFont } from './locale-fonts';
import { quoteMarkup } from '../utils/quote-markup';
import { defaultColor } from './themes';
import { CITE_FACTOR } from './font';
import { textDirection } from '../utils/text-direction';
import { getBaseLocale } from './locales';
import STRINGS from '../strings/web/share.json';

export type CardAppearance = 'light' | 'dark';
export interface CardOptions {
  pattern?: BackgroundPattern;
  color?: string;
  palette?: string;
  font?: string;
  useDefaultColor?: boolean;
  photoImage?: string;
  highlightTime?: boolean;
  uppercase?: boolean;
  alignment?: 'start' | 'center' | 'end';
}
const themeFontLoads = new Map<string, Promise<void>>();

/** Render a snapshot of the quote, without viewport dimensions or clock animation. */
export async function renderShareCard(
  quote: ResolvedQuote,
  appearance?: CardAppearance,
  theme?: string,
  options: CardOptions = {},
  interfaceLocale = store.get('ui-locale') || store.get('locale'),
): Promise<HTMLCanvasElement> {
  const width = 1080;
  const height = 1080;
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
  if (theme && skin !== 'festive' && theme !== liveTheme.replace(/-(light|dark)$/, '')) {
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
    options.photoImage !== undefined ||
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
    ? fontFamilyOverride(customFont, themeFontFamily)
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
  const festivePattern = skin === 'festive' && pattern !== 'none';
  const tileImage = patternTile
    ? festivePattern
      ? `${patternTile.image}, ${paletteStyle.getPropertyValue('--background-image').trim()}`
      : patternTile.image
    : backgroundImage;
  const backgroundSize = patternTile
    ? festivePattern
      ? `${patternTile.size}, 100% 100%`
      : patternTile.size
    : pattern !== 'none'
      ? paletteStyle.backgroundSize
      : 'cover';
  const backgroundPosition = pattern !== 'none' ? paletteStyle.backgroundPosition : 'center';
  const cardBackgroundImage =
    options.photoImage === ''
      ? patternTile?.image || 'none'
      : options.photoImage
        ? patternTile
          ? 'none'
          : tileImage
        : tileImage;
  const cardBackgroundSize = options.photoImage === '' && patternTile ? patternTile.size : backgroundSize;
  const cardBackgroundRepeat =
    options.photoImage === '' && patternTile
      ? 'repeat'
      : patternTile && festivePattern
        ? 'repeat, no-repeat'
        : paletteStyle.backgroundRepeat;
  const cardBackgroundPosition = backgroundPosition;
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
    backgroundImage: cardBackgroundImage,
    backgroundRepeat: cardBackgroundRepeat,
    backgroundSize: cardBackgroundSize,
    backgroundPosition: cardBackgroundPosition,
    fontFamily,
    lineHeight: quote.locale.startsWith('ar') ? '1.65' : '1.3',
    overflowWrap: 'anywhere',
  });
  let photo: HTMLImageElement | undefined;
  if (options.photoImage) {
    const source = options.photoImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1];
    if (source) {
      photo = document.createElement('img');
      photo.crossOrigin = 'anonymous';
      photo.src = source;
      Object.assign(photo.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        zIndex: '0',
      });
      card.append(photo);
      const shade = document.createElement('div');
      const dark = (appearance || (liveTheme.endsWith('-dark') ? 'dark' : 'light')) === 'dark';
      Object.assign(shade.style, {
        position: 'absolute',
        inset: '0',
        background: dark ? '#00000040' : '#ffffff40',
        zIndex: '1',
      });
      card.append(shade);
      const photoEffect = paletteStyle.getPropertyValue('--photo-effect').trim();
      if (photoEffect && photoEffect !== 'linear-gradient(transparent, transparent)') {
        const effectLayer = document.createElement('div');
        Object.assign(effectLayer.style, {
          position: 'absolute',
          inset: '0',
          backgroundImage: photoEffect,
          backgroundSize: paletteStyle.getPropertyValue('--photo-effect-size').trim() || '100% 100%',
          zIndex: '2',
        });
        card.append(effectLayer);
      }
      if (patternTile) {
        const patternLayer = document.createElement('div');
        Object.assign(patternLayer.style, {
          position: 'absolute',
          inset: '0',
          backgroundImage: patternTile.image,
          backgroundSize: patternTile.size,
          backgroundRepeat: 'repeat',
          zIndex: '3',
        });
        card.append(patternLayer);
      }
    }
  }
  card.lang = quote.locale;
  card.dir = textDirection(quote.locale);
  card.setAttribute('aria-hidden', 'true');
  const content = document.createElement('div');
  Object.assign(content.style, {
    textShadow: quoteStyle.textShadow,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    flex: '1 1 auto',
    marginBottom: '72px',
  });
  const passage = document.createElement('div');
  passage.dir = 'auto';
  passage.style.whiteSpace = 'pre-wrap';
  passage.style.textTransform = options.uppercase ? 'uppercase' : 'none';
  passage.style.textAlign = options.alignment || 'start';
  const isFuzzy = store.get('fuzzy-clock') === true;
  const passageParts = isFuzzy
    ? ([[quote.quote_time_case, true]] as const)
    : ([
        [quote.quote_first, false],
        [quote.quote_time_case, true],
        [quote.quote_last, false],
      ] as const);
  for (const [text, highlighted] of passageParts) {
    const span = document.createElement('span');
    span.append(quoteMarkup(text || ''));
    if (highlighted && options.highlightTime) span.style.color = accent;
    passage.append(span);
  }
  if (!passage.textContent) passage.textContent = isFuzzy ? quote.quote_time_case : quote.quote_raw;
  if (isFuzzy) {
    passage.style.textAlign = 'center';
    passage.style.textWrap = 'balance';
  }
  const credit = document.createElement('div');
  credit.dir = textDirection(quote.locale);
  credit.className = 'share-card-credit';
  const centered = options.alignment === 'center';
  const attribution = store.get('hide-book-title') ? [quote.author] : [quote.title, quote.author];
  attribution.forEach((text, index) => {
    if (index === 0 && !centered) credit.append('— ');
    if (index > 0) credit.append(centered ? '\n' : ', ');
    const part = document.createElement('span');
    part.dir = 'auto';
    part.style.unicodeBidi = 'isolate';
    part.textContent = text;
    credit.append(part);
  });
  const citeFactor = CITE_FACTOR[skin as keyof typeof CITE_FACTOR] || 0.7;
  Object.assign(credit.style, {
    marginTop: '40px',
    fontSize: `${84 * citeFactor}px`,
    textAlign: options.alignment || 'start',
    whiteSpace: centered ? 'pre-line' : 'normal',
    opacity: '0.8',
  });
  if (isFuzzy || store.get('quote-attribution') === 'hidden') {
    content.append(passage);
  } else {
    content.append(passage, credit);
  }
  const signature = document.createElement('div');
  signature.className = 'share-card-signature';
  const signatureLocale = getBaseLocale(interfaceLocale || 'en-GB');
  signature.lang = signatureLocale;
  signature.dir = textDirection(signatureLocale);
  const productName =
    STRINGS[signatureLocale]?.signature || STRINGS['en-GB'].signature;
  const appIcon = document.createElement('img');
  const darkAppearance = appearance ? appearance === 'dark' : liveTheme.endsWith('-dark');
  appIcon.src = darkAppearance ? '/assets/app-icon-light.png' : '/assets/app-icon-dark.png';
  appIcon.alt = '';
  appIcon.width = 36;
  appIcon.height = 36;
  appIcon.style.objectFit = 'contain';
  const signatureName = document.createElement('span');
  signatureName.textContent = productName;
  Object.assign(signature.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '28px',
    lineHeight: '36px',
  });
  Object.assign(appIcon.style, {
    width: '36px', height: '36px', flex: '0 0 36px', display: 'block', transform: 'translateY(4px)',
  });
  signature.append(appIcon, signatureName);
  if (photo) {
    for (const element of [content, signature]) {
      element.style.position = 'relative';
      element.style.zIndex = '4';
    }
  }
  if (pattern === 'noise') {
    const veil = document.createElement('div');
    Object.assign(veil.style, {
      position: 'absolute',
      inset: '0',
      backgroundColor: paletteStyle.backgroundColor,
      opacity: palette.dataset.theme?.endsWith('-dark') ? '0.65' : '0.35',
    });
    card.append(veil);
    for (const element of [content, signature]) element.style.position = 'relative';
  }
  card.append(content, signature);
  document.body.append(card);
  try {
    if (photo) await photo.decode().catch(() => undefined);
    await fontLoading;
    await document.fonts?.ready;
    // Keep every exported image square. Measure wrapped passage height only;
    // scrollWidth changes with text alignment and must not affect type size.
    const minimumSize = 12;
    const maximumSize = 120;
    const availableHeight = height - 192 - signature.getBoundingClientRect().height - 72;
    const includesCredit = !isFuzzy && store.get('quote-attribution') !== 'hidden';
    let low = minimumSize;
    let high = maximumSize;
    for (let attempt = 0; attempt < 12; attempt++) {
      const candidate = Math.ceil((low + high) / 2);
      passage.style.fontSize = `${candidate}px`;
      if (includesCredit) credit.style.fontSize = `${candidate * citeFactor}px`;
      const creditHeight = includesCredit ? credit.getBoundingClientRect().height + 40 : 0;
      if (passage.scrollHeight + creditHeight <= availableHeight) low = candidate;
      else high = candidate - 1;
    }
    passage.style.fontSize = `${low}px`;
    if (includesCredit) credit.style.fontSize = `${low * citeFactor}px`;
    return await html2canvas(card, { useCORS: true, scale: 1, width, height, logging: false });
  } finally {
    card.remove();
  }
}
