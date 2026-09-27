import { beforeEach, expect, test } from 'vitest';
import { updateGHLinks } from './index';

const quote = {
  id: '2336-000',
  title: 'Infinite Jest',
  author: 'David Foster Wallace',
  quote_first: 'Then<br>',
  quote_time_case: '2336',
  quote_last: '.',
  sfw: 'sfw',
};

beforeEach(() => {
  document.body.innerHTML = '<a id="report-error"></a>';
  history.replaceState({}, '', '/?locale=es-ES&random-locale=true&quote=preview&index=2');
});

function reportUrl(text?: string) {
  updateGHLinks('23:36', text === undefined ? quote : { ...quote, quote_first: text }, 'en-US');
  return new URL(document.querySelector<HTMLAnchorElement>('#report-error')!.href);
}

test('prefills a direct link to the displayed quote without unrelated page settings', () => {
  const url = reportUrl();
  const direct = new URL(url.searchParams.get('quote-url')!);
  expect(direct.origin).toBe(location.origin);
  expect(Object.fromEntries(direct.searchParams)).toEqual({
    locale: 'en-US',
    time: '23:36',
    'quote-id': '2336-000',
  });
  expect(url.searchParams.get('quote')).toBe('Then 2336.');
});

test.each(['a', 'é', '漢', '📚', '&?#\n'])('limits the encoded URL for long %s quotes', (character) => {
  const url = reportUrl(character.repeat(3000));
  expect(url.href.length).toBeLessThanOrEqual(2048);
  const shortened = url.searchParams.get('quote')!;
  expect(shortened.endsWith('…')).toBe(true);
  expect(shortened).not.toContain('�');
  expect((character.repeat(3000) + '2336.').startsWith(shortened.slice(0, -1))).toBe(true);
  expect(url.searchParams.get('book')).toBe(quote.title);
  expect(url.searchParams.get('author')).toBe(quote.author);
  expect(new URL(url.searchParams.get('quote-url')!).searchParams.get('quote-id')).toBe(quote.id);
});

test('keeps text at the exact limit and truncates when it exceeds it', () => {
  const available = 2048 - reportUrl('').href.length;
  const exact = reportUrl('a'.repeat(available));
  expect(exact.href.length).toBe(2048);
  expect(exact.searchParams.get('quote')).toBe('a'.repeat(available) + '2336.');
  const over = reportUrl('a'.repeat(available + 1));
  expect(over.href.length).toBeLessThanOrEqual(2048);
  expect(over.searchParams.get('quote')).toMatch(/…$/);
});
