import { expect, it, vi } from 'vitest';
import { createStore, store } from '../store';
import { initFuzzyClock } from './fuzzy-clock';
import * as quotes from './quotes';

it('re-renders the active quote when fuzzy-clock setting changes', () => {
  createStore();
  const updateQuoteSpy = vi.spyOn(quotes, 'updateQuote').mockResolvedValue(undefined);
  initFuzzyClock();

  store.set('fuzzy-clock', true);
  expect(updateQuoteSpy).toHaveBeenCalledWith({ preserveQuote: true });

  updateQuoteSpy.mockClear();
  store.set('zen', true);
  expect(updateQuoteSpy).not.toHaveBeenCalled();

  store.set('fuzzy-clock', false);
  expect(updateQuoteSpy).toHaveBeenCalledWith({ preserveQuote: true });
});
