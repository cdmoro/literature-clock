import { describe, expect, test, vi } from 'vitest';
import { doFitQuote, fitQuote, getFaviconFileName } from '.';
import { createStore, store } from '../store';

describe('getFaviconFileName', () => {
  const TIMES = {
    '02:03': '02_00',
    '14:03': '02_00',
    '02:00': '02_00',
    '02:30': '02_30',
    '00:00': '00_00',
    '12:00': '00_00',
    '02:49': '02_30',
    '14:49': '02_30',
    '10:49': '10_30',
    '22:49': '10_30',
  };

  Object.entries(TIMES).forEach(([time, fileName]) => {
    test(`should return ${fileName} file name with ${time}`, () => {
      expect(getFaviconFileName(time)).toEqual(fileName);
    });
  });
});

test('refits Greek text when its font loads after the initial fitting window', () => {
  vi.useFakeTimers();
  const previous = Object.getOwnPropertyDescriptor(document, 'fonts');
  const fonts = new EventTarget();
  Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });
  let loaded = false;
  try {
    createStore();
    store.set('screensaver', false, false);
    document.body.innerHTML = '<blockquote id="quote" lang="el"><p style="max-height: 200px">Ελληνικό απόσπασμα</p><cite>Author</cite></blockquote>';
    const passage = document.querySelector<HTMLElement>('#quote > p')!;
    Object.defineProperty(passage, 'clientHeight', { get: () => 200 });
    Object.defineProperty(passage, 'scrollHeight', { get: () => parseFloat(passage.style.fontSize) * (loaded ? 6 : 2) });
    fitQuote();
    vi.advanceTimersByTime(1000);
    const initial = parseFloat(passage.style.fontSize);
    loaded = true;
    expect(passage.scrollHeight).toBeGreaterThan(201);
    fonts.dispatchEvent(new Event('loadingdone'));
    expect(parseFloat(passage.style.fontSize)).toBeLessThan(initial);
    expect(passage.scrollHeight).toBeLessThanOrEqual(201);
  } finally {
    if (previous) Object.defineProperty(document, 'fonts', previous);
    else Reflect.deleteProperty(document, 'fonts');
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
  }
});

test('fits replacement text immediately rather than leaving overflow until the next timer', () => {
  vi.useFakeTimers();
  try {
    createStore();
    document.body.innerHTML =
      '<blockquote id="quote" lang="ar" dir="rtl"><p>نص الاقتباس</p><cite>Author</cite><section id="quote-translation">Translation</section></blockquote>';
    const passage = document.querySelector<HTMLElement>('#quote > p')!;
    Object.defineProperty(passage, 'clientHeight', { get: () => 100 });
    Object.defineProperty(passage, 'scrollHeight', { get: () => parseFloat(passage.style.fontSize) * 4 });
    fitQuote();
    expect(passage.scrollHeight).toBeLessThanOrEqual(passage.clientHeight + 1);
  } finally {
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
  }
});

test('preserves the size of a short bilingual quote whose height follows its content', () => {
  createStore();
  document.body.innerHTML =
    '<blockquote id="quote" dir="rtl"><p>نص قصير</p><cite>Author</cite><section id="quote-translation">Translation</section></blockquote>';
  try {
    const passage = document.querySelector<HTMLElement>('#quote > p')!;
    const height = () => parseFloat(passage.style.fontSize) * 1.65;
    Object.defineProperty(passage, 'clientHeight', { get: height });
    Object.defineProperty(passage, 'scrollHeight', { get: height });
    doFitQuote();
    const size = passage.style.fontSize;
    expect(parseFloat(size)).toBeGreaterThan(10);
    doFitQuote();
    expect(passage.style.fontSize).toBe(size);
  } finally {
    document.body.innerHTML = '';
  }
});

test('fits the whole bilingual block even when the primary paragraph already fits', () => {
  vi.useFakeTimers();
  try {
    createStore();
    document.body.innerHTML =
      '<blockquote id="quote" lang="ar" dir="rtl"><p>نص قصير</p><cite>Book, Author</cite><section id="quote-translation">No translation available</section></blockquote>';
    const container = document.querySelector<HTMLElement>('#quote')!;
    const passage = container.querySelector<HTMLElement>('p')!;
    const cite = container.querySelector<HTMLElement>('cite')!;
    Object.defineProperty(passage, 'clientHeight', { get: () => 150 });
    Object.defineProperty(passage, 'scrollHeight', { get: () => parseFloat(passage.style.fontSize) });
    Object.defineProperty(container, 'clientHeight', { get: () => 120 });
    Object.defineProperty(container, 'scrollHeight', {
      get: () => parseFloat(passage.style.fontSize) + parseFloat(cite.style.fontSize || '60') + 60,
    });
    fitQuote();
    expect(container.scrollHeight).toBeLessThanOrEqual(container.clientHeight + 1);
    expect(parseFloat(passage.style.fontSize)).toBeGreaterThan(10);
  } finally {
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
  }
});

test.each(['base', 'retro', 'book', 'handwriting', 'anaglyph', 'whatsapp', 'frame', 'subtle', 'poster', 'horizon', 'kindle'])(
  '%s does not shrink tall glyphs that still fit within the theme height budget',
  (theme) => {
    createStore();
    store.set('theme', `${theme}-light`, false);
    document.body.innerHTML = '<blockquote id="quote"><p style="max-height: 400px">Short quote</p><cite>Author</cite></blockquote>';
    try {
      const passage = document.querySelector<HTMLElement>('#quote > p')!;
      Object.defineProperty(passage, 'clientHeight', { get: () => parseFloat(passage.style.fontSize) * 1.1 });
      Object.defineProperty(passage, 'scrollHeight', { get: () => parseFloat(passage.style.fontSize) * 1.4 });
      doFitQuote();
      expect(parseFloat(passage.style.fontSize)).toBeGreaterThanOrEqual(35);
    } finally {
      document.body.innerHTML = '';
      localStorage.clear();
      history.replaceState({}, '', '/');
    }
  },
);

