import { afterEach, expect, test, vi } from 'vitest';
import { createStore, store, parseUrlParams } from '../store';
import { quoteMarkup } from '../utils/quote-markup';
import { updateQuote } from './quotes';
import { initClock } from './clock';

vi.mock('../utils', () => ({
  fitQuote: vi.fn(),
  getTime: () => '12:00',
  getLiveTime: () => '12:00',
  updateGHLinks: vi.fn(),
  updateFavicon: vi.fn(),
}));
vi.mock('./themes', () => ({
  removeBackgroundImage: vi.fn(),
  setDynamicBackgroundPicture: vi.fn(),
  setTheme: vi.fn(),
}));
vi.mock('./transitions', () => ({
  cancelQuoteTransition: vi.fn(),
  transitionQuote: async (render: () => void, current: () => boolean) => {
    if (current()) render();
  },
}));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.body.innerHTML = '';
});

test('rejects unknown keys, malformed values and runtime-only state', () => {
  expect(
    parseUrlParams(
      new URLSearchParams('theme=true&time=<img>&index=-1&progress=101&zen=yes&active-quote=x&custom-font=x&unknown=x'),
    ),
  ).toEqual({});
  expect(parseUrlParams(new URLSearchParams('quote=true&time=23:59&index=0&zen=false'))).toEqual({
    quote: 'true',
    time: '23:59',
    index: '0',
    zen: false,
  });
});

test.each(['{bad', 'null', '[]', '{"theme":true,"font":12,"color":{},"zen":"false"}'])(
  'recovers from invalid saved settings: %s',
  (settings) => {
    localStorage.setItem('settings', settings);
    createStore();
    expect(store.get('theme')).toBe('base-system');
    expect(store.get('zen')).toBe(false);
  },
);

test('invalid URL settings retain valid saved preferences', () => {
  localStorage.setItem('settings', JSON.stringify({ theme: 'retro-dark', transition: 'slide', time: '01:00' }));
  history.replaceState({}, '', '/?theme=false&transition=invalid');
  createStore();
  expect(store.get('theme')).toBe('retro-dark');
  expect(store.get('transition')).toBe('slide');
  expect(store.get('time')).toBeUndefined();
});

test('continues with browser storage unavailable', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('denied');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('denied');
  });
  createStore();
  expect(() => store.toggle('zen')).not.toThrow();
});

test('retains safe formatting without executable markup or attributes', () => {
  const div = document.createElement('div');
  div.append(
    quoteMarkup(
      '<em onclick="bad()">Hello</em><br><img src=x onerror="bad()"><script>bad()</script><svg onload="bad()"></svg>',
    ),
  );
  expect(div.innerHTML).toBe('<em>Hello</em><br>');
});

const quote = (text: string) => ({
  quote_first: text,
  quote_time_case: 'noon',
  quote_last: '.',
  title: '<img src=x>',
  author: '<script>bad()</script>',
  sfw: true,
});
const response = (text: string) => ({ ok: true, json: async () => [quote(text)] }) as Response;

test('an older fetch cannot replace the latest quote or locale', async () => {
  createStore();
  document.body.innerHTML = '<blockquote id="quote"></blockquote>';
  let finish!: (value: Response) => void;
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValue(response('New')),
  );
  const first = updateQuote();
  store.set('locale', 'es-ES', false);
  await updateQuote();
  finish(response('Old'));
  await first;
  expect(document.querySelector('p')?.textContent).toBe('Newnoon.');
  expect(store.get('active-quote')?.locale).toBe('es-ES');
  expect(document.querySelector('cite img, cite script')).toBeNull();
});

test('preview quotes are rendered as plain text', async () => {
  history.replaceState({}, '', '/?quote=' + encodeURIComponent('<img src=x onerror=bad()>'));
  createStore();
  document.body.innerHTML = '<blockquote id="quote"></blockquote>';
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response('Ignored')));
  await updateQuote();
  expect(document.querySelector('p')?.textContent).toBe('<img src=x onerror=bad()>');
  expect(document.querySelector('p img')).toBeNull();
});

test('progress work stops when disabled and all clock timers stop in a hidden tab', () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response('Clock')));
  createStore();
  document.body.innerHTML = '<div id="progress-bar"></div>';
  initClock();
  expect(vi.getTimerCount()).toBe(2);
  store.set('progressbar', false, false);
  expect(vi.getTimerCount()).toBe(1);
  const width = document.getElementById('progress-bar')!.style.width;
  vi.advanceTimersByTime(500);
  expect(document.getElementById('progress-bar')!.style.width).toBe(width);
  hidden.mockReturnValue(true);
  document.dispatchEvent(new Event('visibilitychange'));
  expect(vi.getTimerCount()).toBe(0);
  store.set('progressbar', true, false);
  expect(vi.getTimerCount()).toBe(0);
  hidden.mockReturnValue(false);
  document.dispatchEvent(new Event('visibilitychange'));
  expect(vi.getTimerCount()).toBe(2);
});

test('validates new reading links and preserves language and book preferences', () => {
  localStorage.setItem(
    'settings',
    JSON.stringify({
      'ui-locale': 'es-ES',
      'quote-locales': 'en-GB,fr-FR',
      theme: 'book-dark',
      'quote-id': '1200-001',
      paused: true,
    }),
  );
  createStore();
  expect(store.get('ui-locale')).toBe('es-ES');
  expect(store.get('quote-locales')).toBe('en-GB,fr-FR');
  expect(store.get('theme')).toBe('book-dark');
  expect(store.get('quote-id')).toBeUndefined();
  expect(store.get('paused')).toBeUndefined();
  expect(parseUrlParams(new URLSearchParams('quote-id=2359-001&quote-locales=&ui-locale=es-ES'))).toEqual({
    'quote-id': '2359-001',
    time: '23:59',
    'quote-locales': '',
    'ui-locale': 'es-ES',
  });
  expect(parseUrlParams(new URLSearchParams('quote-id=2460-001&paused=true&quote-locales=<img>'))).toEqual({});
});
