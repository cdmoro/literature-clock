import { fitQuote } from '../utils';
import { store } from '../store';
import { initFontPicker } from './font-picker';
import { loadGoogleFont, normalizeFontName } from '../utils/google-font';
import { getBaseLocale, getInterfaceLocale, getStrings } from './locales';
import { getDefaultFontName, refreshLocaleThemeFonts } from './locale-fonts';
import SETTINGS from '../strings/settings.json';
import {
  effectiveFont,
  preferredFont,
  fontSupportsLocale,
  initFontPreferences,
  rememberFont,
  forgetFont,
} from './font-preferences';

export { THEME_FONTS } from './font-catalogue';
import { THEME_FONTS, LOCALE_THEME_FONTS } from './font-catalogue';

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
  poster: 1.05,
  kindle: 0.5,
} as const;

const FONTS = [
  'Special Elite',
  ...new Set([...Object.values(THEME_FONTS).flat(), ...Object.values(LOCALE_THEME_FONTS).flatMap(Object.values)]),
];
let fontRequest = 0;
const CSS_FONT_VARIABLE = '--override-quote-font-family';
export const CUSTOM_FONTS_KEY = 'custom-fonts';
let customFonts: string[] = [];
let activeLanguage = '';
const passageLocale = () => document.getElementById('quote')?.lang || store.get('locale');
const loadedFonts = new Set<string>();

function suggestedFonts(locale: string) {
  const language = locale.split('-')[0].toLowerCase();
  return new Set([
    'Special Elite',
    ...Object.values(THEME_FONTS).flat(),
    ...Object.values(LOCALE_THEME_FONTS).flatMap((fonts) => (fonts[language] ? [fonts[language]] : [])),
  ]);
}

function readCustomFonts(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CUSTOM_FONTS_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    const names: string[] = [];
    for (const item of value) {
      const name = typeof item === 'string' ? normalizeFontName(item) : undefined;
      if (name && !names.some((existing) => existing.toLowerCase() === name.toLowerCase())) names.push(name);
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
    const strings = SETTINGS[getBaseLocale(getInterfaceLocale())];
    const support = fontSupportsLocale(value, passageLocale());
    const coverage =
      support === undefined
        ? `, ${strings.settings_font_unverified_label}`
        : support === false
          ? `, ${strings.settings_font_incompatible_label}`
          : '';
    option.textContent = `${value} (${strings.settings_font_custom_label}${coverage})`;
  } else option.textContent = value;
  return option;
}

function refreshRemovalButton() {
  const name = preferredFont(passageLocale());
  const reset = document.getElementById('reset-font');
  if (reset) {
    reset.hidden = name === 'default';
    reset.title = getStrings(getInterfaceLocale()).default_font;
    reset.setAttribute('aria-label', reset.title);
  }
  const button = document.getElementById('remove-custom-font');
  button?.toggleAttribute('hidden', !customFonts.includes(name));
  if (button) {
    delete button.dataset.title;
    delete button.dataset.ariaLabel;
    const label = `${SETTINGS[getBaseLocale(getInterfaceLocale())].settings_font_remove}: ${name}`;
    button.title = label;
    button.setAttribute('aria-label', label);
  }
}

export function refreshDefaultFontLabel() {
  const select = document.querySelector<HTMLSelectElement>('#font-select');
  if (!select) return;
  const option = select.querySelector<HTMLOptionElement>('option[value="default"]');
  if (!option) return;
  const theme = (document.documentElement.dataset.theme || store.get('theme')).split('-')[0];
  const locale = passageLocale();
  const language = locale.split('-')[0];
  if (activeLanguage !== language) {
    activeLanguage = language;
    fontRequest++;
    fontStatus();
  }
  const name = getDefaultFontName(theme, locale);
  option.dataset.previewFont = name;
  option.textContent = `${getStrings(getInterfaceLocale()).default_font} (${name})`;
  select.querySelectorAll('option:not([value="default"])').forEach((item) => item.remove());
  const suggestions = suggestedFonts(locale);
  [
    ...new Set([
      ...FONTS.filter((font) => suggestions.has(font) && fontSupportsLocale(font, locale) === true),
      ...customFonts,
    ]),
  ].forEach((font) => {
    const item = createOption(font);
    item.disabled = fontSupportsLocale(font, locale) === false;
    select.append(item);
  });
  const font = effectiveFont(locale);
  if (font !== 'default' && !select.querySelector<HTMLOptionElement>(`option[value="${font}"]`)) {
    select.append(createOption(font));
  }
  select.value = font;
  if (font === 'default') document.documentElement.style.removeProperty(CSS_FONT_VARIABLE);
  else document.documentElement.style.setProperty(CSS_FONT_VARIABLE, `"${font}", var(--quote-font-family)`);
  if (store.get('font') !== font) store.set('font', font);
  refreshLocaleThemeFonts();
  refreshRemovalButton();
  if (font !== 'default' && fontSupportsLocale(font, locale) === undefined) fontStatus('settings_font_unverified');
  else if (preferredFont(locale) !== 'default' && font === 'default') fontStatus('settings_font_fallback');
  else if (
    ['settings_font_unverified', 'settings_font_fallback'].includes(
      document.getElementById('custom-font-status')?.dataset.text || '',
    )
  )
    fontStatus();
}