test('reduces actual height and width overflow while keeping padding in the height budget', () => {
  createStore();
  document.body.innerHTML = '<blockquote id="quote"><p style="max-height: 100px; padding: 10px">Long quote</p><cite>Author</cite></blockquote>';
  try {
    const passage = document.querySelector<HTMLElement>('#quote > p')!;
    Object.defineProperty(passage, 'clientHeight', { get: () => 120 });
    Object.defineProperty(passage, 'scrollHeight', { get: () => parseFloat(passage.style.fontSize) * 3 + 20 });
    Object.defineProperty(passage, 'clientWidth', { get: () => 100 });
    Object.defineProperty(passage, 'scrollWidth', { get: () => parseFloat(passage.style.fontSize) * 4 });
    doFitQuote();
    expect(passage.scrollHeight).toBeLessThanOrEqual(121);
    expect(passage.scrollWidth).toBeLessThanOrEqual(101);
    expect(parseFloat(passage.style.fontSize)).toBeGreaterThan(10);
  } finally {
    document.body.innerHTML = '';
  }
});

test('bilingual decorations outside the natural block height do not shrink the quote', () => {
  createStore();
  document.body.innerHTML = '<blockquote id="quote" style="max-height: 500px"><p style="max-height: 200px">Short quote</p><cite>Author</cite><section id="quote-translation">Translation</section></blockquote>';
  try {
    const container = document.querySelector<HTMLElement>('#quote')!;
    const passage = container.querySelector<HTMLElement>('p')!;
    Object.defineProperty(passage, 'clientHeight', { get: () => parseFloat(passage.style.fontSize) });
    Object.defineProperty(passage, 'scrollHeight', { get: () => parseFloat(passage.style.fontSize) });
    Object.defineProperty(container, 'clientHeight', { get: () => parseFloat(passage.style.fontSize) + 100 });
    Object.defineProperty(container, 'scrollHeight', { get: () => container.clientHeight + 32 });
    doFitQuote();
    expect(parseFloat(passage.style.fontSize)).toBe(75);
  } finally {
    document.body.innerHTML = '';
  }
});

test('a long translation cannot shrink the original below a readable size', () => {
  createStore();
  document.body.innerHTML = '<blockquote id="quote" style="max-height: 120px"><p style="max-height: 30px">Original</p><cite>Author</cite><section id="quote-translation">Long translation</section></blockquote>';
  try {
    const container = document.querySelector<HTMLElement>('#quote')!;
    const passage = container.querySelector<HTMLElement>('p')!;
    const translation = container.querySelector<HTMLElement>('#quote-translation')!;
    Object.defineProperty(passage, 'scrollHeight', { get: () => parseFloat(passage.style.fontSize) * 3 });
    Object.defineProperty(container, 'scrollHeight', { get: () => 600 + parseFloat(passage.style.fontSize) });
    doFitQuote();
    expect(passage.style.fontSize).toBe('18px');
    expect(parseFloat(translation.style.fontSize)).toBeLessThan(parseFloat(passage.style.fontSize));
    expect(passage.style.maxHeight).toBe('none');
  } finally {
    document.body.innerHTML = '';
  }
});

test.each([1, 2])('measures RTL text instead of bubble decorations (text width factor %s)', (factor) => {
  createStore();
  store.set('theme', 'base-light', false);
  document.body.innerHTML = '<blockquote id="quote" dir="rtl"><p style="max-height: 400px">Arabic quote</p><cite>Author</cite></blockquote>';
  const passage = document.querySelector<HTMLElement>('#quote > p')!;
  Object.defineProperty(passage, 'clientWidth', { get: () => 100 });
  Object.defineProperty(passage, 'scrollWidth', { get: () => Math.max(100, parseFloat(passage.style.fontSize) * factor) + 15 });
  vi.spyOn(passage, 'getBoundingClientRect').mockReturnValue({ left: 0, right: 100 } as DOMRect);
  vi.spyOn(document, 'createRange').mockReturnValue({
    selectNodeContents: vi.fn(),
    getBoundingClientRect: () => ({ left: 0, right: parseFloat(passage.style.fontSize) * factor, width: parseFloat(passage.style.fontSize) * factor }),
  } as unknown as Range);
  try {
    doFitQuote();
    expect(passage.style.fontSize).toBe(factor === 1 ? '75px' : '50px');
  } finally {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    localStorage.clear();
  }
});

test('long single-language passages stay readable and scroll instead of overflowing', () => {
  createStore();
  document.body.innerHTML = '<blockquote id="quote"><p style="max-height: 30px">Long quote</p><cite>Author</cite></blockquote>';
  try {
    const container = document.querySelector<HTMLElement>('#quote')!;
    const passage = container.querySelector<HTMLElement>('p')!;
    Object.defineProperty(passage, 'scrollHeight', { get: () => parseFloat(passage.style.fontSize) * 3 });
    doFitQuote();
    expect(passage.style.fontSize).toBe('18px');
    expect(passage.style.maxHeight).toBe('none');
    expect(container.classList.contains('quote-scroll')).toBe(true);
  } finally {
    document.body.innerHTML = '';
    localStorage.clear();
  }
});
