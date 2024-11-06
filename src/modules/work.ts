import { updateQuote } from './quotes';
import { store } from '../store';

export function initWorkMode() {
  document.getElementById('work')?.addEventListener('click', toggleWorkMode);
}

function toggleWorkMode() {
  const isWorkMode = store.toggle('work');
  const quote = store.get('active-quote');

  if ((isWorkMode && quote?.sfw === 'nsfw') || (!isWorkMode && quote?.fallback)) {
    updateQuote();
  }
}
