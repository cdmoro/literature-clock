import { setTextLocale } from '../utils/text-direction';
import { refreshDefaultFontLabel } from './font';
import { applyLocaleThemeFont } from './locale-fonts';
import { updateQuoteDescription } from './hide-book-title';
import { renderTranslation } from './bilingual';
import { getBaseLocale, getRandomLocale, getStrings } from './locales';
import { removeBackgroundImage, setDynamicBackgroundPicture, setTheme } from './themes';
import { Locale, ResolvedQuote, Quote } from '../types';
import { fitQuote, getTime, updateGHLinks } from '../utils';
import FALLBACK_QUOTES from '../strings/fallbackQuotes.json';
import { cancelQuoteTransition, transitionQuote } from './transitions';

let latestRequest = 0;
import { store } from '../store';
import { quoteMarkup } from '../utils/quote-markup';
import { readingStrings, showQuoteNotice } from './reading-ui';

function prefetchNextQuotes(locale: string) {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const nextFileName = `${hours.toString().padStart(2, '0')}_${minutes.toString().padStart(2, '0')}`;

  fetch(`../times/${locale}/${nextFileName}.json`, {
    cache: 'force-cache',
  }).catch(() => {
    /* Prefetch is optional when offline. */
  });
}

async function getQuotes(time: string, locale: Locale): Promise<Quote[]> {
  const fileName = time.replace(':', '_');

  try {
    const response = await fetch(`../times/${locale}/${fileName}.json`);

    if (!response.ok) {
      return FALLBACK_QUOTES[getBaseLocale(locale)];
    }

    let quotes = (await response.json()) as Quote[];

    if (store.get('work')) {
      quotes = quotes.filter((q) => q.sfw === true);
    }

    if (!quotes.length) {
      return FALLBACK_QUOTES[getBaseLocale(locale)];
    }

    return quotes;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return FALLBACK_QUOTES[getBaseLocale(locale)];
  }
}

async function getQuote(
  time: string,
  locale: Locale,
  preserveQuote: boolean = false,
  variantStep = 0,
): Promise<ResolvedQuote> {
  const quotes = await getQuotes(time, locale);
  const strings = getStrings(locale);

  let quoteIndex = Math.floor(Math.random() * quotes.length);

  if (store.get('index')) {
    const urlParamsIndex = parseInt(store.get('index')!);
    if (!isNaN(urlParamsIndex) && quotes[urlParamsIndex]) {
      quoteIndex = urlParamsIndex;
    }
  }

  const requestedId = store.get('quote-id');
  if (requestedId) {
    const index = quotes.findIndex((quote) => quote.id === requestedId);
    if (index >= 0) quoteIndex = index;
  }

  if (variantStep) {
    const current = quotes.findIndex((quote) => quote.id === store.get('active-quote')?.id);
    if (current >= 0) quoteIndex = (current + variantStep + quotes.length) % quotes.length;
  }

  if (preserveQuote) {
    const id = store.get('active-quote')?.id;
    const index = quotes.findIndex((quote) => quote.id === id);
    if (index >= 0) quoteIndex = index;
  }

  const quote = Object.assign({}, quotes[quoteIndex]) as ResolvedQuote;
  quote.index = quoteIndex;
  quote.locale = locale;
  quote.time = time;
  quote.variants = quotes.length;
  quote.quote_raw = `${quote.quote_first}${quote.quote_time_case}${quote.quote_last}`.replace(/<br>/g, '\n');

  if (!quote.quote_time_case) {
    quote.quote_time_case = time;
    quote.fallback = true;
  }

  if (store.get('quote')) {
    quote.title = strings.title;
    quote.author = strings.author;
  }

  return quote;
}

export function cancelPendingQuote() {
  latestRequest++;
  cancelQuoteTransition();
}

export async function updateQuote({
  time = store.get('time') || (store.get('paused') ? store.get('active-quote')?.time : undefined) || getTime(),
  preserveQuote = false,
  variantStep = 0,
  locale: requestedLocale,
}: { time?: string; preserveQuote?: boolean; variantStep?: number; locale?: Locale } = {}) {
  const request = ++latestRequest;
  cancelQuoteTransition();
  const testQuote = store.get('quote');
  let locale = requestedLocale || (store.get('locale') as Locale);

  if (!locale) {
    return;
  }

  if (variantStep && store.get('active-quote')) {
    locale = store.get('active-quote')!.locale;
  } else if (!requestedLocale && store.get('random-locale') && !store.get('quote-id')) {
    locale = getRandomLocale();
  }

  const quote = await getQuote(time, locale, preserveQuote, variantStep);
  if (request !== latestRequest) return;
  const timeClass = quote.quote_time_case.replace(/<[^>]*>/g, '').length <= 11 ? 'time text-nowrap' : 'time';
  const blockquote = document.getElementById('quote');

  await transitionQuote(
    () => {
      showQuoteNotice(
        store.get('quote-id') && quote.id !== store.get('quote-id') ? readingStrings().quoteUnavailable : '',
        true,
      );
      store.set('active-quote', quote);
      updateGHLinks(time, quote, locale);
      if (store.get('theme')?.startsWith('photo')) {
        setDynamicBackgroundPicture();
      } else {
        removeBackgroundImage();
      }

      if (blockquote) {
        setTextLocale(blockquote, locale);
        applyLocaleThemeFont(blockquote);
        refreshDefaultFontLabel();
        blockquote.innerHTML = '';

        const p = document.createElement('p');
        if (testQuote) {
          p.textContent = testQuote;
        } else {
          p.append(quoteMarkup(quote.quote_first));
          const timeSpan = document.createElement('span');
          timeSpan.className = timeClass;
          timeSpan.append(quoteMarkup(quote.quote_time_case));
          p.append(timeSpan, quoteMarkup(quote.quote_last));
        }

        const cite = document.createElement('cite');
        cite.dir = 'auto';
        for (const [id, text] of [
          ['hyphen', '— '],
          ['title', quote.title],
          ['comma', ', '],
          ['author', quote.author],
        ]) {
          const span = document.createElement('span');
          span.id = id;
          if (id === 'title' || id === 'author') span.dir = 'auto';
          span.textContent = text;
          cite.append(span);
        }

        blockquote.appendChild(p);
        blockquote.appendChild(cite);
        renderTranslation();
        blockquote.setAttribute('aria-label', time);
        updateQuoteDescription();

        fitQuote();

        if (store.get('theme')?.includes('color')) {
          setTheme({
            syncToUrl: false,
          });
        }
      }
    },
    () => request === latestRequest,
  );

  if (request !== latestRequest) return;
  prefetchNextQuotes(locale);
}
