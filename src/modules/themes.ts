import { THEME_FONTS, resetFont } from './font';
import { doFitQuote, fitQuote, loadFontIfNotExists } from '../utils';
import { setDayParameters } from './horizon';
import { store } from '../store';
import { contrastingText } from '../utils/colors';

// Skins in this list use their colour as part of their visual identity.
const NON_CUSTOMIZABLE_COLORS = new Set(['pink', 'green', 'orange', 'purple', 'blue', 'gray']);
const CUSTOMIZABLE_THEMES = new Set(['base', 'retro', 'elegant', 'festive', 'bohemian', 'book', 'handwriting', 'terminal', 'frame', 'poster', 'photo', 'whatsapp']);
const DEFAULT_COLORS: Record<string, string> = {
  base: '#d24335',
  retro: '#daa908',
  elegant: '#9f5bd5',
  festive: '#e74c3c',
  bohemian: '#1abc9c',
  book: '#fbf719',
  handwriting: '#077fc6',
  terminal: '#ac7f02',
  frame: '#00b9c4',
  poster: '#fd4533',
  photo: '#e33725',
  whatsapp: '#e1ffc7',
};

// Non-customizable skins must not reinterpret the last editable skin's color.
let followsDefaultColor = true;

function defaultColor(theme: string) {
  const dark = document.documentElement.dataset.theme?.endsWith('-dark');
  const darkColors: Record<string, string> = { retro: '#f1ba08', terminal: '#1bec1b', frame: '#00c4ce', photo: '#fd3622', whatsapp: '#245247', book: '#d9bd61' };
  return (dark && darkColors[theme]) || DEFAULT_COLORS[theme] || DEFAULT_COLORS.base;
}

function getRandomThemeColor() {
  const colors = Array.from(document.querySelectorAll<HTMLOptionElement>('#colors option')).map((op) => op.value);
  const [theme] = store.get('theme').split('-');

  colors.pop();
  colors.splice(colors.indexOf(theme), 1);

  return colors[Math.floor(Math.random() * colors.length)];
}

export function initTheme() {
  let [theme, variant = 'system'] = store.get('theme').split('-');
  const themeSelect = document.querySelector<HTMLSelectElement>('#theme-select');
  const variantSelect = document.querySelector<HTMLSelectElement>('#variant-select');
  const preferDarkThemes = window.matchMedia('(prefers-color-scheme: dark)');
  const colorPicker = document.querySelector<HTMLInputElement>('#color-picker');
  const resetColor = document.querySelector<HTMLButtonElement>('#reset-color');

  if (theme && THEME_FONTS[theme]) {
    THEME_FONTS[theme].forEach((font) => loadFontIfNotExists(font));
  }
  if (themeSelect) {
    themeSelect.value = theme;
  }
  if (variantSelect) {
    variantSelect.value = variant;
  }

  if (colorPicker) colorPicker.value = store.get('color');

  if (theme === 'color') {
    theme = getRandomThemeColor();
  }
  if (variant === 'system') {
    variant = preferDarkThemes.matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = `${theme}-${variant}`;
  followsDefaultColor = store.get('color').toLowerCase() === defaultColor(theme).toLowerCase();
  applyCustomColor(theme);

  window.addEventListener('resize', doFitQuote);
  themeSelect?.addEventListener('change', () => setTheme());
  variantSelect?.addEventListener('change', () => setTheme({ isVariantChange: true }));
  preferDarkThemes.addEventListener('change', (e) => {
    const [_, variant] = store.get('theme').split('-');

    if (variant === 'system') {
      const [theme] = store.get('theme').split('-');
      const wasDefault = store.get('color').toLowerCase() === defaultColor(theme).toLowerCase();

      store.set('theme', `${theme}-system`);
      document.documentElement.dataset.theme = `${theme}-${e.matches ? 'dark' : 'light'}`;
      if (wasDefault && CUSTOMIZABLE_THEMES.has(theme)) store.set('color', defaultColor(theme));
      applyCustomColor(theme);
    }
  });

  colorPicker?.addEventListener('input', () => {
    store.set('color', colorPicker.value);
    applyCustomColor(themeSelect?.value || 'base');
  });
  resetColor?.addEventListener('click', () => {
    const theme = themeSelect?.value || 'base';
    const color = defaultColor(theme);
    store.set('color', color);
    if (colorPicker) colorPicker.value = color;
    applyCustomColor(theme);
  });
}

function applyCustomColor(theme = 'base') {
  const root = document.documentElement;
  root.dataset.variant = store.get('theme').split('-')[1] || 'system';
  const colorPicker = document.querySelector<HTMLInputElement>('#color-picker');
  const resetColor = document.querySelector<HTMLButtonElement>('#reset-color');
  const customizable = CUSTOMIZABLE_THEMES.has(theme) && !NON_CUSTOMIZABLE_COLORS.has(theme) && !store.get('theme').startsWith('color-');
  root.classList.toggle('custom-accent', customizable);
  const controls = document.getElementById('color-controls');
  if (controls) controls.hidden = !customizable;
  if (customizable) root.style.setProperty('--accent-color', store.get('color'));
  else root.style.removeProperty('--accent-color');
  if (theme === 'whatsapp' && customizable) {
    root.style.setProperty('--bubble-text', contrastingText(store.get('color')));
  } else {
    root.style.removeProperty('--bubble-text');
  }
  if (colorPicker) {
    colorPicker.value = store.get('color');
    colorPicker.hidden = !customizable;
    colorPicker.disabled = !customizable;
  }
  if (resetColor) resetColor.hidden = !customizable || store.get('color') === defaultColor(theme);
}

export function setTheme({ isVariantChange = false, syncToUrl = true } = {}) {
  const previousTheme = store.get('theme').split('-')[0];
  if (CUSTOMIZABLE_THEMES.has(previousTheme)) {
    followsDefaultColor = store.get('color').toLowerCase() === defaultColor(previousTheme).toLowerCase();
  }
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
    resetFont();
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
  if (followsDefaultColor && theme && CUSTOMIZABLE_THEMES.has(theme) && !store.get('theme').startsWith('color-')) {
    store.set('color', defaultColor(theme), syncToUrl);
  }
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
