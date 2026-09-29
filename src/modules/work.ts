import { updateQuote } from './quotes';
import { store } from '../store';

export function initWorkMode() {
  document.getElementById('work')?.addEventListener('click', toggleWorkMode);
}

function toggleWorkMode() {
  store.toggle('work');
  const quote = store.get('active-quote');

  void updateQuote({ time: quote?.time, locale: quote?.locale, preserveQuote: true });
}
