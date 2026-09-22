import { updateQuote } from './quotes';
import TRANSLATIONS from '../strings/translations.json';
import COLOR_CONTROLS from '../strings/colorControls.json';
import { BaseLocale, Locale } from '../types';
import { getLiveTime } from '../utils';
import { Translations } from '../types';
import { store } from '../store';

export const DOMINANT_LOCALES: Record<string, Locale> = {
  en: 'en-GB',
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
  pt: 'pt-PT',
  de: 'de-DE',
} as const;

const DRAFT_SUFFIX = '-draft';

export function getBaseLocale(locale: Locale): BaseLocale {
  const base = locale.endsWith(DRAFT_SUFFIX) ? locale.slice(0, -DRAFT_SUFFIX.length) : locale;
  return Object.prototype.hasOwnProperty.call(TRANSLATIONS, base) ? (base as BaseLocale) : 'en-GB';
}

export function getRandomLocale() {
  const locales = Object.keys(TRANSLATIONS) as Locale[];
  const localeQuote = store.get('active-quote')?.locale;

  if (localeQuote) {
    const index = locales.indexOf(localeQuote);
    if (index >= 0) {
      locales.splice(index, 1);
    }
  }

  return locales[Math.floor(Math.random() * locales.length)];
}

export function resolveLocale(locale = navigator.language): Locale {
  const normalized = typeof locale === 'string' ? locale.trim().replace(/_/g, '-').toLowerCase() : '';
  const wantsDraft = normalized.endsWith(DRAFT_SUFFIX);
  const lookup = wantsDraft ? normalized.slice(0, -DRAFT_SUFFIX.length) : normalized;
  const draftMatch = wantsDraft && /^([a-z]{2,3})-([a-z]{2}|[0-9]{3})$/.exec(lookup);
  if (draftMatch) return `${draftMatch[1]}-${draftMatch[2].toUpperCase()}-draft`;
  const locales = Object.keys(TRANSLATIONS) as Locale[];
  const exactLocale = locales.find((supported) => supported.toLowerCase() === lookup);
  const regionalLocale = locales.find((supported) => lookup.startsWith(`${supported.toLowerCase()}-`));

  const resolved = exactLocale || regionalLocale || DOMINANT_LOCALES[lookup.split('-')[0]] || 'en-GB';
  return wantsDraft ? (`${resolved}${DRAFT_SUFFIX}` as Locale) : resolved;
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
      updateQuote({ preserveQuote: true });
    }
  });
  document.querySelector('#random-locale')?.addEventListener('click', () => {
    const isRandomLocale = store.toggle('random-locale');
    if (!isRandomLocale && store.get('locale') !== store.get('active-quote')?.locale) {
      updateQuote({
        preserveQuote: true,
      });
    }
  });
}

export function getStrings(locale: Locale): Translations {
  const resolvedLocale = getBaseLocale(resolveLocale(locale));

  return TRANSLATIONS[resolvedLocale];
}

function translateStrings(locale: Locale) {
  const time = getLiveTime();
  const strings = { ...getStrings(locale), ...COLOR_CONTROLS[getBaseLocale(resolveLocale(locale))] };

  document.documentElement.lang = getBaseLocale(locale);
  document.getElementById('draft-preview-notice')?.remove();
  if (locale.endsWith(DRAFT_SUFFIX)) {
    const notice = document.createElement('aside');
    notice.id = 'draft-preview-notice';
    notice.setAttribute('role', 'status');
    notice.textContent = `Draft preview · ${locale.slice(0, -DRAFT_SUFFIX.length)} · Unreviewed quotes may appear`;
    document.body.appendChild(notice);
  }
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
