import { afterEach, describe, expect, test, vitest } from 'vitest';
import { getStrings, initLocale } from './locales';
import { createStore, store } from '../store';
import { updateGHLinks } from '../utils';

afterEach(() => {
  vitest.restoreAllMocks();
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.body.innerHTML = '';
});

describe('locale settings', () => {
  test('preserves saved American English over the British browser language', () => {
    vitest.spyOn(navigator, 'language', 'get').mockReturnValue('en-GB');
    localStorage.setItem('settings', JSON.stringify({ locale: 'en-US' }));
    createStore();
    expect(store.get('locale')).toBe('en-US');
  });

  test('uses the British English URL locale over saved settings', () => {
    localStorage.setItem('settings', JSON.stringify({ locale: 'en-US' }));
    history.replaceState({}, '', '/?locale=en-GB');
    createStore();
    expect(store.get('locale')).toBe('en-GB');
    expect(new URLSearchParams(location.search).get('locale')).toBe('en-GB');
    expect(JSON.parse(localStorage.getItem('settings')!).locale).toBe('en-GB');
  });

  test('initializes British English with a standard HTML language tag', () => {
    history.replaceState({}, '', '/?locale=en');
    document.body.innerHTML =
      '<select id="locale-select"><option value="en-GB"></option><option value="en-US"></option></select>';
    createStore();
    initLocale();
    expect(document.querySelector<HTMLSelectElement>('#locale-select')?.value).toBe('en-GB');
    expect(document.documentElement.lang).toBe('en-GB');
    expect(getStrings('en-GB').colors).toBe('Colours');
    expect(getStrings('en-US').colors).toBe('Colors');
  });

  test('uses base locale strings for draft previews', () => {
    history.replaceState({}, '', '/?locale=de-DE-draft');
    document.body.innerHTML = '<select id="locale-select"></select>';
    createStore();
    initLocale();
    expect(document.title).toContain('Literaturuhr');
    expect(document.documentElement.lang).toBe('de-DE-draft');
  });

  test.each(['en-GB', 'en-US'] as const)('includes the full %s locale in issue links', (locale) => {
    document.body.innerHTML = '<a id="add-quote"></a><a id="report-error"></a>';
    updateGHLinks(
      '10:28',
      {
        id: '1028-000',
        quote_first: 'At ',
        quote_time_case: '10:28',
        quote_last: '.',
        title: 'Book',
        author: 'Author',
        sfw: 'sfw',
      },
      locale,
    );
    for (const id of ['add-quote', 'report-error']) {
      const url = new URL(document.querySelector<HTMLAnchorElement>(`#${id}`)!.href);
      expect(url.searchParams.get('title')).toContain(`[10:28] [${locale}]`);
      expect(url.searchParams.get('locale')).toBe(locale);
      expect(url.searchParams.get('time')).toBe('10:28');
    }
  });
});
