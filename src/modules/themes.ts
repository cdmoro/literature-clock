import { refreshBackgroundPattern } from './background-patterns';
import { refreshLocaleThemeFonts } from './locale-fonts';
import { THEME_FONTS, refreshDefaultFontLabel } from './font';
import { doFitQuote, fitQuote, loadFontIfNotExists } from '../utils';
import { setDayParameters } from './horizon';
import { store } from '../store';
import { contrastingText } from '../utils/colors';

const DEFAULT_COLORS: Record<string, string> = {
  base: '#d24335',
  pink: '#ff89d8',
  green: '#2ecc71',
  orange: '#f39c12',
  purple: '#9b59b6',
  blue: '#2c97df',
  gray: '#808686',
  anaglyph: '#c53a35',
  subtle: '#333333',
  kindle: '#2c2c2e',
  horizon: '#f5cf8e',
  retro: '#daa908',
  elegant: '#9f5bd5',
  festive: '#e74c3c',
  bohemian: '#1abc9c',
  book: '#fbf719',
  handwriting: '#067abf',
  terminal: '#ac7f02',
  frame: '#00b9c4',
  poster: '#fd4533',
  photo: '#e33725',
  whatsapp: '#e1ffc7',
};

// Remember whether appearance changes should follow the theme palette.
let followsDefaultColor = true;

function defaultColor(theme: string) {
  const dark = document.documentElement.dataset.theme?.endsWith('-dark');
  const darkColors: Record<string, string> = {
    retro: '#f1ba08',
    terminal: '#1bec1b',
    frame: '#00c4ce',
    photo: '#fd3622',
    whatsapp: '#245247',
    book: '#214cc6',
    gray: '#f1f1f1',
    anaglyph: '#3987b4',
    subtle: '#eeeeee',
    kindle: '#dcd8d0',
  };
  if (theme === 'horizon') {
    return document.documentElement.style.getPropertyValue('--sky-highlight').trim() || DEFAULT_COLORS.horizon;
  }
  return (dark && darkColors[theme]) || DEFAULT_COLORS[theme] || DEFAULT_COLORS.base;
}

function getRandomThemeColor() {
  const colors = Array.from(document.querySelectorAll<HTMLOptionElement>('#colors option')).map((op) => op.value);
  const [theme] = store.get('theme').split('-');

  colors.pop();
  const currentIndex = colors.indexOf(theme);
  if (currentIndex >= 0) colors.splice(currentIndex, 1);

  return colors[Math.floor(Math.random() * colors.length)];
}

