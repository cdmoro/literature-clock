import { updateQuote } from './quotes';
import TRANSLATIONS from '../strings/translations.json';
import COLOR_CONTROLS from '../strings/colorControls.json';
import { Locale } from '../types';
import { getTime } from '../utils';
import { Translations } from '../types';
import { store } from '../store';

export const DOMINANT_LOCALES: Record<string, Locale> = {
  en: 'en-UK',
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
  pt: 'pt-PT',
  de: 'de-DE',
} as const;

export function getRandomLocale() {
  const locales = Object.keys(TRANSLATIONS) as Locale[];
  const localeQuote = store.get('active-quote')?.locale;

  if (localeQuote) {
    locales.splice(locales.indexOf(localeQuote), 1);
  }

  return locales[Math.floor(Math.random() * locales.length)];
}

export function resolveLocale(locale = navigator.language): Locale {
  const normalized = typeof locale === 'string' ? locale.trim().replace(/_/g, '-').toLowerCase() : '';
  // Browsers use en-GB; en-UK is the project's British English identifier.
  if (normalized === 'en-gb' || normalized.startsWith('en-gb-')) {
    return 'en-UK';
  }

  const locales = Object.keys(TRANSLATIONS) as Locale[];
  const exactLocale = locales.find((supported) => supported.toLowerCase() === normalized);
  const regionalLocale = locales.find((supported) => normalized.startsWith(`${supported.toLowerCase()}-`));

  return exactLocale || regionalLocale || DOMINANT_LOCALES[normalized.split('-')[0]] || 'en-UK';
}

export function initLocale() {
  const locale = store.get('locale');
  const localeSelect = document.querySelector<HTMLSelectElement>('#locale-select');

  if (localeSelect) {
    localeSelect.value = locale;
  }

  translateStrings(locale);

  localeSelect?.addEventListener('change', (e) => {
    const locale = (e.target as HTMLInputElement).value as Locale;
    translateStrings(locale);
    store.set('locale', locale);

    if (!store.get('random-locale')) {
      updateQuote({ useIndex: true });
    }
  });
  document.querySelector('#random-locale')?.addEventListener('click', () => {
    const isRandomLocale = store.toggle('random-locale');
    if (!isRandomLocale && store.get('locale') !== store.get('active-quote')?.locale) {
      updateQuote({
        useIndex: true,
      });
    }
  });
}

export function getStrings(locale: Locale): Translations {
  const resolvedLocale = resolveLocale(locale);

  return TRANSLATIONS[resolvedLocale];
}

function translateStrings(locale: Locale) {
  const time = getTime();
  const strings = { ...getStrings(locale), ...COLOR_CONTROLS[resolveLocale(locale)] };

  document.documentElement.lang = locale === 'en-UK' ? 'en-GB' : locale;
  document.title = `${time} - ${strings.document_title}`;

  document
    .querySelectorAll<HTMLElement>('[data-text]')
    .forEach((el) => (el.textContent = strings[el.dataset.text as keyof Translations]));

  document
    .querySelectorAll<HTMLOptionElement>('[data-label]')
    .forEach((el) => (el.label = strings[el.dataset.label as keyof Translations]));

  document
    .querySelectorAll<HTMLElement>('[data-title]')
    .forEach((el) => (el.title = strings[el.dataset.title as keyof typeof strings]));

  document.querySelectorAll<HTMLElement>('[data-aria-label]').forEach((el) => {
    el.setAttribute('aria-label', strings[el.dataset.ariaLabel as keyof typeof strings]);
  });
}
