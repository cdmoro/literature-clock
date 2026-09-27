import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createStore, store } from '../store';
import { initBilingual, renderTranslation } from './bilingual';
vi.mock('../utils', () => ({ fitQuote: vi.fn() }));
const quote = {
  id: '1200-000',
  time: '12:00',
  locale: 'en-GB' as const,
  quote_first: 'At ',
  quote_time_case: 'noon',
  quote_last: '',
  title: 'Book',
  author: 'Author',
  sfw: 'sfw',
  fallback: false,
  variants: 1,
  index: 0,
  quote_raw: 'At noon',
};
beforeEach(() => {
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.body.innerHTML =
    '<button id="screensaver"></button><section id="settings-content"></section><blockquote id="quote"></blockquote>';
  createStore();
  store.set('active-quote', quote);
  initBilingual();
});
afterEach(() => {
  vi.unstubAllGlobals();
});
async function expand() {
  const details = document.querySelector<HTMLDetailsElement>('details')!;
  details.open = true;
  details.dispatchEvent(new Event('toggle'));
  await vi.waitFor(() => expect(details.textContent).not.toContain('Loading translation'));
  return details;
}
it('synchronizes both switches and persists the language', () => {
  document.getElementById('bilingual')!.click();
  expect(document.getElementById('settings-bilingual')!.getAttribute('aria-checked')).toBe('true');
  expect(document.querySelector('details')).not.toBeNull();
  const select = document.querySelector('select')!;
  select.value = 'fr-FR';
  select.dispatchEvent(new Event('change'));
  expect(JSON.parse(localStorage.getItem('settings')!)['translation-locale']).toBe('fr-FR');
  document.getElementById('settings-bilingual')!.click();
  expect(document.querySelector('details')).toBeNull();
  expect(document.getElementById('bilingual')!.getAttribute('aria-pressed')).toBe('false');
});
it('loads the matching ID only when expanded', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [
      { ...quote, id: 'other', quote_first: 'Wrong' },
      { ...quote, quote_first: 'Al ', quote_time_case: 'mediodía' },
    ],
  });
  vi.stubGlobal('fetch', fetch);
  store.set('bilingual', true);
  expect(fetch).not.toHaveBeenCalled();
  const details = await expand();
  expect(details.textContent).toContain('Al mediodía');
  expect(details.textContent).not.toContain('Wrong');
  expect(details.querySelector('[lang]')!.getAttribute('lang')).toBe('es-ES');
});
it('reports missing translations without using another quote', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ ...quote, id: 'other' }] }));
  store.set('bilingual', true);
  expect((await expand()).textContent).toContain('No published translation');
});
it('does not fetch the same language', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  store.set('translation-locale', 'en-GB');
  store.set('bilingual', true);
  expect((await expand()).textContent).toContain('already in the selected language');
  expect(fetch).not.toHaveBeenCalled();
});
it('discards a response after the quote changes', async () => {
  let resolve!: (value: unknown) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    ),
  );
  store.set('bilingual', true);
  const old = document.querySelector<HTMLDetailsElement>('details')!;
  old.open = true;
  old.dispatchEvent(new Event('toggle'));
  store.set('active-quote', { ...quote, id: '1200-001' });
  renderTranslation();
  resolve({ ok: true, json: async () => [{ ...quote, quote_first: 'Stale translation' }] });
  await Promise.resolve();
  await Promise.resolve();
  expect(document.getElementById('quote')!.textContent).not.toContain('Stale translation');
});