export function initFont() {
  fontRequest++;
  loadedFonts.clear();
  customFonts = readCustomFonts();
  const legacyFont = store.get('font');
  initFontPreferences(legacyFont, passageLocale());
  activeLanguage = '';
  const font = preferredFont(passageLocale());
  const select = document.querySelector<HTMLSelectElement>('#font-select');
  // Keep the translated automatic option; choices follow the displayed passage.
  select?.querySelectorAll('option:not([value="default"])').forEach((option) => option.remove());
  refreshDefaultFontLabel();
  if (font !== 'default') void applyCustomFont(font, true);
  select?.addEventListener('change', () => {
    if (select.value === 'default') resetFont();
    else void applyCustomFont(select.value, true);
  });
  document.getElementById('custom-font-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = document.querySelector<HTMLInputElement>('#custom-font-name');
    if (!input) return;
    const value = input.value;
    if ((await applyCustomFont(value)) && input.value === value) input.value = '';
  });
  document.getElementById('reset-font')?.addEventListener('click', () => {
    resetFont();
    document.getElementById('font-picker-trigger')?.focus();
  });
  document.getElementById('remove-custom-font')?.addEventListener('click', (event) => {
    event.preventDefault();
    removeCustomFont();
    document.getElementById('font-picker-trigger')?.focus();
  });
  refreshRemovalButton();
  if (select) initFontPicker(select);
}

function fontStatus(
  key?:
    | 'settings_font_loading'
    | 'settings_font_error'
    | 'settings_font_add_error'
    | 'settings_font_unverified'
    | 'settings_font_fallback',
) {
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
  rememberFont(name, passageLocale());
  fontStatus();
  refreshDefaultFontLabel();
  fitQuote();
}

export async function applyCustomFont(value: string, restoreDefaultOnError = false) {
  const request = ++fontRequest;
  const locale = passageLocale();
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
    if (!restoreDefaultOnError && !suggestedFonts(locale).has(name) && !customFonts.includes(name)) {
      customFonts.push(name);
      saveCustomFonts();
    }
    selectFont(name);
    if (!loadedFonts.has(name)) {
      fontStatus('settings_font_loading');
      try {
        await loadGoogleFont(name);
        loadedFonts.add(name);
        if (request === fontRequest) {
          fontStatus();
          fitQuote();
        }
      } catch {
        if (request === fontRequest) fail();
        return;
      }
    }
    return true;
  }
  if (loadedFonts.has(name)) {
    selectFont(name);
    return true;
  }
  fontStatus('settings_font_loading');
  try {
    await loadGoogleFont(name);
    if (request !== fontRequest || passageLocale().split('-')[0].toLowerCase() !== locale.split('-')[0].toLowerCase())
      return;
    loadedFonts.add(name);
    if (!customFonts.includes(name)) {
      customFonts.push(name);
      saveCustomFonts();
      document.querySelector<HTMLSelectElement>('#font-select')?.append(createOption(name));
    }
    selectFont(name);
    return true;
  } catch {
    if (request === fontRequest) fail();
  }
}

export function removeCustomFont() {
  fontRequest++;
  fontStatus();
  const active = preferredFont(passageLocale());
  const removed = customFonts.filter((name) => name === active);
  customFonts = customFonts.filter((name) => !removed.includes(name));
  saveCustomFonts();
  document.querySelectorAll<HTMLOptionElement>('#font-select option').forEach((option) => {
    if (removed.includes(option.value)) option.remove();
  });
  removed.forEach((name) => {
    loadedFonts.delete(name);
    forgetFont(name);
  });
  if (removed.includes(active)) resetFont();
  refreshRemovalButton();
}

export function resetFont() {
  fontRequest++;
  fontStatus();
  rememberFont('default', passageLocale());
  refreshDefaultFontLabel();
  fitQuote();
}
