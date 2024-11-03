import { updateQuote } from './quotes';
import TRANSLATIONS from '../strings/translations.json';
import { Locale } from '../types';
import { getTime } from '../utils';
import { Translations } from '../types';
import { store } from '../store';

const DOMINANT_LOCALES: Record<string, Locale> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
  pt: 'pt-BR',
  de: 'de-DE',
} as const;

export function getRandomLocale(): Locale {
  let locales = Object.keys(TRANSLATIONS) as Locale[];

  const blockquote = document.getElementById('quote');

  if (blockquote && blockquote.dataset.locale) {
    locales = locales.filter((locale) => locale !== blockquote.dataset.locale);
  }

  return locales[Math.floor(Math.random() * locales.length)];
}

export function resolveLocale(locale = navigator.language): Locale | 'random' {
  if (locale === 'random') {
    return locale;
  }

  if (locale.length === 2) {
    locale = DOMINANT_LOCALES[locale];
  }

  if (!TRANSLATIONS[locale as keyof typeof TRANSLATIONS]) {
    locale = DOMINANT_LOCALES[locale.substring(0, 2)];
  }

  if (!TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || !locale) {
    locale = 'en-US';
  }

  return locale as Locale;
}

export function initLocale() {
  const locale = store.get('locale') as Locale | 'random';
  const localeSelect = document.querySelector<HTMLSelectElement>('#locale-select');

  if (locale !== 'random') {
    store.set('last-locale', locale);
  }

  translateStrings(locale);
  if (localeSelect) {
    localeSelect.value = locale;
  }

  localeSelect?.addEventListener('change', (e) => {
    const languageSelectValue = (e.target as HTMLInputElement).value as Locale | 'random';
    const isRandomLocale = languageSelectValue === 'random';
    const locale: Locale = isRandomLocale ? store.get('last-locale') : (languageSelectValue as Locale);
    translateStrings(locale);
    store.set('locale', languageSelectValue);

    if (!isRandomLocale) {
      store.set('last-locale', languageSelectValue);
      updateQuote({ useIndex: true });
    }
  });
}

export function getStrings(locale: Locale | 'random'): Translations {
  const resolvedLocale = resolveLocale(locale);
  const lastLocale = store.get('last-locale') as keyof typeof TRANSLATIONS;

  return TRANSLATIONS[resolvedLocale === 'random' ? lastLocale : resolvedLocale];
}

function translateStrings(locale: Locale | 'random') {
  const time = getTime();
  const lastLocale = store.get('last-locale') as keyof typeof TRANSLATIONS;
  const strings = getStrings(locale);

  document.documentElement.lang = locale === 'random' ? lastLocale?.substring(0, 2) || 'en' : locale.substring(0, 2);
  document.title = `${time} - ${strings.document_title}`;

  document
    .querySelectorAll<HTMLElement>('[data-text]')
    .forEach((el) => (el.textContent = strings[el.dataset.text as keyof typeof strings]));

  document
    .querySelectorAll<HTMLOptionElement>('[data-label]')
    .forEach((el) => (el.label = strings[el.dataset.label as keyof typeof strings]));

  document
    .querySelectorAll<HTMLElement>('[data-title]')
    .forEach((el) => (el.title = strings[el.dataset.title as keyof typeof strings]));
}
