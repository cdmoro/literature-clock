import { MockInstance, beforeEach, describe, expect, test, vitest } from 'vitest';
import { resolveLocale } from './locales';

let language: MockInstance;

describe('resolveLocale', () => {
  test.each([
    ['en-US', 'en-US'],
    ['en-GB', 'en-GB'],
    ['en-UK', 'en-GB'],
    ['EN_gb', 'en-GB'],
    ['EN_uk', 'en-GB'],
    ['en-UK-u-hc-h23', 'en-GB'],
    ['en', 'en-GB'],
    ['en-AU', 'en-GB'],
    ['EN-us', 'en-US'],
    ['en_US', 'en-US'],
    ['en-US-u-hc-h12', 'en-US'],
    ['en-GB-u-hc-h23', 'en-GB'],
    ['pt', 'pt-PT'],
    ['fr-FR', 'fr-FR'],
    ['de-DE', 'de-DE'],
    ['zu', 'en-GB'],
    ['', 'en-GB'],
  ])('resolves %s to %s', (input, expected) => {
    expect(resolveLocale(input)).toBe(expected);
  });
  beforeEach(() => {
    language = vitest.spyOn(window.navigator, 'language', 'get');
  });

  test('should return en-GB when browser locale en-GB is passed', () => {
    const locale = resolveLocale('en-GB');
    expect(locale).toEqual('en-GB');
  });

  test('should return dominant locale es-ES when unsupported locale es-AR is passed', () => {
    const locale = resolveLocale('es-AR');
    expect(locale).toEqual('es-ES');
  });

  test('should return en-GB when unsupported locale is passed', () => {
    const locale = resolveLocale('zu-ZA');
    expect(locale).toEqual('en-GB');
  });

  test('should return en-GB when a non locale string is passed', () => {
    const locale = resolveLocale('foo');
    expect(locale).toEqual('en-GB');
  });

  test('should use navigator language when no locale is passed', () => {
    language.mockReturnValue('it-IT');
    const locale = resolveLocale();
    expect(locale).toEqual('it-IT');
  });
});
