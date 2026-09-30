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
  sfw: true,
  fallback: false,
  variants: 1,
  index: 0,
  quote_raw: 'At noon',
};
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
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
async function translationPanel() {
  const panel = document.getElementById('quote-translation')!;
  await vi.waitFor(() => expect(panel.textContent).not.toContain('Loading translation'));
  return panel;
}
it('synchronizes both switches and persists the language', () => {
  document.getElementById('bilingual')!.click();
  expect(document.getElementById('settings-bilingual')!.getAttribute('aria-checked')).toBe('true');
  expect(document.getElementById('quote-translation')).not.toBeNull();
  const select = document.querySelector('select')!;
  select.value = 'fr-FR';
  select.dispatchEvent(new Event('change'));
  expect(JSON.parse(localStorage.getItem('settings')!)['translation-locale']).toBe('fr-FR');
  document.getElementById('settings-bilingual')!.click();
  expect(document.getElementById('quote-translation')).toBeNull();
  expect(document.getElementById('bilingual')!.getAttribute('aria-pressed')).toBe('false');
});
it.each([true, false])('restores bilingual preferences after reload (keep URL: %s)', (keepUrl) => {
  document.getElementById('settings-bilingual')!.click();
  const select = document.querySelector<HTMLSelectElement>('#translation-locale')!;
  select.value = 'fr-FR';
  select.dispatchEvent(new Event('change'));

  if (!keepUrl) history.replaceState({}, '', '/');
  document.body.innerHTML =
    '<button id="screensaver"></button><section id="settings-content"></section><blockquote id="quote"></blockquote>';
  createStore();
  initBilingual();

  expect(store.get('bilingual')).toBe(true);
  expect(store.get('translation-locale')).toBe('fr-FR');
  expect(document.getElementById('settings-bilingual')!.getAttribute('aria-checked')).toBe('true');
  expect(document.getElementById('bilingual')!.getAttribute('aria-pressed')).toBe('true');
  expect(document.querySelector<HTMLSelectElement>('#translation-locale')!.value).toBe('fr-FR');
  expect(JSON.parse(localStorage.getItem('settings')!)).toMatchObject({
    bilingual: true,
    'translation-locale': 'fr-FR',
  });
});

it('lets URL bilingual preferences override saved settings', () => {
  localStorage.setItem('settings', JSON.stringify({ bilingual: true, 'translation-locale': 'fr-FR' }));
  history.replaceState({}, '', '/?bilingual=false&translation-locale=it-IT');
  createStore();
  expect(store.get('bilingual')).toBe(false);
  expect(store.get('translation-locale')).toBe('it-IT');
});

it('automatically loads the matching ID when enabled', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [
      { ...quote, id: 'other', quote_first: 'Wrong' },
      { ...quote, quote_first: 'Al ', quote_time_case: 'mediodía' },
    ],
  });
  vi.stubGlobal('fetch', fetch);
  store.set('bilingual', true);
  expect(fetch).toHaveBeenCalledOnce();
  expect(document.querySelector('details')).toBeNull();
  const details = await translationPanel();
  expect(details.textContent).toContain('Al mediodía');
  expect(details.textContent).not.toContain('Wrong');
  expect(details.querySelector('[lang]')!.getAttribute('lang')).toBe('es-ES');
});
it('reports missing translations without using another quote', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ ...quote, id: 'other' }] }));
  store.set('bilingual', true);
  expect((await translationPanel()).textContent).toContain('No published translation');
});

it.each([false, 'false', 'true', 'unknown', undefined])(
  'work mode excludes translations without an explicit boolean true: %s',
  async (sfw) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ ...quote, sfw }] }));
    store.set('work', true);
    store.set('bilingual', true);
    expect((await translationPanel()).textContent).toContain('No published translation');
  },
);
it('does not fetch the same language', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  store.set('translation-locale', 'en-GB');
  store.set('bilingual', true);
  expect(document.querySelector('.translation-notice')!.textContent).toBe(
    'This quote is already in the selected language.',
  );
  expect(store.get('bilingual')).toBe(true);
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
  const resolveOld = resolve;
  store.set('active-quote', { ...quote, id: '1200-001' });
  renderTranslation();
  resolveOld({ ok: true, json: async () => [{ ...quote, quote_first: 'Stale translation' }] });
  await Promise.resolve();
  await Promise.resolve();
  expect(document.getElementById('quote')!.textContent).not.toContain('Stale translation');
});

it('uses the interface selector labels and an explicit locale heading', async () => {
  store.set('translation-locale', 'it-IT');
  store.set('bilingual', true);
  expect(document.querySelector('option[value="it-IT"]')!.textContent).toBe('Italiano (it-IT)');
  expect(document.getElementById('translation-heading')!.textContent).toBe('Italian (it-IT)');
  expect(document.querySelector('#bilingual svg')!.getAttribute('width')).toBe('16');
});
