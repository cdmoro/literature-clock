import { getLocale, setLocale, getStrings, getRandomLocale, LOCALES } from './locales.js';
import { setTheme, setVariant } from './themes.js';
import { initZenMode, setZenMode } from './zenMode.js';
import { initWorkMode, isWorkMode, toggleWorkMode } from './workMode.js';
import { FALLBACK_QUOTES, getTime, updateGHLinks } from './utils.js';

const clock = document.getElementById("clock");
const quoteTimeBar = document.getElementById("quote-time-bar");
const urlParams = new URLSearchParams(window.location.search);
const testTime = urlParams.get('time');
const testQuote = urlParams.get('quote');
let lastTime;
let pauseTimeBar = false;

const QUOTE_SIZE = {
    100: 'xs',
    200: 's',
    300: 'm',
    400: 'l',
    500: 'xl',
    600: 'xxl'
}
const sizes = Object.keys(QUOTE_SIZE);

async function updateQuote(time) {
    const quotes = await getQuotes(time);
    const quote = getQuote(quotes, time);
    const quoteText = testQuote || `${quote.quote_first}<span class="quote-time">${quote.quote_time_case}</span>${quote.quote_last}`
    
    const blockquote = document.createElement('blockquote');
    blockquote.id = 'quote';

    const p = document.createElement('p');
    p.innerHTML = quoteText.replace(/\n/g, '<br>');

    const cite = document.createElement('cite');
    cite.innerText = `— ${quote.title}, ${quote.author}`;

    blockquote.appendChild(p);
    blockquote.appendChild(cite);
    blockquote.setAttribute('aria-label', quote.time);
    blockquote.dataset.swf = quote.swf;

    if (quote.quote_raw) {
        blockquote.setAttribute('aria-description', quote.quote_raw.replace(/<br\/>|\n/g, ' '));
    }

    const quoteLength = p.textContent.length;

    let lengthClass = 'xxxl';
    for(let i = 0; i < sizes.length; i++) {
        if (quoteLength <= sizes[i]) {
            lengthClass = QUOTE_SIZE[sizes[i]];
            break;
        }
    }

    blockquote.classList.add(`quote-${lengthClass}`);

    updateGHLinks(time, quote, LOCALES);

    clock.innerHTML = '';
    clock.appendChild(blockquote);
} 

async function getQuotes(time) {
    const localeSelect = document.getElementById('locale-select');
    const fileName = time.replace(":", "_");
    const locale = localeSelect.value === 'multi' ? getRandomLocale() : getLocale();
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
    const locale = document.documentElement.lang;
    const random_quote_index = Math.floor(Math.random() * quotes.length);
    const quote = Object.assign({}, quotes[random_quote_index]);

    if (!quote.quote_time_case) {
        quote.time = time;
        quote.quote_time_case = time;
    }

    if (testQuote) {
        quote.title = LOCALES[locale].title;
        quote.author = LOCALES[locale].author;
    }

    return quote;
}

async function updateTime(testTime) {
    const time = getTime();
    const now = new Date();
    const seconds = now.getSeconds();

    if (!testTime && !testQuote) {
        const percentage = (seconds / 60) * 100;
        quoteTimeBar.style.width = `${percentage.toFixed(2)}%`;
        quoteTimeBar.style.transition = seconds === 0 || pauseTimeBar ? 'none' : 'width 1s linear';
        quoteTimeBar.style.display = pauseTimeBar ? 'none' : 'block';
    }

    if (lastTime !== time) {
        const strings = getStrings();

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

    document.getElementById('locale-select').addEventListener('change', (e) => {
        const isMultilingual = e.target.value === 'multi';
        const newLocale = isMultilingual ? 'en' : e.target.value;
        const time = getTime();
        const strings = getStrings(newLocale);

        setLocale(newLocale)

        if (!testQuote) {
            document.title = `[${time}] ${strings.document_title}`;
        }

        const urlParams = new URLSearchParams(window.location.search);

        if (urlParams.get('locale')) {
            localStorage.setItem('locale', newLocale);
            urlParams.delete("locale");
            window.location.search = urlParams.toString();
            return;
        }

        if (!isMultilingual) {
            updateQuote(time);
        }
    });

    document.getElementById('theme-select').addEventListener('change', (e) => 
        setTheme(e.target.value)
    );
    document.getElementById('variant-select').addEventListener('change', (e) =>
        setVariant(e.target.value)
    );
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const variantSelect = document.getElementById("variant-select");
        
        if (variantSelect.value === 'system') {
            const themeSelect = document.getElementById('theme-select');
            const theme = `${themeSelect.value}-${e.matches ? 'dark' : 'light'}`;

            localStorage.setItem('theme', theme);
            document.documentElement.setAttribute("data-theme", theme);
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

    window.addEventListener('blur', () => pauseTimeBar = true);

    window.addEventListener('focus', () => pauseTimeBar = false);
    
    document.body.classList.remove('hidden');

    updateTime(testTime);

    if (!testTime && !testQuote) {
        setInterval(updateTime, 1000);
    }
});
