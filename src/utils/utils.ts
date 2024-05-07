import { startScreensaver } from "../modules/screensaver";
import { isBooleanSettingTrue } from "./settings";
import { Locale, Quote } from "../types";

const INITIAL_THEME_FONT_SIZE: Record<string, number> = {
  handwriting: 90,
  whatsapp: 45,
  retro: 70,
  frame: 35,
  subtle: 45,
};
const GITHUB_NEW_ISSUE_URL =
  "https://github.com/cdmoro/literature-clock/issues/new";

export function getTime() {
  const urlParams = new URLSearchParams(window.location.search);
  const testTime = urlParams.get("time");
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  return (
    testTime ||
    `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`
  );
}

export function updateGHLinks(time: string, quote: Quote, locale: Locale) {
  const quoteRaw = `${quote.quote_first}${quote.quote_time_case}${quote.quote_last}`;

  const addQuoteUrl = new URL(GITHUB_NEW_ISSUE_URL);
  addQuoteUrl.searchParams.set("template", `add-quote.yml`);
  addQuoteUrl.searchParams.set("assignees", "cdmoro");
  addQuoteUrl.searchParams.set("title", `[${time}][${locale}] Add quote`);
  addQuoteUrl.searchParams.set("labels", `add-quote,${locale}`);
  addQuoteUrl.searchParams.set("locale", locale);

  const addQuoteLink = document.getElementById(
    "add-quote"
  ) as HTMLAnchorElement;
  if (addQuoteLink) {
    addQuoteLink.href = addQuoteUrl.href;
  }

  const reportErrorUrl = new URL(GITHUB_NEW_ISSUE_URL);
  reportErrorUrl.searchParams.set("template", `quote-error.yml`);
  reportErrorUrl.searchParams.set("assignees", "cdmoro");
  reportErrorUrl.searchParams.set(
    "title",
    `[${time}][${locale}]${quote.id ? `[${quote.id}]` : ""} Report error`
  );
  reportErrorUrl.searchParams.set("labels", `bug,${locale}`);
  reportErrorUrl.searchParams.set("locale", locale);
  reportErrorUrl.searchParams.set("time", time);
  reportErrorUrl.searchParams.set("book", quote.title);
  reportErrorUrl.searchParams.set("author", quote.author);
  reportErrorUrl.searchParams.set("quote", quoteRaw.replace(/<br>/g, " "));

  const reportError = document.getElementById(
    "report-error"
  ) as HTMLAnchorElement;
  if (reportError) {
    reportError.href = reportErrorUrl.href;
  }
}

export function doFitQuote() {
  const [theme] = (document.documentElement.dataset.theme || "").split("-");
  const quote = document.querySelector<HTMLElement>("blockquote p");
  const cite = document.querySelector<HTMLElement>("blockquote cite");
  let fontSize: number = INITIAL_THEME_FONT_SIZE[theme] || 75;

  if (quote) {
    quote.style.fontSize = `${fontSize}px`;
    const safeClientHeight = quote.clientHeight - 10;

    while (quote.scrollHeight > safeClientHeight) {
      quote.style.fontSize = `${fontSize}px`;
      if (cite) {
        cite.style.fontSize = `${fontSize < 19 ? 10 : fontSize * 0.7}px`;
      }
      fontSize -= 1;

      if (fontSize < 10) {
        quote.style.fontSize = `10px`;
        break;
      }
    }
  }
}

export function fitQuote() {
  const interval = setInterval(doFitQuote, 1);
  setTimeout(() => {
    clearInterval(interval);

    if (isBooleanSettingTrue("screensaver")) {
      startScreensaver();
    }
  }, 500);
}

export function loadFontIfNotExists(font: string) {
  const fontNameSanitized = font.replace(/ /g, "+");
  const fontExists = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(
      "link[rel=stylesheet][href*=fonts]"
    )
  ).some((link) => link.href.includes(fontNameSanitized));

  if (fontExists) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${fontNameSanitized}:wght@400&display=swap`;
  document.head.appendChild(link);
}