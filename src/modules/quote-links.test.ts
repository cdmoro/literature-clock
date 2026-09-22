import { beforeEach, expect, it, vi } from 'vitest';
import { getQuoteUrl } from './quote-links';
import type { ResolvedQuote } from '../types';
const { settings } = vi.hoisted(() => ({ settings: {} as Record<string, unknown> }));
vi.mock('../store', () => ({ store: { get: (key: string) => settings[key] } }));
const quote = { id: '1200-000', time: '12:00', locale: 'es-ES', fallback: false } as ResolvedQuote;
beforeEach(() => {
  Object.keys(settings).forEach((key) => delete settings[key]);
  history.replaceState({}, '', '/?locale=en-GB&index=3&random-locale=true&quote=preview');
});
it('links the displayed locale and minute rather than the current clock or preferences', () => {
  settings.theme = 'base-dark';
  settings.font = 'Lora';
  const url = new URL(getQuoteUrl(quote)!);
  expect(Object.fromEntries(url.searchParams)).toEqual({
    locale: 'es-ES',
    time: '12:00',
    'quote-id': '1200-000',
    'random-locale': 'false',
    theme: 'base-dark',
    font: 'Lora',
  });
});
it('does not generate misleading links for fallback or custom preview text', () => {
  expect(getQuoteUrl({ ...quote, fallback: true })).toBeUndefined();
  settings.quote = 'preview';
  expect(getQuoteUrl(quote)).toBeUndefined();
});
