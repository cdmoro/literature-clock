import { getRandomLocale, getStrings } from './locales';
import { removeBackgroundImage, setDynamicBackgroundPicture, setTheme } from './themes';
import { Locale, ResolvedQuote, Quote } from '../types';
import { fitQuote, getTime, updateGHLinks } from '../utils';
import FALLBACK_QUOTES from '../strings/fallbackQuotes.json';
import { fadeInQuote } from './fade';
import { store } from '../store';

function prefetchNextQuotes(locale: string) {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const nextFileName = `${hours.toString().padStart(2, '0')}_${minutes.toString().padStart(2, '0')}`;

  fetch(`../times/${locale}/${nextFileName}.json`, {
    cache: 'force-cache',
  });
}

async function getQuotes(time: string, locale: Locale): Promise<Quote[]> {
  const fileName = time.replace(':', '_');

  try {
    const response = await fetch(`../times/${locale}/${fileName}.json`);

    if (!response.ok) {
      return FALLBACK_QUOTES[locale];
    }

    let quotes = (await response.json()) as Quote[];

    if (store.get('work') && !store.get('index')) {
      quotes = quotes.filter((q) => q.sfw !== 'nsfw');
    }

    if (!quotes.length) {
      return FALLBACK_QUOTES[locale];
    }

    return quotes;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return FALLBACK_QUOTES[locale];
  }
}

async function getQuote(time: string, locale: Locale, useIndex: boolean = false): Promise<ResolvedQuote> {
  const quotes = await getQuotes(time, locale);
  const strings = getStrings(locale);

  let quoteIndex = Math.floor(Math.random() * quotes.length);

  if (useIndex) {
    const index = store.get('active-quote')?.index;

    if (index && quotes[index]) {
      quoteIndex = index;
    }
  }

  if (store.get('index')) {
    const urlParamsIndex = parseInt(store.get('index')!);
    if (!isNaN(urlParamsIndex) && quotes[urlParamsIndex]) {
      quoteIndex = urlParamsIndex;
    }
  }

  const quote = Object.assign({}, quotes[quoteIndex]) as ResolvedQuote;
  quote.index = quoteIndex;
  quote.locale = locale;
  quote.quote_raw = `${quote.quote_first}${quote.quote_time_case}${quote.quote_last}`.replace(/<br>/g, '\n');

  if (!quote.quote_time_case) {
    quote.quote_time_case = time;
    quote.fallback = true;
  }

  if (store.get('quote')) {
    quote.title = strings.title;
    quote.author = strings.author;
  }

  store.set('active-quote', quote);

  return quote;
}

export async function updateQuote({ time = getTime(), useIndex = false } = {}) {
  const testQuote = store.get('quote');
  let locale = store.get('locale') as Locale;

  if (!locale) {
    return;
  }

  if (store.get('random-locale')) {
    locale = getRandomLocale();
  }

  const quote = await getQuote(time, locale, useIndex);
  updateGHLinks(time, quote, locale);
  const timeClass = quote.quote_time_case.replace(/<[^>]*>/g, '').length <= 11 ? 'time text-nowrap' : 'time';
  const quoteText =
    testQuote || `${quote.quote_first}<span class="${timeClass}">${quote.quote_time_case}</span>${quote.quote_last}`;

  const blockquote = document.getElementById('quote');

  if (store.get('theme')?.startsWith('photo')) {
    setDynamicBackgroundPicture();
  } else {
    removeBackgroundImage();
  }

  if (blockquote) {
    blockquote.innerHTML = '';

    const p = document.createElement('p');
    p.innerHTML = quoteText;

    const cite = document.createElement('cite');
    cite.innerHTML = `<span id="hyphen">— </span><span id="title">${quote.title}</span><span id="comma">, </span><span id="author">${quote.author}</span>`;

    blockquote.appendChild(p);
    blockquote.appendChild(cite);
    blockquote.setAttribute('aria-label', time);
    blockquote.setAttribute('aria-description', `${quote.quote_raw} (${quote.title}, ${quote.author})`);

    if (store.get('fade')) {
      fadeInQuote();
    }

    fitQuote();

    if (store.get('theme')?.includes('color')) {
      setTheme({
        syncToUrl: false,
      });
    }
  }

  prefetchNextQuotes(locale);
}
