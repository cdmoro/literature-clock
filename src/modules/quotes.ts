import { getRandomLocale } from "./locales";
import { getStringSetting, isBooleanSettingTrue } from "../utils/settings";
import { setTheme } from "./themes";
import TRANSLATIONS from "../strings/translations.json";
import { Locale, Quote } from "../types";
import { fitQuote, getTime, updateGHLinks } from "../utils/utils";
import FALLBACK_QUOTES from "../strings/fallbackQuotes.json";
import { fadeInQuote, fadeOutQuote } from "./fade";

async function getQuotes(time: string, locale: Locale): Promise<Quote[]> {
  const fileName = time.replace(":", "_");
  try {
    const response = await fetch(`../times/${locale}/${fileName}.json`);

    if (!response.ok) {
      return FALLBACK_QUOTES[locale];
    }

    let quotes = (await response.json()) as Quote[];

    if (isBooleanSettingTrue("work")) {
      quotes = quotes.filter((q) => q.sfw !== "nsfw");
    }

    if (!quotes.length) {
      return FALLBACK_QUOTES[locale];
    }

    return quotes;
  } catch (error) {
    return FALLBACK_QUOTES[locale];
  }
}

async function getQuote(time: string, locale: Locale): Promise<Quote> {
  const quotes = await getQuotes(time, locale);
  const urlParams = new URLSearchParams(window.location.search);

  let quoteIndex = Math.floor(Math.random() * quotes.length);

  if (urlParams.get("index")) {
    const urlParamsIndex = parseInt(urlParams.get("index")!);
    if (!isNaN(urlParamsIndex) && quotes[urlParamsIndex]) {
      quoteIndex = urlParamsIndex;
    }
  }

  const quote = Object.assign({}, quotes[quoteIndex]);

  if (!quote.quote_time_case) {
    quote.time = time;
    quote.quote_time_case = time;
    quote.fallback = true;
  }

  if (urlParams.get("quote")) {
    quote.title = TRANSLATIONS[locale].title;
    quote.author = TRANSLATIONS[locale].author;
  }

  return quote;
}

export async function updateQuote(time = getTime()) {
  const urlParams = new URLSearchParams(window.location.search);
  const testQuote = urlParams.get("quote");
  let locale = getStringSetting("locale") as Locale;

  if (!locale) {
    return;
  }

  if (getStringSetting("locale") === "random") {
    locale = getRandomLocale();
  }

  if (getStringSetting("theme")?.includes("color")) {
    setTheme(false);
  }

  const quote = await getQuote(time, locale);
  updateGHLinks(time, quote, locale);
  const quoteRaw = `${quote.quote_first}${quote.quote_time_case}${quote.quote_last}`;
  const quoteText =
    testQuote ||
    `${quote.quote_first}<span class="time">${quote.quote_time_case}</span>${quote.quote_last}`;

  const blockquote = document.getElementById("quote");

  if (blockquote) {
    blockquote.innerHTML = "";

    const p = document.createElement("p");
    p.innerHTML = quoteText;

    const cite = document.createElement("cite");
    cite.innerHTML = `<span id="title">${quote.title}</span><span id="author">${quote.author}</span>`;

    blockquote.appendChild(p);
    blockquote.appendChild(cite);
    blockquote.setAttribute("aria-label", quote.time);
    blockquote.setAttribute("aria-description", quoteRaw.replace(/<br>/g, " "));
    blockquote.dataset.locale = locale;
    blockquote.dataset.sfw = quote.sfw;
    if (quote.fallback) {
      blockquote.dataset.fallback = "true";
    } else {
      blockquote.removeAttribute("data-fallback");
    }

    if (isBooleanSettingTrue("fade")) {
      fadeInQuote();
    }

    fitQuote();
  }
}
