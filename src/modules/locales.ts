import { updateQuote } from "./quotes";
import {
  initStringSetting,
  setStringSetting,
  updateURL,
} from "../utils/settings";
import TRANSLATIONS from "../strings/translations.json";
import { Locale } from "../types";
import { getTime } from "../utils/utils";

const DOMINANT_LOCALES: Record<string, Locale> = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  it: "it-IT",
  pt: "pt-BR",
} as const;

export function getRandomLocale(): Locale {
  let locales = Object.keys(TRANSLATIONS) as Locale[];

  const blockquote = document.getElementById("quote");

  if (blockquote && blockquote.dataset.locale) {
    locales = locales.filter((locale) => locale !== blockquote.dataset.locale);
  }

  return locales[Math.floor(Math.random() * locales.length)];
}

export function resolveLocale(locale = navigator.language): Locale | "random" {
  if (locale === "random") {
    return locale;
  }

  if (locale.length === 2) {
    locale = DOMINANT_LOCALES[locale];
  }

  if (!TRANSLATIONS[locale as keyof typeof TRANSLATIONS]) {
    locale = DOMINANT_LOCALES[locale.substring(0, 2)];
  }

  if (!TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || !locale) {
    locale = "en-US";
  }

  return locale as Locale;
}

export function initLocale(defaultValue = navigator.language) {
  const locale = resolveLocale(initStringSetting("locale", defaultValue));
  const localeSelect =
    document.querySelector<HTMLSelectElement>("#locale-select");

  setStringSetting("locale", locale);
  translateStrings(locale);
  if (localeSelect) {
    localeSelect.value = locale;
  }

  localeSelect?.addEventListener("change", (e) => {
    const isRandomLocale = (e.target as HTMLInputElement).value === "random";
    const locale = isRandomLocale
      ? "en-US"
      : ((e.target as HTMLInputElement).value as Locale);
    translateStrings(locale);
    setStringSetting("locale", (e.target as HTMLInputElement).value);
    updateURL("locale", (e.target as HTMLInputElement).value);
    updateQuote();
  });
}

function translateStrings(locale = navigator.language) {
  const time = getTime();
  const resolvedLocale = resolveLocale(locale);
  const strings =
    TRANSLATIONS[resolvedLocale === "random" ? "en-US" : resolvedLocale];

  document.documentElement.lang =
    locale === "random" ? "en" : locale.substring(0, 2);
  document.title = `[${time}] ${strings.document_title}`;

  document
    .querySelectorAll<HTMLElement>("[data-text]")
    .forEach(
      (el) =>
        (el.textContent = strings[el.dataset.text as keyof typeof strings])
    );

  document
    .querySelectorAll<HTMLOptionElement>("[data-label]")
    .forEach(
      (el) => (el.label = strings[el.dataset.label as keyof typeof strings])
    );

  document
    .querySelectorAll<HTMLElement>("[data-title]")
    .forEach(
      (el) => (el.title = strings[el.dataset.title as keyof typeof strings])
    );
}
