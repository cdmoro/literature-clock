import { afterEach, expect, test, vi } from 'vitest';
import { createStore, store } from '../store';
import type { ResolvedQuote } from '../types';
import { openQuoteDetails } from './quote-details';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('keeps the selected quote and requests its exact source passage only when expanded', async () => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
  createStore();
  store.set('ui-locale', 'es-ES', false);
  const quote: ResolvedQuote = {
    id: '0059-002',
    locale: 'es-ES',
    time: '00:59',
    quote_first: 'Eran ',
    quote_time_case: 'casi la una',
    quote_last: '.',
    quote_raw: 'Eran casi la una.',
    title: 'Las aventuras de Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    sfw: true,
    variants: 1,
    fallback: false,
    index: 0,
  };
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        [quote.id]: {
          locale: 'fr-FR',
          time: '00:59',
          work: {
            'es-MX': 'https://example.com/es',
            'fr-FR': 'https://example.com/work-fr',
          },
          author: { de: 'https://example.com/author', ja: 'https://example.com/author-ja' },
          read: { 'en-GB': 'https://example.com/read', de: 'https://example.com/read-de' },
          passage: { 'fr-CA': 'https://example.com/passage', en: 'https://example.com/passage-en' },
        },
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: '0059-001', quote_time_case: 'wrong quote', sfw: true },
        {
          id: quote.id,
          quote_first: 'Il était ',
          quote_time_case: 'presque une heure',
          quote_last: '.',
          sfw: true,
          title: 'Les Aventures de Sherlock Holmes',
          author: 'Sir Arthur Conan Doyle',
        },
      ],
    });
  vi.stubGlobal('fetch', fetch);

  const button = document.createElement('button');
  document.body.append(button);
  openQuoteDetails(quote, button);
  store.set('active-quote', { ...quote, id: '0100-001', time: '01:00' }, false);
  const dialog = document.querySelector<HTMLDialogElement>('#quote-details')!;
  expect(dialog.querySelector('#quote-details-title')?.textContent).toBe('Detalle de la cita');
  expect(dialog.querySelector('.detail-metadata')?.textContent).toBe('Hora 00:59 · español (es-ES)');
  await vi.waitFor(() =>
    expect(dialog.querySelector('.detail-excerpt > details > summary')?.textContent).toBe('Cita original · francés (fr-FR)'),
  );
  expect(dialog.querySelector('.detail-attribution')?.textContent).toBe(
    '— Las aventuras de Sherlock Holmes, Arthur Conan Doyle',
  );
  expect(dialog.querySelector('.detail-time')?.textContent).toBe('casi la una');
  expect(dialog.querySelector('.detail-source')?.tagName).toBe('DETAILS');
  expect(dialog.querySelector('.detail-references h3')?.textContent).toBe('Seguir leyendo');
  expect(dialog.querySelector('.detail-links a[hreflang=es-MX]')?.getAttribute('href')).toBe('https://example.com/es');
  expect(dialog.querySelectorAll('.detail-links a svg').length).toBe(8);
  expect([...dialog.querySelectorAll('.detail-links a')].map((link) => link.textContent)).toEqual([
    'Leer el pasaje (francés)',
    'Sobre la obra',
    'Sobre el autor (alemán)',
    'Leer la obra completa (inglés)',
  ]);
  expect(dialog.querySelector('.detail-links a')?.getAttribute('target')).toBe('_blank');
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith('/quote-details/00.json');

  dialog.querySelector('details')!.open = true;
  await vi.waitFor(() => expect(dialog.querySelector('details .detail-time')?.textContent).toBe('presque une heure'));
  const sourceAttribution = dialog.querySelector('details .detail-attribution');
  expect(sourceAttribution?.getAttribute('lang')).toBe('fr-FR');
  expect(sourceAttribution?.textContent).toBe('— Les Aventures de Sherlock Holmes, Sir Arthur Conan Doyle');
  expect(fetch).toHaveBeenLastCalledWith(
    '/times/fr-FR/00_59.json',
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  dialog.querySelector<HTMLButtonElement>('.dialog-close')!.click();
  expect(document.getElementById('quote-details')).toBeNull();
  expect(document.activeElement).toBe(button);

  // A saved quote can keep an old time. Its stable ID still selects the cached file.
  openQuoteDetails({ ...quote, time: '12:00' }, button);
  await vi.waitFor(() => expect(document.querySelector('.detail-links a')).not.toBeNull());
  expect(fetch).toHaveBeenCalledTimes(2);
  document.querySelector<HTMLButtonElement>('#quote-details .dialog-close')!.click();

  const nextQuote = { ...quote, id: '0100-001', time: '01:00' };
  fetch.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      [nextQuote.id]: {
        locale: 'pt-BR',
        time: '01:00',
        author: {
          es: 'https://example.com/another-author',
          pt: 'https://example.com/author-pt',
          'pt-BR': 'https://example.com/author-br',
          'pt-PT': 'https://example.com/author-pt-pt',
        },
        read: { pt: 'https://example.com/read-pt', 'pt-PT': 'https://example.com/read-pt-pt' },
      },
    }),
  });
  openQuoteDetails(nextQuote, button);
  await vi.waitFor(() => expect(fetch).toHaveBeenLastCalledWith('/quote-details/01.json'));
  await vi.waitFor(() =>
    expect(document.querySelector('#quote-details')?.textContent).toContain('No se pudo cargar el texto de referencia.'),
  );
  document.querySelector<HTMLButtonElement>('#quote-details .dialog-close')!.click();
  openQuoteDetails(nextQuote, button);
  await vi.waitFor(() => {
    expect(document.querySelector('.detail-links a')?.getAttribute('href')).toBe('https://example.com/another-author');
  });
  expect(fetch).toHaveBeenCalledTimes(4);
  document.querySelector<HTMLButtonElement>('#quote-details .dialog-close')!.click();

  store.set('ui-locale', 'pt-BR', false);
  openQuoteDetails({ ...nextQuote, locale: 'pt-PT' }, button);
  await vi.waitFor(() => {
    expect(document.querySelector('#quote-details-title')?.textContent).toBe('Detalhes da citação');
    expect(document.querySelector('.detail-metadata')?.textContent).toBe('Hora 01:00 · português (pt-PT)');
    expect([...document.querySelectorAll<HTMLAnchorElement>('.detail-links a')].map((link) => link.href)).toEqual([
      'https://example.com/author-br',
      'https://example.com/read-pt',
    ]);
  });
  expect(document.querySelector('details.detail-source > summary')?.textContent).toBe('Citação original · português (pt-BR)');
  expect(fetch).toHaveBeenCalledTimes(4);
  document.querySelector<HTMLButtonElement>('#quote-details .dialog-close')!.click();

  openQuoteDetails({ ...nextQuote, locale: 'pt-BR' }, button);
  await vi.waitFor(() =>
    expect(document.querySelector('.detail-source-note')?.textContent).toBe('Você já está lendo a citação de referência.'),
  );
  expect(document.querySelector('details.detail-source')).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(4);
});
