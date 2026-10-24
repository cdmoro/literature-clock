import { store } from '../store';
import { updateQuote } from './quotes';

export function initFuzzyClock() {
  store.subscribe((state, previous) => {
    if (
      state['fuzzy-clock'] === previous['fuzzy-clock'] &&
      state['quote-attribution'] === previous['quote-attribution']
    ) return;
    void updateQuote({ preserveQuote: true });
  });
}
