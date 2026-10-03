import { describe, expect, test, vi } from 'vitest';
import { fitQuote, getFaviconFileName } from '.';
import { createStore } from '../store';

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
    expect(passage.scrollHeight).toBeLessThanOrEqual(passage.clientHeight - 10);
  } finally {
    vi.clearAllTimers();
    vi.useRealTimers();
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