export function initTheme() {
  let [theme, variant = 'system'] = store.get('theme').split('-');
  const themeSelect = document.querySelector<HTMLSelectElement>('#theme-select');
  const variantSelect = document.querySelector<HTMLSelectElement>('#variant-select');
  const preferDarkThemes = window.matchMedia('(prefers-color-scheme: dark)');
  const colorPickers = document.querySelectorAll<HTMLInputElement>('#color-picker, #settings-color-picker');
  const resetColors = document.querySelectorAll<HTMLButtonElement>('#reset-color, #settings-reset-color');

  if (theme && THEME_FONTS[theme]) {
    THEME_FONTS[theme].forEach((font) => loadFontIfNotExists(font));
  }
  if (themeSelect) {
    themeSelect.value = theme;
  }
  if (variantSelect) {
    variantSelect.value = variant;
  }

  colorPickers.forEach((picker) => {
    picker.value = store.get('color');
  });

  if (theme === 'color') {
    theme = getRandomThemeColor();
  }
  if (variant === 'system') {
    variant = preferDarkThemes.matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = `${theme}-${variant}`;
  refreshDefaultFontLabel();
  refreshLocaleThemeFonts();
  const explicitColor = new URLSearchParams(location.search).has('color');
  followsDefaultColor = explicitColor
    ? store.get('color').toLowerCase() === defaultColor(theme).toLowerCase()
    : store.get('color-default') ??
      (store.get('color') === DEFAULT_COLORS.base ||
        store.get('color').toLowerCase() === defaultColor(theme).toLowerCase());
  if (followsDefaultColor) store.set('color', defaultColor(theme), false);
  store.set('color-default', followsDefaultColor, false);
  applyCustomColor(theme);

  window.addEventListener('resize', doFitQuote);
  themeSelect?.addEventListener('change', () => setTheme());
  variantSelect?.addEventListener('change', () => setTheme({ isVariantChange: true }));
  preferDarkThemes.addEventListener('change', (e) => {
    const [_, variant] = store.get('theme').split('-');

    if (variant === 'system') {
      const theme = document.documentElement.dataset.theme!.split('-')[0];
      const wasDefault = followsDefaultColor;

      store.set('theme', `${store.get('theme').split('-')[0]}-system`);
      document.documentElement.dataset.theme = `${theme}-${e.matches ? 'dark' : 'light'}`;
      refreshDefaultFontLabel();
      refreshLocaleThemeFonts();
      if (wasDefault) {
        store.set('color', defaultColor(theme), false);
        store.removeFromUrl('color');
      }
      applyCustomColor(theme);
    }
  });

  colorPickers.forEach((colorPicker) =>
    colorPicker.addEventListener('input', () => {
      followsDefaultColor = false;
      store.set('color-default', false, false);
      store.set('color', colorPicker.value);
      applyCustomColor(document.documentElement.dataset.theme?.split('-')[0]);
    }),
  );
  resetColors.forEach((resetColor) =>
    resetColor.addEventListener('click', () => {
      const theme = document.documentElement.dataset.theme?.split('-')[0] || 'base';
      followsDefaultColor = true;
      store.set('color-default', true, false);
      const color = defaultColor(theme);
      store.set('color', color, false);
      store.removeFromUrl('color');
      applyCustomColor(theme);
    }),
  );
}

function applyCustomColor(theme = 'base') {
  refreshBackgroundPattern();
  const root = document.documentElement;
  root.dataset.variant = store.get('theme').split('-')[1] || 'system';
  const colorPickers = document.querySelectorAll<HTMLInputElement>('#color-picker, #settings-color-picker');
  const resetColors = document.querySelectorAll<HTMLButtonElement>('#reset-color, #settings-reset-color');
  root.classList.toggle('custom-accent', !followsDefaultColor);
  document.querySelectorAll<HTMLElement>('#color-controls, #settings-color-controls').forEach((controls) => {
    controls.hidden = false;
    controls.closest('.settings-row')?.removeAttribute('hidden');
  });
  if (!followsDefaultColor) root.style.setProperty('--accent-color', store.get('color'));
  else root.style.removeProperty('--accent-color');
  const accent = store.get('color');
  root.style.setProperty('--accent-text', contrastingText(accent));
  if (theme === 'whatsapp' && !followsDefaultColor) {
    root.style.setProperty('--bubble-text', contrastingText(store.get('color')));
  } else {
    root.style.removeProperty('--bubble-text');
  }
  colorPickers.forEach((colorPicker) => {
    colorPicker.value = store.get('color');
    colorPicker.hidden = false;
    colorPicker.disabled = false;
  });
  resetColors.forEach((resetColor) => {
    resetColor.hidden = followsDefaultColor;
  });
}

export function setTheme({ isVariantChange = false, syncToUrl = true } = {}) {
  const p = document.querySelector<HTMLParagraphElement>('blockquote p');

  if (p) {
    p.style.visibility = 'hidden';
  }

  let theme = document.querySelector<HTMLSelectElement>('#theme-select')?.value;
  let variant = document.querySelector<HTMLSelectElement>('#variant-select')?.value;

  if (theme && THEME_FONTS[theme]) {
    THEME_FONTS[theme].forEach((font) => {
      loadFontIfNotExists(font);
    });
  }

  store.set('theme', `${theme}-${variant}`, syncToUrl);

  if (theme === 'color') {
    theme = getRandomThemeColor();
  }

  if (variant === 'system') {
    variant = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  if (theme === 'horizon') {
    setDayParameters();
  }

  if (theme === 'photo' && !isVariantChange) {
    setDynamicBackgroundPicture();
  }

  if (theme !== 'photo') {
    removeBackgroundImage();
  }

  document.documentElement.dataset.theme = `${theme}-${variant}`;
  refreshDefaultFontLabel();
  refreshLocaleThemeFonts();
  if (followsDefaultColor && theme) {
    store.set('color', defaultColor(theme), false);
    store.removeFromUrl('color');
  }
  store.set('color-default', followsDefaultColor, false);
  applyCustomColor(theme);
  fitQuote();

  if (p) {
    setTimeout(() => (p.style.visibility = 'visible'), 50);
  }
}

export function setDynamicBackgroundPicture() {
  const photoOverlay = document.getElementById('photo-overlay');
  const now = new Date();
  const quote = store.get('active-quote');
  const seed = `${now.getFullYear()}${now.getMonth() + 1}${now.getDay()}${quote?.id}${quote?.locale}`;
  let innerHeight = window.innerHeight;
  let innerWidth = window.innerWidth;

  if (innerHeight > 5000) {
    innerHeight = 5000;
  }

  if (innerWidth > 5000) {
    innerWidth = 5000;
  }

  if (photoOverlay && !document.body.style.backgroundImage.includes(seed)) {
    photoOverlay.style.opacity = '1';

    setTimeout(() => {
      if (store.get('theme').includes('photo-')) {
        photoOverlay.style.removeProperty('opacity');
        document.documentElement.style.setProperty(
          '--background-image',
          `url(https://picsum.photos/seed/${seed}/${innerWidth}/${innerHeight}?blur=1)`,
        );
      }
    }, 1000);
  }
}

export function removeBackgroundImage() {
  document.documentElement.style.removeProperty('--background-image');
}
