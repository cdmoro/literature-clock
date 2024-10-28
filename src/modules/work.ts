import { updateQuote } from './quotes';
import { store } from '../store';

export function initWorkMode() {
  document.getElementById('work')?.addEventListener('click', toggleWorkMode);
}

function toggleWorkMode() {
  const quote = document.getElementById('quote');
  const isWorkMode = store.toggle('work');

  if ((isWorkMode && quote?.dataset.sfw === 'nsfw') || (!isWorkMode && quote?.dataset.fallback === 'true')) {
    updateQuote();
  }
}
