import { updatePhotoBackground, clearPhotoBackground } from './photo-background';
import { refreshBackgroundPattern } from './background-patterns';
import { refreshLocaleThemeFonts } from './locale-fonts';
import { THEME_FONTS, refreshDefaultFontLabel } from './font';
import { doFitQuote, fitQuote, loadFontIfNotExists } from '../utils';
import { setDayParameters } from './horizon';
import { store } from '../store';
import { contrastingText } from '../utils/colors';
import { getStrings, getInterfaceLocale } from './locales';
import SETTINGS from '../strings/settings.json';
import { getBaseLocale } from './locales';
import { initColorPalette, rememberThemeColor } from './color-palette';

const DEFAULT_COLORS: Record<string, string> = {
  base: '#d24335',
  red: '#d24335',
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

export function defaultColor(theme: string, dark = document.documentElement.dataset.theme?.endsWith('-dark')) {
  const darkColors: Record<string, string> = {
    retro: '#f1ba08',
    terminal: '#1bec1b',
    frame: '#00c4ce',
    photo: '#fd3622',
    whatsapp: '#245247',
    book: '#214cc6',
    anaglyph: '#3987b4',
    subtle: '#eeeeee',
    kindle: '#dcd8d0',
  };
  if (theme === 'horizon') {
    return document.documentElement.style.getPropertyValue('--sky-highlight').trim() || DEFAULT_COLORS.horizon;
  }
  return (dark && darkColors[theme]) || DEFAULT_COLORS[theme] || DEFAULT_COLORS.base;
}

export function initTheme() {
  const [theme, savedVariant = 'system'] = store.get('theme').split('-');
  let variant = savedVariant;
  const themeSelect = document.querySelector<HTMLSelectElement>('#theme-select');
  const variantSelect = document.querySelector<HTMLSelectElement>('#variant-select');
  const preferDarkThemes = window.matchMedia('(prefers-color-scheme: dark)');
  const schemeToggle = document.getElementById('scheme-toggle');
  const updateSchemeToggle = () => {
    if (!schemeToggle) return;
    const scheme = store.get('theme').split('-')[1] || 'system';
    const locale = getInterfaceLocale();
    const label = `${SETTINGS[getBaseLocale(locale)].settings_scheme}: ${getStrings(locale)[scheme as 'system' | 'light' | 'dark']}`;
    schemeToggle.title = label;
    schemeToggle.setAttribute('aria-label', label);
  };
  schemeToggle?.addEventListener('click', () => {
    if (!variantSelect) return;
    const schemes = ['system', 'light', 'dark'];
    variantSelect.value = schemes[(schemes.indexOf(store.get('theme').split('-')[1] || 'system') + 1) % schemes.length];
    variantSelect.dispatchEvent(new Event('change', { bubbles: true }));
  });
  store.subscribe(updateSchemeToggle);
  updateSchemeToggle();

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

  if (variant === 'system') {
    variant = preferDarkThemes.matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = `${theme}-${variant}`;
  refreshDefaultFontLabel();
  refreshLocaleThemeFonts();
  const explicitColor = new URLSearchParams(location.search).has('color');
  const savedCustom = store.get('custom-color');
  followsDefaultColor =
    !savedCustom &&
    (store.get('color').toLowerCase() === defaultColor(theme).toLowerCase() ||
      (!explicitColor && store.get('color') === DEFAULT_COLORS.base));
  if (explicitColor && store.get('color').toLowerCase() !== defaultColor(theme).toLowerCase()) {
    store.set('custom-color', store.get('color'), false);
    followsDefaultColor = false;
  } else if (!savedCustom && !followsDefaultColor) store.set('custom-color', store.get('color'), false);
  if (followsDefaultColor) store.set('color', defaultColor(theme), false);
  else if (savedCustom && !explicitColor) store.set('color', savedCustom, false);
  applyCustomColor(theme);
  initColorPalette();

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
      store.set('palette', 'default');
      followsDefaultColor = false;
      store.set('custom-color', colorPicker.value, false);
      store.set('color', colorPicker.value);
      rememberThemeColor();
      applyCustomColor(document.documentElement.dataset.theme?.split('-')[0]);
    }),
  );
  resetColors.forEach((resetColor) =>
    resetColor.addEventListener('click', () => {
      const theme = document.documentElement.dataset.theme?.split('-')[0] || 'base';
      followsDefaultColor = true;
      store.set('palette', 'default');
      store.set('custom-color', '', false);
      const color = defaultColor(theme);
      store.set('color', color, false);
      store.removeFromUrl('color');
      rememberThemeColor();
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
  const palette = store.get('palette');
  const previous = root.dataset.accentPalette;
  const presets = ['red', 'pink', 'green', 'orange', 'purple', 'blue', 'gray'];
  const selected =
    palette === 'random'
      ? previous && presets.includes(previous)
        ? previous
        : presets[Math.floor(Math.random() * presets.length)]
      : palette;
  root.dataset.accentPalette = selected;
  root.dataset.palette = theme === 'base' ? selected : 'default';
  if (palette !== 'default') {
    followsDefaultColor = false;
    store.set('custom-color', '', false);
    if (store.get('color') !== defaultColor(selected)) store.set('color', defaultColor(selected), false);
    store.removeFromUrl('color');
  }
  const editable = true;
  const custom = editable && !followsDefaultColor && !(theme === 'base' && palette !== 'default');
  root.classList.toggle('custom-accent', custom);
  document.querySelectorAll<HTMLElement>('#color-controls, #settings-color-controls').forEach((controls) => {
    controls.hidden = false;
    controls.closest('.settings-row')?.removeAttribute('hidden');
  });
  if (custom) root.style.setProperty('--accent-color', store.get('color'));
  else root.style.removeProperty('--accent-color');
  const accent = store.get('color');
  root.style.setProperty('--accent-text', contrastingText(accent));
  if (theme === 'whatsapp' && custom) {
    root.style.setProperty('--bubble-text', contrastingText(store.get('color')));
  } else {
    root.style.removeProperty('--bubble-text');
  }
  colorPickers.forEach((colorPicker) => {
    colorPicker.value = store.get('color');
    colorPicker.hidden = false;
    colorPicker.disabled = !editable;
  });
  resetColors.forEach((resetColor) => {
    resetColor.hidden = !editable || followsDefaultColor;
    resetColor.disabled = !editable;
  });
}

export function setTheme({ isVariantChange = false, syncToUrl = true } = {}) {
  const previousTheme = store.get('theme').split('-')[0];
  const p = document.querySelector<HTMLParagraphElement>('blockquote p');

  if (p) {
    p.style.visibility = 'hidden';
  }

  const theme = document.querySelector<HTMLSelectElement>('#theme-select')?.value;
  let variant = document.querySelector<HTMLSelectElement>('#variant-select')?.value;

  if (theme && THEME_FONTS[theme]) {
    THEME_FONTS[theme].forEach((font) => {
      loadFontIfNotExists(font);
    });
  }

  if (theme && theme !== previousTheme && !isVariantChange) {
    rememberThemeColor();
    followsDefaultColor = !store.get('custom-color') && store.get('palette') === 'default';
  }
  store.set('theme', `${theme}-${variant}`, syncToUrl);
  if (store.get('palette') === 'random' && !isVariantChange) {
    const choices = ['red', 'pink', 'green', 'orange', 'purple', 'blue', 'gray'].filter(
      (palette) => palette !== document.documentElement.dataset.accentPalette,
    );
    document.documentElement.dataset.accentPalette = choices[Math.floor(Math.random() * choices.length)];
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
  } else if (store.get('custom-color')) store.set('color', store.get('custom-color'), syncToUrl);
  applyCustomColor(theme);
  fitQuote();

  if (p) {
    setTimeout(() => (p.style.visibility = 'visible'), 50);
  }
}

export function setDynamicBackgroundPicture() {
  updatePhotoBackground();
}

export function removeBackgroundImage() {
  clearPhotoBackground();
}
