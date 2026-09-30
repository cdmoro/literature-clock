import { store } from '../store';
import { fitQuote } from '../utils';

export function updateQuoteDescription() {
  const quote = store.get('active-quote');
  if (!quote) return;
  const attribution = store.get('hide-book-title') ? quote.author : `${quote.title}, ${quote.author}`;
  document.getElementById('quote')?.setAttribute('aria-description', `${quote.quote_raw} (${attribution})`);
}

export function initHideBookTitle() {
  store.subscribe((state, previous) => {
    if (state['hide-book-title'] === previous['hide-book-title']) return;
    updateQuoteDescription();
    fitQuote();
  });
}
