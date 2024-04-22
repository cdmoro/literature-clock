export const FALLBACK_QUOTES = {
  "en-US": [
    {
      quote_first: "Error ",
      quote_last: ": quote not found.",
      title: "Internet Explorer",
      author: "1995-2022",
      sfw: true,
    },
    {
      quote_first: "Captain's log:<br>We are still looking for a quote for ",
      quote_last: ".",
      title: "Moby Dick",
      author: "Captain Ahab",
      sfw: true,
    },
  ],
  "es-ES": [
    {
      quote_first: "Error ",
      quote_last: ": quote not found.",
      title: "Internet Explorer",
      author: "1995-2022",
      sfw: true,
    },
    {
      quote_first:
        "Bitácora del Capitán:<br>Seguimos buscando una cita para las ",
      quote_last: ".",
      title: "Moby Dick",
      author: "Captain Ahab",
      sfw: true,
    },
  ],
  "pt-BR": [
    {
      quote_first: "Erro ",
      quote_last: ": citação não encontrada.",
      title: "Internet Explorer",
      author: "1995-2022",
      sfw: true,
    },
    {
      quote_first:
        "Registro do capitão:<br>Ainda estamos procurando uma data para o ",
      quote_last: ".",
      title: "Moby Dick",
      author: "Capitão Ahab",
      sfw: true,
    },
  ],
  "fr-FR": [
    {
      quote_first: "Erreur ",
      quote_last: ": citation non trouvée.",
      title: "Internet Explorer",
      author: "1995-2022",
      sfw: true,
    },
    {
      quote_first:
        "Journal du capitaine:<br>Nous sommes toujours à la recherche d'una citation pour ",
      quote_last: ".",
      title: "Moby Dick",
      author: "Capitaine Achab",
      sfw: true,
    },
  ],
  "it-IT": [
    {
      quote_first: "Errore ",
      quote_last: ": citazione non trovata.",
      quote_time_case: ".",
      title: "Internet Explorer",
      author: "1995-2022",
      sfw: true,
    },
    {
      quote_first:
        "Diario del capitano:<br>Stiamo ancora cercando una data per il ",
      quote_last: ".",
      title: "Moby Dick",
      author: "Capitano Achab",
      sfw: true,
    },
  ],
};

const INITIAL_THEME_FONT_SIZE = {
  handwriting: 80,
  whatsapp: 50,
};

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

export function updateGHLinks(time, quote, locale) {
  const quoteRaw = `${quote.quote_first}${quote.quote_time_case}${quote.quote_last}`;

  const addQuoteUrl = new URL(
    "https://github.com/cdmoro/literature-clock/issues/new"
  );
  addQuoteUrl.searchParams.set("template", `add-quote.yml`);
  addQuoteUrl.searchParams.set("labels", "add-quote");
  addQuoteUrl.searchParams.set("title", `[${time}][${locale}] Add quote`);

  const addQuoteLink = document.getElementById("add-quote");
  addQuoteLink.href = addQuoteUrl.href;

  const reportErrorUrl = new URL(
    "https://github.com/cdmoro/literature-clock/issues/new"
  );
  reportErrorUrl.searchParams.set("template", `quote-error.yml`);
  reportErrorUrl.searchParams.set("title", `[${time}][${locale}] Report error`);
  reportErrorUrl.searchParams.set("labels", "bug");
  reportErrorUrl.searchParams.set("time", time);
  reportErrorUrl.searchParams.set("book", quote.title);
  reportErrorUrl.searchParams.set("author", quote.author);
  reportErrorUrl.searchParams.set("quote", quoteRaw.replace(/<br>/g, " "));

  const reportError = document.getElementById("report-error");
  reportError.href = reportErrorUrl.href;
}

export function fitQuote() {
  const [theme] = document.documentElement.dataset.theme.split("-");
  const quote = document.querySelector("blockquote p");
  const cite = document.querySelector("blockquote cite");
  let fontSize = INITIAL_THEME_FONT_SIZE[theme] || 60;

  if (quote) {
    quote.style.fontSize = `${fontSize}px`;
    const secureClientHeight = quote.clientHeight - 10;

    while (quote.scrollHeight > secureClientHeight) {
      quote.style.fontSize = `${fontSize}px`;
      cite.style.fontSize = `${fontSize * 0.575833333333}px`
      fontSize -= 1;

      if (fontSize < 10) {
        quote.style.fontSize = `10px`;
        break;
      }
    }
  }
}
