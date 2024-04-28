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

const LABELS = {
  zen: "zen_mode",
  work: "work_mode",
  "add-quote": "add_quote",
  "report-error": "report_error",
  project: "project",
  "made-by": "made_by",
};

const TITLE_ATTR = {
  zen: "zen_mode_title",
  work: "work_mode_title",
  "exit-zen": "exit_zen_title",
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
