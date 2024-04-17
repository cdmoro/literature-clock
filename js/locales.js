import { updateQuote } from "./quotes.js";
import {
  deleteUrlParamIfExistsAndRefresh,
  initStringSetting,
  setStringSetting,
} from "./settings.js";
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
  const locale = initStringSetting("locale", defaultValue);
  setStringSetting("locale", locale);
  translateStrings(locale);

  document.getElementById("locale-select").addEventListener("change", (e) => {
    const isRandomLocale = e.target.value === "random";
    translateStrings(isRandomLocale ? "en-US" : e.target.value);
    setStringSetting("locale");
    deleteUrlParamIfExistsAndRefresh("locale");

    if (!isRandomLocale) {
      updateQuote();
    }
  });
}

function translateStrings(locale = navigator.language) {
  const time = getTime();
  const strings = getStrings(locale);

  document.documentElement.lang =
    locale === "random" ? "en" : locale.substring(0, 2);
  document.title = `[${time}] ${strings.document_title}`;

  Object.entries(LABELS).forEach(
    ([id, key]) => (document.getElementById(id).textContent = strings[key])
  );

  Object.entries(TITLE_ATTR).forEach(
    ([id, key]) => (document.getElementById(id).title = strings[key])
  );

  ["locale", "theme", "variant"].forEach((select) =>
    document
      .querySelectorAll(`#${select}-select option`)
      .forEach((op) => (op.textContent = strings[op.value]))
  );

  document
    .querySelectorAll("select optgroup")
    .forEach((el) => (el.label = strings[el.id]));
}
