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
    const credit = document.getElementById('quote-credit');
    if (credit) {
      const quote = store.get('active-quote');
      if (quote) {
        credit.replaceChildren();
        if (!state['hide-book-title']) {
          credit.append(document.createTextNode(quote.title), document.createElement('br'));
        }
        credit.append(document.createTextNode(quote.author));
      }
    }
    fitQuote();
  });
}
