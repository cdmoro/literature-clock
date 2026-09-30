import { store } from '../store';
import { getBaseLocale, getInterfaceLocale, getQuoteLocales, translateStrings } from './locales';
import { updateQuote } from './quotes';
import type { Locale } from '../types';

export function initLanguagePreferences() {
  const select = document.querySelector<HTMLSelectElement>('#ui-locale-select')!;
  const options = document.getElementById('quote-language-options')!;
  select.value = getBaseLocale(getInterfaceLocale());
  // Preserve the old random-language preference as an explicit selection of all languages.
  let selected = getQuoteLocales();
  if (!selected.length && store.get('quote-locales') !== '')
    selected = store.get('random-locale') ? Array.from(select.options, (option) => option.value as Locale) : [];
  const inputs = Array.from(select.options, (option) => {
    const label = document.createElement('label');
    label.className = 'language-chip';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'sr-only';
    input.value = option.value;
    input.checked = selected.includes(option.value as Locale);
    label.append(input, document.createElement('span'));
    options.append(label);
    return input;
  });
  const refresh = () => {
    document.getElementById('clear-languages-action')!.hidden = !inputs.some((input) => input.checked);
    inputs.forEach((input, index) => {
      const option = select.options[index];
      const name = (option.textContent || option.value).replace(`(${option.value})`, '').trim();
      input.nextElementSibling!.textContent = `${name} (${option.value})`;
    });
  };
  const changeQuoteLanguages = (languages: Locale[]) => {
    // Keep the current UI language when choosing a different quote catalogue.
    store.set('ui-locale', select.value as Locale);
    store.set('quote-locales', languages.join(','));
    store.set('locale', languages[0] || (select.value as Locale));
    store.set('random-locale', languages.length > 1);
    for (const key of ['quote-id', 'index'] as const) {
      store.set(key, undefined, false);
      store.removeFromUrl(key);
    }
    translateStrings(getInterfaceLocale());
    refresh();
    void updateQuote();
  };
  inputs.forEach((input) =>
    input.addEventListener('change', () => {
      const languages = inputs.filter((item) => item.checked).map((item) => item.value as Locale);
      changeQuoteLanguages(languages);
    }),
  );
  document.getElementById('select-all-languages')!.addEventListener('click', (event) => {
    event.preventDefault();
    inputs.forEach((input) => {
      input.checked = true;
    });
    changeQuoteLanguages(inputs.map((input) => input.value as Locale));
  });
  document.getElementById('clear-languages')!.addEventListener('click', (event) => {
    event.preventDefault();
    inputs.forEach((input) => {
      input.checked = false;
    });
    changeQuoteLanguages([]);
  });
  select.addEventListener('change', () => {
    store.set('ui-locale', select.value as Locale);
    translateStrings(getInterfaceLocale());
    refresh();
    if (!inputs.some((input) => input.checked)) {
      changeQuoteLanguages([]);
    }
  });
  translateStrings(getInterfaceLocale());
  refresh();
}
