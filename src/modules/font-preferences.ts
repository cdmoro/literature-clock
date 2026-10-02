import COVERAGE from '../font-coverage.json';
import { normalizeFontName } from '../utils/google-font';

export const FONT_PREFERENCES_KEY = 'font-preferences';
let choices: Record<string, string> = {};
let sharedChoice = 'default';
const language = (locale: string) => locale.split('-')[0].toLowerCase();

// Verified alphabet coverage, not a guarantee for every character in a book.
// User-supplied families without coverage records remain explicitly unverified.
export function fontSupportsLocale(font: string, locale: string): boolean | undefined {
  if (!Object.prototype.hasOwnProperty.call(COVERAGE, font)) return undefined;
  const record = (COVERAGE as Record<string, { languages: string[] }>)[font];
  return record ? record.languages.includes(language(locale)) : undefined;
}

function persist() {
  try {
    localStorage.setItem(FONT_PREFERENCES_KEY, JSON.stringify({ choices, sharedChoice }));
  } catch {
    // Choices still work in memory when browser storage is unavailable.
  }
}

export function initFontPreferences(font: string, locale: string) {
  choices = {};
  sharedChoice = 'default';
  try {
    const saved = JSON.parse(localStorage.getItem(FONT_PREFERENCES_KEY) || 'null');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      if (normalizeFontName(saved.sharedChoice || '')) sharedChoice = saved.sharedChoice;
      if (saved.choices && typeof saved.choices === 'object' && !Array.isArray(saved.choices)) {
        for (const [key, value] of Object.entries(saved.choices)) {
          if (/^[a-z]{2,3}$/.test(key) && typeof value === 'string' && normalizeFontName(value)) choices[key] = value;
        }
      }
    }
  } catch {
    // Ignore malformed preferences, preserving the legacy current font below.
  }
  if (new URLSearchParams(location.search).has('font') || (!Object.keys(choices).length && font !== 'default')) {
    rememberFont(font, locale);
  }
}

export function preferredFont(locale: string) {
  return choices[language(locale)] ?? sharedChoice;
}

export function effectiveFont(locale: string) {
  const font = preferredFont(locale);
  return font !== 'default' && fontSupportsLocale(font, locale) !== false ? font : 'default';
}

export function rememberFont(font: string, locale: string) {
  choices[language(locale)] = font;
  sharedChoice = font;
  persist();
}

export function forgetFont(font: string) {
  for (const key of Object.keys(choices)) if (choices[key] === font) choices[key] = 'default';
  if (sharedChoice === font) sharedChoice = 'default';
  persist();
}
