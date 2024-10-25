import { getRandomLocale, getStrings } from './locales';
import { getStringSetting, isBooleanSettingTrue } from '../utils/settings';
import { setTheme } from './themes';
import { Locale, ResolvedQuote, Quote } from '../types';
import { fitQuote, getTime, updateGHLinks } from '../utils/utils';
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
  const urlParams = new URLSearchParams(window.location.search);

  try {
    const response = await fetch(`../times/${locale}/${fileName}.json`);

    if (!response.ok) {
      return FALLBACK_QUOTES[locale];
    }

    let quotes = (await response.json()) as Quote[];

    if (isBooleanSettingTrue('work') && !urlParams.get('index')) {
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
  const urlParams = new URLSearchParams(window.location.search);
  const strings = getStrings();

  let quoteIndex = Math.floor(Math.random() * quotes.length);

  if (useIndex) {
    const index = document.getElementById('quote')?.dataset.index;

    if (index) {
      const blockquoteIndex = parseInt(index);
      if (!isNaN(blockquoteIndex) && quotes[blockquoteIndex]) {
        quoteIndex = blockquoteIndex;
      }
    }
  }

  if (urlParams.get('index')) {
    const urlParamsIndex = parseInt(urlParams.get('index')!);
    if (!isNaN(urlParamsIndex) && quotes[urlParamsIndex]) {
      quoteIndex = urlParamsIndex;
    }
  }

  const quote = Object.assign({}, quotes[quoteIndex]) as ResolvedQuote;
  quote.index = quoteIndex;

  if (!quote.quote_time_case) {
    quote.time = time;
    quote.quote_time_case = time;
    quote.fallback = true;
  }

  if (urlParams.get('quote')) {
    quote.title = strings.title;
    quote.author = strings.author;
  }

  return quote;
}

export async function updateQuote({ time = getTime(), useIndex = false } = {}) {
  const urlParams = new URLSearchParams(window.location.search);
  const testQuote = urlParams.get('quote');
  let locale = store.getState('locale') as Locale;

  if (!locale) {
    return;
  }

  if (store.getState('locale') === 'random') {
    locale = getRandomLocale();
  }

  const quote = await getQuote(time, locale, useIndex);
  updateGHLinks(time, quote, locale);
  const quoteRaw = `${quote.quote_first}${quote.quote_time_case}${quote.quote_last}`;
  const timeClass = quote.quote_time_case.replace(/<[^>]*>/g, '').length <= 11 ? 'time text-nowrap' : 'time';
  const quoteText =
    testQuote || `${quote.quote_first}<span class="${timeClass}">${quote.quote_time_case}</span>${quote.quote_last}`;

  const blockquote = document.getElementById('quote');

  if (blockquote) {
    blockquote.innerHTML = '';

    const p = document.createElement('p');
    p.innerHTML = quoteText;

    const cite = document.createElement('cite');
    cite.innerHTML = `<span id="title">${quote.title}</span><span id="author">${quote.author}</span>`;

    blockquote.appendChild(p);
    blockquote.appendChild(cite);
    blockquote.setAttribute('aria-label', quote.time);
    blockquote.setAttribute('aria-description', `${quoteRaw.replace(/<br>/g, '\n')}\n${quote.title}, ${quote.author}`);
    blockquote.dataset.locale = locale;
    blockquote.dataset.sfw = quote.sfw;
    blockquote.dataset.index = quote.index?.toString();
    if (quote.fallback) {
      blockquote.dataset.fallback = 'true';
    } else {
      blockquote.removeAttribute('data-fallback');
    }

    if (isBooleanSettingTrue('fade')) {
      fadeInQuote();
    }

    fitQuote();

    if (getStringSetting('theme')?.includes('color')) {
      setTheme();
    }
  }

  prefetchNextQuotes(locale);
}
