import { afterEach, expect, test, vi } from 'vitest';
import { loadGoogleFont, normalizeFontName } from './google-font';

afterEach(() => {
  document.head.querySelectorAll('link').forEach((link) => link.remove());
  vi.restoreAllMocks();
  vi.useRealTimers();
});

test('accepts family names and rejects URLs, CSS syntax and oversized inputs', () => {
  expect(normalizeFontName('  Noto   Sans  ')).toBe('Noto Sans');
  for (const name of [
    'https://example.com',
    'Lora; color:red',
    '<script>',
    'Lora&family=Roboto',
    '"Lora"',
    'a'.repeat(101),
  ]) {
    expect(normalizeFontName(name)).toBeUndefined();
  }
});

test('waits for font data after the Google stylesheet loads', async () => {
  Object.defineProperty(document, 'fonts', { configurable: true, value: { load: vi.fn().mockResolvedValue([{}]) } });
  const result = loadGoogleFont('Noto Sans');
  const link = document.head.querySelector('link')!;
  expect(new URL(link.href).hostname).toBe('fonts.googleapis.com');
  expect(new URL(link.href).searchParams.get('family')).toBe('Noto Sans');
  link.dispatchEvent(new Event('load'));
  await expect(result).resolves.toBeUndefined();
  expect(document.fonts.load).toHaveBeenCalledWith('16px "Noto Sans"');
});

test('rejects missing families even when a stylesheet loads successfully', async () => {
  Object.defineProperty(document, 'fonts', { configurable: true, value: { load: vi.fn().mockResolvedValue([]) } });
  const result = loadGoogleFont('Missing Font');
  const rejection = expect(result).rejects.toThrow('Font unavailable');
  document.head.querySelector('link')!.dispatchEvent(new Event('load'));
  await rejection;
  expect(document.head.querySelector('link')).toBeNull();
});

test('network errors and timeouts remove the failed stylesheet', async () => {
  const result = loadGoogleFont('Lora');
  const rejection = expect(result).rejects.toThrow();
  document.head.querySelector('link')!.dispatchEvent(new Event('error'));
  await rejection;
  vi.useFakeTimers();
  const timeout = expect(loadGoogleFont('Lora')).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(8000);
  await timeout;
  expect(document.head.querySelector('link')).toBeNull();
});
