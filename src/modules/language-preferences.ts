import { store } from '../store';
import { getBaseLocale, getInterfaceLocale, getQuoteLocales, translateStrings } from './locales';
import { updateQuote } from './quotes';
import type { Locale } from '../types';

export function initLanguagePreferences() {
  const select = document.querySelector<HTMLSelectElement>('#ui-locale-select')!;
  const follow = document.querySelector<HTMLInputElement>('#follow-ui-language')!;
  const options = document.getElementById('quote-language-options')!;
  select.value = getBaseLocale(getInterfaceLocale());
  // Preserve the old random-language preference as an explicit selection of all languages.
  let selected = getQuoteLocales();
  if (!selected.length)
    selected = store.get('random-locale')
      ? Array.from(select.options, (option) => option.value as Locale)
      : [store.get('locale')];
  follow.checked = !store.get('random-locale') && !getQuoteLocales().length && !store.get('locale').endsWith('-draft');
  const inputs = Array.from(select.options, (option) => {
    const label = document.createElement('label');
    label.className = 'settings-check';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = option.value;
    input.checked = selected.includes(option.value as Locale);
    label.append(input, document.createTextNode(option.textContent || option.value));
    options.append(label);
    return input;
  });
  const refresh = () => {
    options.hidden = follow.checked;
    const checked = inputs.filter((input) => input.checked);
    inputs.forEach((input) => {
      input.disabled = checked.length === 1 && input.checked;
    });
  };
  const changeQuoteLanguages = (languages: Locale[], follows: boolean) => {
    // Keep the current UI language when choosing a different quote catalogue.
    store.set('ui-locale', select.value as Locale);
    store.set('quote-locales', follows ? undefined : languages.join(','));
    store.set('locale', languages[0]);
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
      if (!languages.length) {
        input.checked = true;
        return;
      }
      changeQuoteLanguages(languages, false);
    }),
  );
  follow.addEventListener('change', () => {
    if (follow.checked) {
      inputs.forEach((input) => {
        input.checked = input.value === select.value;
      });
      changeQuoteLanguages([select.value as Locale], true);
    } else {
      const languages = inputs.filter((input) => input.checked).map((input) => input.value as Locale);
      // Draft previews have no checkbox in the public catalogue list.
      if (!languages.length) {
        inputs.find((input) => input.value === select.value)!.checked = true;
        languages.push(select.value as Locale);
      }
      changeQuoteLanguages(languages, false);
    }
  });
  select.addEventListener('change', () => {
    store.set('ui-locale', select.value as Locale);
    translateStrings(getInterfaceLocale());
    if (follow.checked) {
      inputs.forEach((input) => {
        input.checked = input.value === select.value;
      });
      changeQuoteLanguages([select.value as Locale], true);
    }
  });
  refresh();
  translateStrings(getInterfaceLocale());
}
