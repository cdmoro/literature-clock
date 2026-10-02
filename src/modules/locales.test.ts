import { MockInstance, beforeEach, describe, expect, test, vitest } from 'vitest';
import { resolveLocale } from './locales';

let language: MockInstance;

describe('resolveLocale', () => {
  test.each([
    ['en-US', 'en-US'],
    ['en-GB', 'en-GB'],
    ['EN_gb', 'en-GB'],
    ['en', 'en-GB'],
    ['en-AU', 'en-GB'],
    ['EN-us', 'en-US'],
    ['en_US', 'en-US'],
    ['en-US-u-hc-h12', 'en-US'],
    ['en-GB-u-hc-h23', 'en-GB'],
    ['pt', 'pt-PT'],
    ['fr-FR', 'fr-FR'],
    ['de-DE', 'de-DE'],
    ['en-GB-draft', 'en-GB-draft'],
    ['de-DE-draft', 'de-DE-draft'],
    ['el-GR-draft', 'el-GR-draft'],
    ['eo-draft', 'eo-draft'],
    ['eo', 'eo'],
    ['EO', 'eo'],
    ['eo-001', 'eo'],
    ['eo-u-hc-h23', 'eo'],
    ['EO_DRAFT', 'eo-draft'],
    ['../../eo-draft', 'en-GB-draft'],
    ['EL_gr_DRAFT', 'el-GR-draft'],
    ['el', 'el-GR'],
    ['ru', 'ru-RU'],
    ['RU_ru', 'ru-RU'],
    ['ru-UA', 'ru-RU'],
    ['ru-RU-u-hc-h23', 'ru-RU'],
    ['ru-RU-draft', 'ru-RU-draft'],
    ['zh', 'zh-CN'],
    ['ZH_cn', 'zh-CN'],
    ['zh-CN-u-hc-h23', 'zh-CN'],
    ['zh-CN-draft', 'zh-CN-draft'],
    ['el-GR', 'el-GR'],
    ['../../el-GR-draft', 'en-GB-draft'],
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
