import { MockInstance, beforeEach, describe, expect, test, vitest } from 'vitest';
import { resolveLocale } from './locales';

let language: MockInstance;

describe('resolveLocale', () => {
  beforeEach(() => {
    language = vitest.spyOn(window.navigator, 'language', 'get');
  });

  test('should return dominant locale en-GB when unsupported locale en-GB is passed', () => {
    const locale = resolveLocale('en-GB');
    expect(locale).toEqual('en-US');
  });

  test('should return dominant locale es-ES when unsupported locale es-AR is passed', () => {
    const locale = resolveLocale('es-AR');
    expect(locale).toEqual('es-ES');
  });

  test('should return en-US when unsupported locale is passed', () => {
    const locale = resolveLocale('zu-ZA');
    expect(locale).toEqual('en-US');
  });

  test('should return en-US when a non locale string is passed', () => {
    const locale = resolveLocale('foo');
    expect(locale).toEqual('en-US');
  });

  test('should use navigator language when no locale is passed', () => {
    language.mockReturnValue('it-IT');
    const locale = resolveLocale();
    expect(locale).toEqual('it-IT');
  });
});
