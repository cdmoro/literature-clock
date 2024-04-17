import { updateQuote } from "./quotes.js";
import { deleteUrlParamAndRefresh, getStringSetting } from "./settings.js";
import TRANSLATIONS from "./translations.js";
import { getTime } from "./utils.js";

const DOMINANT_LOCALES = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  it: "it-IT",
  pt: "pt-BR",
};

const LABELS = {
  zen: "zen_mode",
  work: "work_mode",
  "add-quote": "add_quote",
  "report-error": "report_error",
  project: "project",
  "made-by": "made_by",
  language: "language",
  theme: "theme",
};

const TITLE_ATTR = {
  zen: "zen_mode_title",
  work: "work_mode_title",
  "exit-zen": "exit_zen_title",
};

export function getRandomLocale() {
  const locales = Object.keys(TRANSLATIONS);
  return locales[Math.floor(Math.random() * locales.length)];
}

export function getLocale(newLocale) {
  let locale = navigator.language;
  const localeLocalStorage = localStorage.getItem("locale");
  const urlParams = new URLSearchParams(window.location.search);
  const localeQueryParam = urlParams.get("locale");
  const localeSelect = document.getElementById("locale-select");

  locale = localeQueryParam || newLocale || localeLocalStorage || locale;

  if (locale === "random") {
    localStorage.setItem("locale", locale);
    localeSelect.value = locale;
    return "es-US";
  }

  if (locale.length === 2) {
    locale = DOMINANT_LOCALES[locale];
  }

  if (!TRANSLATIONS[locale]) {
    locale = "en-US";
  }

  localeSelect.value = locale;
  localStorage.setItem("locale", locale);

  return locale;
}

export function getStrings(locale = navigator.language) {
  if (locale.length === 2) {
    locale = DOMINANT_LOCALES[locale];
  }

  if (!TRANSLATIONS[locale]) {
    return TRANSLATIONS["en-US"];
  }

  return TRANSLATIONS[locale];
}

export function initLocale(defaultValue = navigator.language) {
  const locale = getStringSetting("locale", defaultValue);
  translateStrings(locale);

  document.getElementById("locale-select").addEventListener("change", (e) => {


    const isMulti = e.target.value === "random";
    const locale = isMulti ? "en-US" : e.target.value;
    const time = getTime();

    setLocale(e.target.value);

    deleteUrlParamAndRefresh("locale");

    if (!isMulti) {
      updateQuote(time);
    }
  });
}

function translateStrings(locale = navigator.language) {
  const time = getTime();
  const strings = getStrings(locale);

  document.documentElement.lang =
    locale === "random" ? "en" : locale.substring(0, 2);
  document.title = `[${time}] ${strings.document_title}`;

  Object.entries(LABELS).forEach(([id, key]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = strings[key];
    }
  });

  Object.entries(TITLE_ATTR).forEach(([id, key]) => {
    const element = document.getElementById(id);
    if (element) {
      element.title = strings[key];
    }
  });

  ["locale", "theme", "variant"].forEach((select) => {
    const options = document.querySelectorAll(`#${select}-select option`);
    options.forEach((op) => (op.textContent = strings[op.value]));
  });

  document
    .querySelectorAll("select optgroup")
    .forEach((el) => (el.label = strings[el.id]));
}

export function setLocale(newLocale) {
  const time = getTime();
  const locale = getLocale(newLocale);
  const strings = getStrings(locale);

  document.documentElement.lang =
    locale === "random" ? "en" : locale.substring(0, 2);
  document.title = `[${time}] ${strings.document_title}`;

  Object.entries(LABELS).forEach(([id, key]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = strings[key];
    }
  });

  Object.entries(TITLE_ATTR).forEach(([id, key]) => {
    const element = document.getElementById(id);
    if (element) {
      element.title = strings[key];
    }
  });

  ["locale", "theme", "variant"].forEach((select) => {
    const options = document.querySelectorAll(`#${select}-select option`);
    options.forEach((op) => (op.textContent = strings[op.value]));
  });

  document
    .querySelectorAll("select optgroup")
    .forEach((el) => (el.label = strings[el.id]));
}
