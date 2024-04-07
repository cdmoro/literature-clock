import { getLocale, setLocale } from './locales.js';
import { setTheme, setVariant } from './themes.js';
import { FALLBACK_QUOTES } from './utils.js';

const clock = document.getElementById("clock");
const quoteTimeBar = document.getElementById("quote-time-bar");
const addQuoteLink = document.getElementById("add-quote");
const urlParams = new URLSearchParams(window.location.search);
const testTime = urlParams.get('time');
const testQuote = urlParams.get('quote');
const isZenMode = urlParams.has('zen');
const isWorkMode = urlParams.has('work');
let lastTime;

async function getQuotes(fileName) {
    const locale = getLocale();
    try {
        const response = await fetch(`../times/${locale}/${fileName}.json`);

        if (!response.ok) {
            return FALLBACK_QUOTES[locale];
        }

        let quotes = await response.json();

        if (isWorkMode) {
            quotes = quotes.filter(q => q.sfw);
        }

        if (!quotes.length) {
            return FALLBACK_QUOTES[locale];
        }

        return quotes;
    } catch (error) {
        return FALLBACK_QUOTES[locale];
    }
}

function getQuote(quotes, time) {
    const url = new URL('https://github.com/cdmoro/reloj-literario/issues/new');
    url.searchParams.set('template', 'agregar-cita.yaml');
    url.searchParams.set('title', `[${time}] Agregar cita`);

    const random_quote_index = Math.floor(Math.random() * quotes.length);
    const quote = Object.assign({}, quotes[random_quote_index]);

    if (!quote.quote_time_case) {
        quote.time = time;
        quote.quote_time_case = time;
    }

    if (testQuote) {
        quote.title = "Libro";
        quote.author = "Autor";
    }

    addQuoteLink.href = url.href;

    return quote;
}

async function updateTime(testTime) {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    let quotes = [];
    let quote = {};
    let html = '';

    const time = testTime || `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    if (!testTime && !testQuote) {
        quoteTimeBar.style.width = `${(seconds / 60) * 100}%`;
        quoteTimeBar.style.transition = seconds === 0 ? 'none' : 'width 1s linear';
    }

    if (lastTime !== time) {
        if (!testQuote) {
            document.title = `[${time}] Reloj Literario`;
        }

        quotes = await getQuotes(time.replace(":", "_"));
        quote = getQuote(quotes, time);

        html = /*html*/`
            <blockquote aria-label="${quote.time}" aria-description="${quote.quote_raw}">
                <p>${testQuote || `${quote.quote_first}<span class="quote-time">${quote.quote_time_case}</span>${quote.quote_last}`}</p>
                <cite>— ${quote.title}, ${quote.author}</cite>
            </blockquote>`;

        clock.innerHTML = html.replace(/\n/g, "<br>");
        lastTime = time;
    }
}


document.addEventListener('DOMContentLoaded', function() {
    setTheme();
    setLocale();

    document.getElementById('language-select').addEventListener('change', (e) => 
        setLocale(e.target.value)
    );
    document.getElementById('theme-select').addEventListener('change', (e) => 
        setTheme(e.target.value)
    );
    document.getElementById('variant-select').addEventListener('change', (e) =>
        setVariant(e.target.value)
    )
    
    document.body.classList.remove('hidden');

    updateTime(testTime);

    if (!testTime && !testQuote) {
        setInterval(updateTime, 1000);
    }
});