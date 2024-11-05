import { store } from '../store';

export function initCopy() {
  document.getElementById('copy')?.addEventListener('click', copyQuote);
}

function copyQuote() {
  if (document.body.classList.contains('quote-copied')) {
    return;
  }

  const quote = store.get('active-quote');

  if (quote) {
    navigator.clipboard.writeText(quote?.quote_raw);
  }

  document.body.classList.add('quote-copied');
  setTimeout(() => {
    document.body.classList.remove('quote-copied');
  }, 1500);
}
