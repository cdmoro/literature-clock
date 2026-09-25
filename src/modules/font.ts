import { fitQuote, loadFontIfNotExists } from '../utils';
import { store } from '../store';
import { loadGoogleFont, normalizeFontName } from '../utils/google-font';
import { getBaseLocale, getInterfaceLocale } from './locales';
import SETTINGS from '../strings/settings.json';

export const THEME_FONTS: Record<string, string[]> = {
  retro: ['VT323'],
  elegant: ['Playfair Display'],
  festive: ['Borel'],
  bohemian: ['Comfortaa'],
  book: ['Libre Baskerville'],
  handwriting: ['Reenie Beanie'],
  anaglyph: ['Anton'],
  whatsapp: ['Roboto'],
  terminal: ['B612 Mono'],
  frame: ['Playfair Display'],
  subtle: ['Unna'],
  poster: ['Averia Serif Libre', 'Allura'],
  horizon: ['Unna'],
  photo: ['Abril Fatface'],
  kindle: ['Noto Serif'],
};

export const INITIAL_THEME_FONT_SIZE = {
  handwriting: 90,
  whatsapp: 45,
  retro: 70,
  frame: 40,
  subtle: 60,
  poster: 35,
  book: 42,
} as const;

export const CITE_FACTOR = {
  kindle: 0.5,
} as const;

const FONTS = ['Special Elite', ...new Set(Object.values(THEME_FONTS).flat())];
let fontRequest = 0;
const CSS_FONT_VARIABLE = '--override-quote-font-family';

function createOption(value: string) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = value;

  return option;
}

export function initFont() {
  const font = store.get('font');
  const fontSelect = document.querySelector<HTMLSelectElement>('#font-select');

  FONTS.forEach((fontName) => {
    fontSelect?.appendChild(createOption(fontName));
  });

  if (fontSelect && FONTS.includes(font)) fontSelect.value = font;
  if (font !== 'default' && !FONTS.includes(font)) {
    const input = document.querySelector<HTMLInputElement>('#custom-font-name');
    if (input) input.value = font;
    void applyCustomFont(font);
  } else if (font !== 'default') {
    loadFontIfNotExists(font);
    document.documentElement.style.setProperty(CSS_FONT_VARIABLE, `"${font}", var(--quote-font-family)`);
  }

  fontSelect?.addEventListener('change', setFont);
  document.getElementById('custom-font-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void applyCustomFont(document.querySelector<HTMLInputElement>('#custom-font-name')?.value || '');
  });
}

function fontStatus(key?: 'settings_font_loading' | 'settings_font_error') {
  const status = document.getElementById('custom-font-status');
  if (!status) return;
  if (key) {
    status.dataset.text = key;
    status.textContent = SETTINGS[getBaseLocale(getInterfaceLocale())][key];
  } else {
    delete status.dataset.text;
    status.textContent = '';
  }
}

export async function applyCustomFont(value: string) {
  const request = ++fontRequest;
  const name = normalizeFontName(value);
  if (!name) {
    resetFont();
    if (value.trim()) fontStatus('settings_font_error');
    return;
  }
  fontStatus('settings_font_loading');
  try {
    await loadGoogleFont(name);
    if (request !== fontRequest) return;
    const select = document.querySelector<HTMLSelectElement>('#font-select');
    if (select && !Array.from(select.options).some((option) => option.value === name)) {
      select.append(createOption(name));
    }
    if (select) select.value = name;
    document.documentElement.style.setProperty(CSS_FONT_VARIABLE, `"${name}", var(--quote-font-family)`);
    store.set('font', name);
    store.set('custom-font', name, false);
    fontStatus();
    fitQuote();
  } catch {
    if (request !== fontRequest) return;
    resetFont();
    fontStatus('settings_font_error');
  }
}

function setFont() {
  const fontSelect = document.querySelector<HTMLSelectElement>('#font-select');
  const font = fontSelect?.value;
  const root = document.querySelector<HTMLElement>(':root');
  if (font && font !== 'default' && !FONTS.includes(font)) {
    void applyCustomFont(font);
    return;
  }
  fontRequest++;
  fontStatus();

  if (font) {
    store.set('font', font);

    if (font === 'default') {
      root?.style.removeProperty(CSS_FONT_VARIABLE);
    } else {
      loadFontIfNotExists(font);
      root?.style.setProperty(CSS_FONT_VARIABLE, `${font}, sans-serif`);
    }
  }

  fitQuote();
}

export function resetFont() {
  fontRequest++;
  fontStatus();
  const root = document.querySelector<HTMLElement>(':root');
  const fontSelect = document.querySelector<HTMLSelectElement>('#font-select');

  root?.style.removeProperty(CSS_FONT_VARIABLE);
  if (fontSelect) {
    fontSelect.value = 'default';
  }
  store.set('font', 'default');
  fitQuote();
}
