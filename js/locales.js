import { updateQuote } from "./quotes.js";
import { initStringSetting, setStringSetting, updateURL } from "./settings.js";
import TRANSLATIONS from "./translations.js";
import { getTime } from "./utils.js";

const DOMINANT_LOCALES = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  it: "it-IT",
  pt: "pt-BR",
};

export function getRandomLocale() {
  let locales = Object.keys(TRANSLATIONS);

  const blockquote = document.getElementById("quote");

  if (blockquote && blockquote.dataset.locale) {
    locales = locales.filter((locale) => locale !== blockquote.dataset.locale);
  }

  return locales[Math.floor(Math.random() * locales.length)];
}

function resolveLocale(locale = navigator.language) {
  if (locale === "random") {
    return locale;
  }

  if (locale.length === 2) {
    locale = DOMINANT_LOCALES[locale];
  }

  if (!TRANSLATIONS[locale]) {
    locale = DOMINANT_LOCALES[locale.substring(0, 2)];
  }

  if (!TRANSLATIONS[locale] || !locale) {
    locale = "en-US";
  }

  return locale;
}

export function initLocale(defaultValue = navigator.language) {
  const locale = resolveLocale(initStringSetting("locale", defaultValue));
  const localeSelect = document.getElementById("locale-select");

  setStringSetting("locale", locale);
  translateStrings(locale);
  localeSelect.value = locale;

  localeSelect.addEventListener("change", (e) => {
    const isRandomLocale = e.target.value === "random";
    const locale = isRandomLocale ? "en-US" : e.target.value;
    translateStrings(locale);
    setStringSetting("locale", e.target.value);
    updateURL("locale", e.target.value);
    updateQuote();
  });
}

function translateStrings(locale = navigator.language) {
  const time = getTime();
  const strings = TRANSLATIONS[resolveLocale(locale)] || TRANSLATIONS["en-US"];

  document.documentElement.lang =
    locale === "random" ? "en" : locale.substring(0, 2);
  document.title = `[${time}] ${strings.document_title}`;

  document
    .querySelectorAll("[data-text]")
    .forEach((el) => (el.textContent = strings[el.dataset.text]));

  document
    .querySelectorAll("[data-label]")
    .forEach((el) => (el.label = strings[el.dataset.label]));

  document
    .querySelectorAll("[data-title]")
    .forEach((el) => (el.title = strings[el.dataset.title]));
}
