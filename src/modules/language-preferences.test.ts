/// <reference types="vite/client" />
import page from '../../index.html?raw';
import { afterEach, expect, test, vi } from 'vitest';
import { createStore, store } from '../store';
import { getRandomLocale, initLocale } from './locales';
import { initSettingsDialog } from './settings-dialog';
import { updateQuote } from './quotes';
import { readingStrings } from './reading-ui';

vi.mock('./quotes', () => ({ updateQuote: vi.fn() }));

afterEach(() => {
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

function init() {
  document.body.innerHTML = page;
  createStore();
  initSettingsDialog();
  initLocale();
}
function language(value: string) {
  return document.querySelector<HTMLInputElement>(`#quote-language-options input[value="${value}"]`)!;
}
function selectUi(value: string) {
  const select = document.querySelector<HTMLSelectElement>('#ui-locale-select')!;
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

test('follows the interface by default, then rotates only through selected languages', () => {
  history.replaceState({}, '', '/?locale=es-ES');
  init();
  expect(document.querySelector<HTMLInputElement>('#follow-ui-language')!.checked).toBe(true);
  document.getElementById('follow-ui-language')!.click();
  expect(language('es-ES').disabled).toBe(false);
  language('en-GB').click();
  expect(store.get('random-locale')).toBe(true);
  expect(store.get('quote-locales')).toBe('en-GB,es-ES');
  expect(document.documentElement.lang).toBe('es-ES');
  for (let i = 0; i < 20; i++) expect(['en-GB', 'es-ES']).toContain(getRandomLocale());
  language('es-ES').click();
  expect(store.get('locale')).toBe('en-GB');
  expect(store.get('random-locale')).toBe(false);
  expect(language('en-GB').disabled).toBe(false);
  expect(getRandomLocale()).toBe('en-GB');
  const saved = JSON.parse(localStorage.getItem('settings')!);
  expect(saved['ui-locale']).toBe('es-ES');
  expect(saved['quote-locales']).toBe('en-GB');
});

test('changing only the interface preserves the quote and translates reading controls', () => {
  history.replaceState({}, '', '/?locale=en-GB&ui-locale=es-ES&quote-locales=en-GB');
  init();
  selectUi('fr-FR');
  expect(document.documentElement.lang).toBe('fr-FR');
  expect(store.get('locale')).toBe('en-GB');
  expect(updateQuote).not.toHaveBeenCalled();
  expect(readingStrings().pause).toBe('Mettre en pause');
  expect(document.getElementById('settings-title')?.textContent).toBe('Paramètres');
});

test('following the interface again resets the subset and persists across reloads', () => {
  history.replaceState({}, '', '/?locale=en-GB&ui-locale=es-ES&quote-locales=en-GB,fr-FR&random-locale=true');
  init();
  document.getElementById('follow-ui-language')!.click();
  expect(store.get('quote-locales')).toBeUndefined();
  expect(store.get('locale')).toBe('es-ES');
  selectUi('de-DE');
  expect(store.get('locale')).toBe('de-DE');
  init();
  expect(document.querySelector<HTMLInputElement>('#follow-ui-language')!.checked).toBe(true);
  expect(store.get('locale')).toBe('de-DE');
});

test('legacy random language preferences expose all languages without selecting an empty pool', () => {
  history.replaceState({}, '', '/?locale=es-ES&random-locale=true&quote-locales=invalid');
  init();
  expect(document.querySelector<HTMLInputElement>('#follow-ui-language')!.checked).toBe(false);
  expect(
    [...document.querySelectorAll<HTMLInputElement>('#quote-language-options input')].every((input) => input.checked),
  ).toBe(true);
  expect(getRandomLocale()).toBeTruthy();
});

test('an empty selection uses the interface language and stays empty after reload', () => {
  history.replaceState({}, '', '/?locale=fr-FR&ui-locale=en-GB&quote-locales=fr-FR');
  init();
  language('fr-FR').click();
  expect(store.get('locale')).toBe('en-GB');
  expect(store.get('quote-locales')).toBe('');
  expect(new URLSearchParams(location.search).get('quote-locales')).toBe('');
  expect(store.get('random-locale')).toBe(false);
  expect(document.querySelectorAll('#quote-language-options input:checked')).toHaveLength(0);
  selectUi('es-ES');
  expect(store.get('locale')).toBe('es-ES');
  init();
  expect(store.get('locale')).toBe('es-ES');
  expect(document.querySelectorAll('#quote-language-options input:checked')).toHaveLength(0);
  expect(document.querySelector<HTMLInputElement>('#follow-ui-language')!.checked).toBe(false);
  expect(
    [...document.querySelectorAll<HTMLInputElement>('#quote-language-options input')].every((input) => !input.disabled),
  ).toBe(true);
  language('de-DE').click();
  expect(store.get('locale')).toBe('de-DE');
  expect(store.get('quote-locales')).toBe('de-DE');
});

test('select all activates every language chip with a single locale code and persists the selection', () => {
  history.replaceState({}, '', '/?locale=fr-FR&ui-locale=en-GB&quote-locales=fr-FR');
  init();
  document.getElementById('select-all-languages')!.click();
  const chips = [...document.querySelectorAll<HTMLInputElement>('#quote-language-options input')];
  expect(chips.every((input) => input.checked)).toBe(true);
  expect(store.get('random-locale')).toBe(true);
  expect(store.get('quote-locales')).toBe(chips.map((input) => input.value).join(','));
  for (const input of chips) {
    expect(input.nextElementSibling?.textContent?.split(`(${input.value})`)).toHaveLength(2);
  }
  language('fr-FR').click();
  expect(language('fr-FR').checked).toBe(false);
  selectUi('es-ES');
  expect(language('fr-FR').nextElementSibling?.textContent).toContain('(fr-FR)');
  init();
  expect(language('fr-FR').checked).toBe(false);
  expect(language('en-GB').checked).toBe(true);
});

test('inline bulk action toggles select all and deselect all, falling back to the interface language', () => {
  history.replaceState({}, '', '/?locale=fr-FR&ui-locale=en-GB&quote-locales=fr-FR');
  init();
  const action = document.getElementById('select-all-languages')!;
  expect(action.closest('p')?.querySelector('[data-text="settings_languages_help"]')).not.toBeNull();
  expect(action.textContent).toBe('Select all');
  action.click();
  expect(action.textContent).toBe('Deselect all');
  action.click();
  expect(action.textContent).toBe('Select all');
  expect(document.querySelectorAll('#quote-language-options input:checked')).toHaveLength(0);
  expect(store.get('locale')).toBe('en-GB');
  expect(store.get('random-locale')).toBe(false);
  expect(store.get('quote-locales')).toBe('');
  action.click();
  selectUi('es-ES');
  expect(action.textContent).toBe('Deseleccionar todos');
  language('fr-FR').click();
  expect(action.textContent).toBe('Seleccionar todos');
});
