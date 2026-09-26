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
export const CUSTOM_FONTS_KEY = 'custom-fonts';
let customFonts: string[] = [];
const loadedFonts = new Set<string>();

function readCustomFonts(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CUSTOM_FONTS_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    const names: string[] = [];
    for (const item of value) {
      const name = typeof item === 'string' ? normalizeFontName(item) : undefined;
      if (name && ![...FONTS, ...names].some((existing) => existing.toLowerCase() === name.toLowerCase()))
        names.push(name);
    }
    return names;
  } catch {
    return [];
  }
}

function saveCustomFonts() {
  localStorage.setItem(CUSTOM_FONTS_KEY, JSON.stringify(customFonts));
}

function createOption(value: string) {
  const option = document.createElement('option');
  option.value = value;
  if (customFonts.includes(value)) {
    option.dataset.customFont = '';
    option.textContent = `${value} (${SETTINGS[getBaseLocale(getInterfaceLocale())].settings_font_custom_label})`;
  } else option.textContent = value;
  return option;
}

function refreshRemovalLinks() {
  const selected = customFonts.includes(store.get('font'));
  document.getElementById('remove-custom-font')?.toggleAttribute('hidden', !selected);
  document.getElementById('custom-font-action-separator')?.toggleAttribute('hidden', !selected);
  document.getElementById('remove-all-custom-fonts')?.toggleAttribute('hidden', !customFonts.length);
}

export function initFont() {
  fontRequest++;
  loadedFonts.clear();
  customFonts = readCustomFonts();
  const font = store.get('font');
  const select = document.querySelector<HTMLSelectElement>('#font-select');
  // Keep the translated theme-default option and recreate the catalogue once.
  select?.querySelectorAll('option:not([value="default"])').forEach((option) => option.remove());
  [...FONTS, ...customFonts].forEach((name) => select?.append(createOption(name)));
  if (font !== 'default') void applyCustomFont(font, true);
  else resetFont();
  select?.addEventListener('change', () => {
    if (select.value === 'default') resetFont();
    else void applyCustomFont(select.value, true);
  });
  document.getElementById('custom-font-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void applyCustomFont(document.querySelector<HTMLInputElement>('#custom-font-name')?.value || '');
  });
  document.getElementById('remove-custom-font')?.addEventListener('click', (event) => {
    event.preventDefault();
    removeCustomFonts(false);
  });
  document.getElementById('remove-all-custom-fonts')?.addEventListener('click', (event) => {
    event.preventDefault();
    removeCustomFonts(true);
  });
  refreshRemovalLinks();
}

function fontStatus(key?: 'settings_font_loading' | 'settings_font_error' | 'settings_font_add_error') {
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

function selectFont(name: string) {
  const select = document.querySelector<HTMLSelectElement>('#font-select');
  if (select) select.value = name;
  document.documentElement.style.setProperty(CSS_FONT_VARIABLE, `"${name}", var(--quote-font-family)`);
  store.set('font', name);
  fontStatus();
  refreshRemovalLinks();
  fitQuote();
}

export async function applyCustomFont(value: string, restoreDefaultOnError = false) {
  const request = ++fontRequest;
  const normalized = normalizeFontName(value);
  const fail = () => {
    if (restoreDefaultOnError) resetFont();
    else {
      const select = document.querySelector<HTMLSelectElement>('#font-select');
      if (select) select.value = store.get('font');
    }
    fontStatus(restoreDefaultOnError ? 'settings_font_error' : 'settings_font_add_error');
  };
  if (!normalized) {
    fail();
    return;
  }
  const name = [...FONTS, ...customFonts].find((item) => item.toLowerCase() === normalized.toLowerCase()) || normalized;
  if (FONTS.includes(name)) {
    loadFontIfNotExists(name);
    selectFont(name);
    return;
  }
  if (loadedFonts.has(name)) {
    selectFont(name);
    return;
  }
  fontStatus('settings_font_loading');
  try {
    await loadGoogleFont(name);
    if (request !== fontRequest) return;
    loadedFonts.add(name);
    if (!customFonts.includes(name)) {
      customFonts.push(name);
      saveCustomFonts();
      document.querySelector<HTMLSelectElement>('#font-select')?.append(createOption(name));
    }
    selectFont(name);
  } catch {
    if (request === fontRequest) fail();
  }
}

export function removeCustomFonts(all: boolean) {
  fontRequest++;
  fontStatus();
  const active = store.get('font');
  const removed = all ? [...customFonts] : customFonts.filter((name) => name === active);
  customFonts = customFonts.filter((name) => !removed.includes(name));
  saveCustomFonts();
  document.querySelectorAll<HTMLOptionElement>('#font-select option').forEach((option) => {
    if (removed.includes(option.value)) option.remove();
  });
  removed.forEach((name) => loadedFonts.delete(name));
  if (removed.includes(active)) resetFont();
  refreshRemovalLinks();
}

export function resetFont() {
  fontRequest++;
  fontStatus();
  document.documentElement.style.removeProperty(CSS_FONT_VARIABLE);
  const select = document.querySelector<HTMLSelectElement>('#font-select');
  if (select) select.value = 'default';
  store.set('font', 'default');
  refreshRemovalLinks();
  fitQuote();
}
