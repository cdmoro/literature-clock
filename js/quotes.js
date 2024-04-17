import { getLocale, getRandomLocale } from "./locales.js";
import { getStringSetting, isBooleanSettingTrue } from "./settings.js";
import TRANSLATIONS from "./translations.js";
import { FALLBACK_QUOTES, getTime, updateGHLinks } from "./utils.js";

const QUOTE_SIZE = {
  100: "xs",
  200: "s",
  300: "m",
  400: "l",
  500: "xl",
  600: "xxl",
};
const sizes = Object.keys(QUOTE_SIZE);

async function getQuotes(time, locale) {
  const fileName = time.replace(":", "_");
  try {
    const response = await fetch(`../times/${locale}/${fileName}.json`);

    if (!response.ok) {
      return FALLBACK_QUOTES[locale];
    }

    let quotes = await response.json();

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

async function getQuote(time, locale) {
  const quotes = await getQuotes(time, locale);
  const urlParams = new URLSearchParams(window.location.search);
  const quoteIndex = Math.floor(Math.random() * quotes.length);
  const quote = Object.assign({}, quotes[quoteIndex]);

  if (!quote.quote_time_case) {
    quote.time = time;
    quote.quote_time_case = time;
  }

  if (urlParams.get("quote")) {
    quote.title = TRANSLATIONS[locale].title;
    quote.author = TRANSLATIONS[locale].author;
  }

  return quote;
}

export async function updateQuote(time = getTime()) {
  const clock = document.getElementById("clock");
  const urlParams = new URLSearchParams(window.location.search);
  const testQuote = urlParams.get("quote");
  const locale =
    getStringSetting("locale") === "random"
      ? getRandomLocale()
      : getLocale();
  const quote = await getQuote(time, locale);
  const quoteText =
    testQuote ||
    `${quote.quote_first}<span class="time">${quote.quote_time_case}</span>${quote.quote_last}`;

  const blockquote = document.createElement("blockquote");
  blockquote.id = "quote";

  const p = document.createElement("p");
  p.innerHTML = quoteText.replace(/\n/g, "<br>");

  const cite = document.createElement("cite");
  cite.innerText = `— ${quote.title}, ${quote.author}`;

  blockquote.appendChild(p);
  blockquote.appendChild(cite);
  blockquote.setAttribute("aria-label", quote.time);
  blockquote.dataset.sfw = quote.sfw;

  if (quote.quote_raw) {
    blockquote.setAttribute(
      "aria-description",
      quote.quote_raw.replace(/<br>|\n/g, " ")
    );
  }

  const quoteLength = p.textContent.length;

  let lengthClass = "xxxl";
  for (let i = 0; i < sizes.length; i++) {
    if (quoteLength <= sizes[i]) {
      lengthClass = QUOTE_SIZE[sizes[i]];
      break;
    }
  }

  blockquote.classList.add(`quote-${lengthClass}`);

  updateGHLinks(time, quote, locale);

  clock.innerHTML = "";
  clock.appendChild(blockquote);
}
