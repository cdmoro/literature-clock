import { getLocale, setLocale, getStrings } from './locales.js';
import { setTheme, setVariant } from './themes.js';
import { initZenMode, setZenMode } from './zenMode.js';
import { initWorkMode, isWorkMode, toggleWorkMode } from './workMode.js';
import { FALLBACK_QUOTES } from './utils.js';

const clock = document.getElementById("clock");
const quoteTimeBar = document.getElementById("quote-time-bar");
const addQuoteLink = document.getElementById("add-quote");
const urlParams = new URLSearchParams(window.location.search);
const testTime = urlParams.get('time');
const testQuote = urlParams.get('quote');
let lastTime;

function getTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    return testTime || `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

async function updateQuote(time) {
    const quotes = await getQuotes(time);
    const quote = getQuote(quotes, time);
    const quoteText = testQuote || `${quote.quote_first}<span class="quote-time">${quote.quote_time_case}</span>${quote.quote_last}`
    const quoteRawEl = document.createElement('div');
    quoteRawEl.innerHTML = quote.quote_raw;

    clock.innerHTML = /*html*/`
        <blockquote id="quote" aria-label="${quote.time}" aria-description="${quoteRawEl.innerText}" data-sfw="${quote.sfw}">
            <p>${quoteText.replace(/\n/g, '<br>')}</p>
            <cite>— ${quote.title}, ${quote.author}</cite>
        </blockquote>
    `;
} 

async function getQuotes(time) {
    const fileName = time.replace(":", "_");
    const locale = getLocale();
    try {
        const response = await fetch(`../times/${locale}/${fileName}.json`);

        if (!response.ok) {
            return FALLBACK_QUOTES[locale];
        }

        let quotes = await response.json();

        if (isWorkMode()) {
            quotes = quotes.filter(q => q.sfw !== 'nsfw');
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
    const locale = getLocale();
    const strings = getStrings();
    const url = new URL('https://github.com/cdmoro/reloj-literario/issues/new');
    url.searchParams.set('template', `add-quote.${locale}.yaml`);
    url.searchParams.set('title', `[${time}] ${strings.add_quote}`);

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
    const time = getTime();
    const now = new Date();
    const seconds = now.getSeconds();
    const strings = getStrings();

    if (!testTime && !testQuote) {
        quoteTimeBar.style.width = `${(seconds / 60) * 100}%`;
        quoteTimeBar.style.transition = seconds === 0 ? 'none' : 'width 1s linear';
    }

    if (lastTime !== time) {
        if (!testQuote) {
            document.title = `[${time}] ${strings.document_title}`;
        }

        updateQuote(time);
        lastTime = time;
    }
}


document.addEventListener('DOMContentLoaded', function() {
    initZenMode();
    initWorkMode();
    setTheme();
    setLocale();

    document.getElementById('language-select').addEventListener('change', (e) => {
        setLocale(e.target.value)
        const time = getTime();
        const strings = getStrings();

        if (!testQuote) {
            document.title = `[${time}] ${strings.document_title}`;
        }

        updateQuote(time);
    });

    document.getElementById('theme-select').addEventListener('change', (e) => 
        setTheme(e.target.value)
    );
    document.getElementById('variant-select').addEventListener('change', (e) =>
        setVariant(e.target.value)
    );
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const themeSelect = document.getElementById('theme-select');
        const variantSelect = document.getElementById('variant-select');
        
        if (variantSelect.value === 'system') {
            setTheme(`${themeSelect.value}-${e.matches ? 'dark' : 'light'}`, false);
        }
    });

    document.getElementById('zen-mode').addEventListener('click', (e) => {
        e.preventDefault();
        setZenMode(true);
    });
    document.getElementById('work-mode').addEventListener('click', (e) => {
        e.preventDefault();
        toggleWorkMode();

        const quote = document.getElementById('quote');
        const isNSFW = quote.dataset.sfw === 'nsfw';

        if (isWorkMode() && isNSFW) {
            const time = getTime();
            updateQuote(time);
        }
    });
    document.getElementById('exit-zen').addEventListener('click', (e) => {
        e.preventDefault();
        setZenMode(false);
    });
    
    document.body.classList.remove('hidden');

    updateTime(testTime);

    if (!testTime && !testQuote) {
        setInterval(updateTime, 1000);
    }
});