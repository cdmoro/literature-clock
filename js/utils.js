export const FALLBACK_QUOTES = {
    en: [
        {
            quote_first: "Error ",
            quote_last: ": quote not found.",
            title: "Internet Explorer",
            author: "1995-2022",
            sfw: true
        },
        {
            quote_first: "Captain's log:<br/>We are still looking for a quote for ",
            quote_last: ".",
            title: "Moby Dick",
            author: "Captain Ahab",
            sfw: true
        },

    ],
    es: [
        {
            quote_first: "Error ",
            quote_last: ": quote not found.",
            title: "Internet Explorer",
            author: "1995-2022",
            sfw: true
        },
        {
            quote_first: "Bitácora del Capitán:<br/>Seguimos buscando una cita para las ",
            quote_last: ".",
            title: "Moby Dick",
            author: "Captain Ahab",
            sfw: true
        },
    ],
    pt: [
        {
            quote_first: "Erro ",
            quote_last: ": citação não encontrada.",
            title: "Internet Explorer",
            author: "1995-2022",
            sfw: true
        },
        {
            quote_first: "Registro do capitão:<br/>Ainda estamos procurando uma data para o ",
            quote_last: ".",
            título: "Moby Dick",
            autor: "Capitão Ahab",
            sfw: true
        },

    ],
    fr: [
        {
            quote_first: "Erreur ",
            quote_last: ": citation non trouvée.",
            title: "Internet Explorer",
            author: "1995-2022",
            sfw: true
        },
        {
            quote_first: "Journal du capitaine:<br/>Nous sommes toujours à la recherche d'una citation pour ",
            quote_last: ".",
            title: "Moby Dick",
            auteur: "Capitaine Achab",
            sfw: true
        },

    ],
    it: [
        {
            quote_first: "Errore ",
            quote_last: ": citazione non trovata.",
            quote_time_case: ".",
            title: "Internet Explorer",
            author: "1995-2022",
            sfw: true
        },
        {
            quote_first: "Diario del capitano:<br/>Stiamo ancora cercando una data per il ",
            quote_last: ".",
            title: "Moby Dick",
            autore: "Capitano Achab",
            sfw: true
        },

    ],
};

export function getTime() {
    const urlParams = new URLSearchParams(window.location.search);
    const testTime = urlParams.get('time');
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    return testTime || `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function updateGHLinks(time, quote, LOCALES) {
    const locale = document.documentElement.lang;
    const addQuoteUrl = new URL('https://github.com/cdmoro/literature-clock/issues/new');
    addQuoteUrl.searchParams.set('template', `add-quote.yml`);
    addQuoteUrl.searchParams.set('labels', 'add-quote');
    addQuoteUrl.searchParams.set('title', `[${time}][${locale.toUpperCase()}] ${LOCALES.en.add_quote}`);
    const addQuoteLink = document.getElementById("add-quote");
    addQuoteLink.href = addQuoteUrl.href;

    const reportErrorUrl = new URL('https://github.com/cdmoro/literature-clock/issues/new');
    reportErrorUrl.searchParams.set('template', `quote-error.yml`);
    reportErrorUrl.searchParams.set('title', `[${time}][${locale.toUpperCase()}] ${LOCALES.en.report_error}`);
    reportErrorUrl.searchParams.set('labels', 'bug');
    reportErrorUrl.searchParams.set('time', time);
    reportErrorUrl.searchParams.set('book', quote.title);
    reportErrorUrl.searchParams.set('author', quote.author);
    if (quote.quote_raw) {
        reportErrorUrl.searchParams.set('quote', quote.quote_raw.replace(/<br\/>|\n/g, ' '));
    }
    const reportError = document.getElementById('report-error');
    reportError.href = reportErrorUrl.href;
}