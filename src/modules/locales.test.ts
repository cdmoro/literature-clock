import { MockInstance, beforeEach, describe, expect, test, vitest } from 'vitest';
import { resolveLocale } from './locales';

let language: MockInstance;

describe('resolveLocale', () => {
  test.each([
    ['en-US', 'en-US'],
    ['en-UK', 'en-UK'],
    ['en', 'en-UK'],
    ['en-AU', 'en-UK'],
    ['EN-us', 'en-US'],
    ['en_US', 'en-US'],
    ['en-US-u-hc-h12', 'en-US'],
    ['en-GB-u-hc-h23', 'en-UK'],
    ['pt', 'pt-PT'],
    ['fr-FR', 'fr-FR'],
    ['de-DE', 'de-DE'],
    ['zu', 'en-UK'],
    ['', 'en-UK'],
  ])('resolves %s to %s', (input, expected) => {
    expect(resolveLocale(input)).toBe(expected);
  });
  beforeEach(() => {
    language = vitest.spyOn(window.navigator, 'language', 'get');
  });

  test('should return en-UK when browser locale en-GB is passed', () => {
    const locale = resolveLocale('en-GB');
    expect(locale).toEqual('en-UK');
  });

  test('should return dominant locale es-ES when unsupported locale es-AR is passed', () => {
    const locale = resolveLocale('es-AR');
    expect(locale).toEqual('es-ES');
  });

  test('should return en-UK when unsupported locale is passed', () => {
    const locale = resolveLocale('zu-ZA');
    expect(locale).toEqual('en-UK');
  });

  test('should return en-UK when a non locale string is passed', () => {
    const locale = resolveLocale('foo');
    expect(locale).toEqual('en-UK');
  });

  test('should use navigator language when no locale is passed', () => {
    language.mockReturnValue('it-IT');
    const locale = resolveLocale();
    expect(locale).toEqual('it-IT');
  });
});
