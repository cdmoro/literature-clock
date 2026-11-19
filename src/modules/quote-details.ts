import { store } from '../store';
import STRINGS from '../strings/common/quote-details.json';
import type { Quote, ResolvedQuote } from '../types';
import { closeDialogOnBackdropClick } from '../utils/dialog';
import { isCollectible } from '../utils/quote-collection';
import { appendQuotePassage } from '../utils/quote-markup';
import { setTextLocale } from '../utils/text-direction';
import { getBaseLocale, getInterfaceLocale } from './locales';
import { readingIcon } from './reading-icons';
import { readingStrings } from './reading-ui';

type Links = Record<string, string>;
type QuoteDetails = {
  locale?: string;
  time?: string;
  author?: Links;
  work?: Links;
  read?: Links;
  passage?: Links;
};

const detailRequests = new Map<string, Promise<Record<string, QuoteDetails>>>();

function loadDetails(id: string) {
  // Match the generator's stable ID partition, including IDs without an hour prefix.
  const prefix = id.slice(0, 2);
  const hour = /^(?:[01][0-9]|2[0-3])$/.test(prefix) ? prefix : '00';
  const cached = detailRequests.get(hour);
  if (cached) return cached;

  const request = fetch(`/quote-details/${hour}.json`)
    .then((response) => {
      if (!response.ok) throw new Error('Could not load quote details');
      return response.json() as Promise<Record<string, QuoteDetails>>;
    })
    .catch((error) => {
      detailRequests.delete(hour);
      throw error;
    });
  detailRequests.set(hour, request);
  return request;
}

export function quoteDetailLabel() {
  return STRINGS[getBaseLocale(getInterfaceLocale())].quoteDetail;
}

function passage(quote: Quote, locale: string) {
  const element = document.createElement('p');
  element.className = 'detail-passage';
  setTextLocale(element, locale);
  appendQuotePassage(element, quote, locale, false, (time) => time.classList.add('detail-time'));
  return element;
}

function renderAttribution(quote: Quote, locale: string, useOriginalNames = false) {
  const title = (useOriginalNames && quote.title_original) || quote.title;
  const author = (useOriginalNames && quote.author_original) || quote.author;
  const attribution = document.createElement('p');
  attribution.className = 'detail-attribution';
  setTextLocale(attribution, locale);
  const bookName = document.createElement('bdi');
  bookName.className = 'detail-book';
  bookName.textContent = title;
  const authorName = document.createElement('bdi');
  authorName.textContent = author;
  attribution.append('— ');
  if (title) attribution.append(bookName);
  if (title && author) attribution.append(', ');
  if (author) attribution.append(authorName);
  attribution.hidden = !title && !author;
  return attribution;
}

function renderReferences(
  details: QuoteDetails,
  uiLocale: string,
  sourceLocale: string,
  labels: (typeof STRINGS)['en-GB'],
) {
  const list = document.createElement('ul');
  list.className = 'detail-links';
  const language = uiLocale.split('-')[0];
  const names = new Intl.DisplayNames([uiLocale], { type: 'language', languageDisplay: 'standard' });
  const references = [
    [details.passage, labels.quotePassageSource, 'document'],
    [details.work, labels.quoteAboutWork, 'book'],
    [details.author, labels.quoteAboutAuthor, 'person'],
    [details.read, labels.quoteReadWork, 'book-open'],
  ] as const;
  for (const [links, label, icon] of references) {
    if (!links) continue;
    const available = Object.keys(links).sort();
    const sourceLanguage = sourceLocale.split('-')[0];
    const locale = [
      uiLocale,
      language,
      ...available.filter((key) => key.startsWith(`${language}-`)),
      sourceLocale,
      sourceLanguage,
      ...available.filter((key) => key.startsWith(`${sourceLanguage}-`)),
      'en',
      ...available.filter((key) => key.startsWith('en-')),
      ...available,
    ].find((candidate) => links[candidate]);
    if (!locale) continue;
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = links[locale];
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.hreflang = locale;
    const caption = document.createElement('span');
    const linkLanguage = locale.split('-')[0];
    caption.textContent = linkLanguage === language ? label : `${label} (${names.of(linkLanguage) || linkLanguage})`;
    link.insertAdjacentHTML('afterbegin', readingIcon(icon));
    link.append(caption);
    link.insertAdjacentHTML('beforeend', readingIcon('external'));
    item.append(link);
    list.append(item);
  }
  if (!list.childElementCount) return;
  const section = document.createElement('section');
  section.className = 'detail-references';
  section.setAttribute('aria-labelledby', 'detail-references-title');
  const heading = document.createElement('h3');
  heading.id = 'detail-references-title';
  heading.textContent = labels.quoteMoreInformation;
  section.append(heading, list);
  return section;
}

export function openQuoteDetails(quote: ResolvedQuote, trigger: HTMLButtonElement) {
  if (document.getElementById('quote-details')) return;
  const uiLocale = getBaseLocale(getInterfaceLocale());
  const labels = STRINGS[uiLocale];
  const dialog = document.createElement('dialog');
  dialog.id = 'quote-details';
  dialog.setAttribute('aria-labelledby', 'quote-details-title');
  dialog.setAttribute('data-html2canvas-ignore', '');
  setTextLocale(dialog, uiLocale);

  const header = document.createElement('header');
  const title = document.createElement('h2');
  title.id = 'quote-details-title';
  title.tabIndex = -1;
  const titleTime = document.createElement('span');
  titleTime.className = 'detail-heading-time';
  const time = document.createElement('bdi');
  time.textContent = quote.time;
  const [timePrefix, timeSuffix] = labels.quoteDetailTime.split('{time}');
  titleTime.append('· ', timePrefix, time, timeSuffix);
  title.append(labels.quoteDetail, ' ', titleTime);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'dialog-close';
  close.innerHTML = readingIcon('close');
  close.setAttribute('aria-label', readingStrings().close);
  close.addEventListener('click', () => dialog.close());
  header.append(title, close);

  const excerpt = document.createElement('figure');
  excerpt.className = 'detail-excerpt';
  const excerptBody = document.createElement('div');
  excerptBody.className = 'detail-excerpt-body';
  excerptBody.append(
    passage(quote, quote.locale),
    renderAttribution(quote, quote.locale, store.get('show-original-attributions')),
  );
  excerpt.append(excerptBody);
  const supplemental = document.createElement('div');
  const controller = new AbortController();
  dialog.append(header, excerpt, supplemental);
  document.body.append(dialog);
  closeDialogOnBackdropClick(dialog);
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    dialog.close();
  });
  dialog.addEventListener('close', () => {
    controller.abort();
    dialog.remove();
    if (trigger.isConnected) trigger.focus();
  });
  dialog.showModal();
  title.focus();

  void loadDetails(quote.id)
    .then((index) => {
      const details = Object.prototype.hasOwnProperty.call(index, quote.id) ? index[quote.id] : undefined;
      if (!details || !dialog.open) return;
      const sourceLocale = details.locale;
      const sourceTime = details.time;
      if (sourceLocale && sourceTime) {
        const names = new Intl.DisplayNames([uiLocale], { type: 'language', languageDisplay: 'standard' });
        const languageName = names.of(sourceLocale.split('-')[0]) || sourceLocale;
        const sourceLabel = `${labels.quoteSourceText} · ${languageName} (${sourceLocale})`;
        if (sourceLocale === quote.locale) {
          const note = document.createElement('p');
          note.className = 'detail-source detail-original-label';
          note.textContent = sourceLabel;
          excerpt.append(note);
        } else {
          const disclosure = document.createElement('details');
          disclosure.className = 'detail-source';
          const summary = document.createElement('summary');
          summary.textContent = sourceLabel;
          const status = document.createElement('p');
          status.className = 'detail-source-status';
          status.setAttribute('role', 'status');
          disclosure.append(summary, status);
          let loading = false;
          let loaded = false;
          disclosure.addEventListener('toggle', async () => {
            if (!disclosure.open || loading || loaded) return;
            loading = true;
            status.textContent = '…';
            try {
              const response = await fetch(`/times/${sourceLocale}/${sourceTime.replace(':', '_')}.json`, {
                signal: controller.signal,
              });
              if (!response.ok) throw new Error('Missing source catalogue');
              const original = ((await response.json()) as Quote[]).find(
                (item) => item.id === quote.id && (!store.get('work') || item.sfw),
              );
              if (!original) throw new Error('Missing source passage');
              if (dialog.open) {
                disclosure.append(passage(original, sourceLocale), renderAttribution(original, sourceLocale));
              }
              status.remove();
              loaded = true;
            } catch {
              if (dialog.open) status.textContent = labels.quoteSourceUnavailable;
            } finally {
              loading = false;
            }
          });
          excerpt.append(disclosure);
        }
      }
      const links = renderReferences(details, uiLocale, sourceLocale || quote.locale, labels);
      if (links) supplemental.append(links);
    })
    .catch(() => {
      if (dialog.open) supplemental.textContent = labels.quoteSourceUnavailable;
    });
}

export function initQuoteDetails() {
  const group = document.getElementById('quote-actions');
  if (!group || store.get('static')) return;
  const button = document.createElement('button');
  button.id = 'open-quote-details';
  button.type = 'button';
  button.innerHTML = readingIcon('info');
  button.setAttribute('aria-haspopup', 'dialog');
  button.addEventListener('click', () => {
    const quote = store.get('active-quote');
    if (isCollectible(quote) && !store.get('quote')) openQuoteDetails(quote, button);
  });
  group.append(button);
  const refresh = () => {
    button.title = quoteDetailLabel();
    button.setAttribute('aria-label', button.title);
    button.disabled = !isCollectible(store.get('active-quote')) || !!store.get('quote');
  };
  store.subscribe(refresh);
  refresh();
}
