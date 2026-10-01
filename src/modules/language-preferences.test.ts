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

test('language choices start empty and interface changes update the quote language', () => {
  history.replaceState({}, '', '/?locale=en-US');
  init();
  expect(document.getElementById('follow-ui-language')).toBeNull();
  expect(document.querySelectorAll('#quote-language-options input:checked')).toHaveLength(0);
  expect(document.getElementById('quote-language-options')!.hidden).toBe(false);
  expect(document.getElementById('clear-languages-action')!.hidden).toBe(true);
  selectUi('es-ES');
  expect(store.get('locale')).toBe('es-ES');
  expect(document.querySelectorAll('#quote-language-options input:checked')).toHaveLength(0);
});

test('collapsed picker summarizes selected languages and closes on Escape or dialog close', () => {
  init();
  const picker = document.querySelector<HTMLDetailsElement>('#quote-language-picker')!;
  const summary = picker.querySelector('summary')!;
  const caption = document.getElementById('quote-language-summary')!;
  expect(picker.open).toBe(false);
  expect(caption.textContent).toBe(
    document.querySelector<HTMLSelectElement>('#ui-locale-select')!.selectedOptions[0].textContent,
  );
  picker.open = true;
  language('fr-FR').click();
  language('el-GR').click();
  expect(picker.open).toBe(true);
  expect(caption.textContent).toContain('(fr-FR)');
  expect(caption.textContent).toContain('(el-GR)');
  language('fr-FR').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(picker.open).toBe(false);
  expect(document.activeElement).toBe(summary);
  picker.open = true;
  document.getElementById('settings-dialog')!.dispatchEvent(new Event('close'));
  expect(picker.open).toBe(false);
  expect(store.get('quote-locales')).toBe('fr-FR,el-GR');
});

test('picker stays open for selections and closes when clicking outside', () => {
  init();
  const picker = document.querySelector<HTMLDetailsElement>('#quote-language-picker')!;
  picker.open = true;
  language('fr-FR').click();
  expect(picker.open).toBe(true);
  document.getElementById('select-all-languages')!.click();
  expect(picker.open).toBe(false);
  expect(document.activeElement).toBe(picker.querySelector('summary'));
  expect(document.getElementById('quote-language-summary')!.textContent).toContain('(el-GR)');
  expect(document.getElementById('quote-languages-help')).toBeNull();
  expect(picker.closest('.settings-row')?.id).toBe('quote-languages');
  picker.open = true;
  document.getElementById('ui-locale-select')!.click();
  expect(picker.open).toBe(false);
  expect(
    [...document.querySelectorAll<HTMLInputElement>('#quote-language-options input')].every((input) => input.checked),
  ).toBe(true);
  picker.open = true;
  document.getElementById('clear-languages')!.click();
  expect(picker.open).toBe(false);
  expect(document.activeElement).toBe(picker.querySelector('summary'));
  expect(store.get('quote-locales')).toBe('');
});

test('explicit selections rotate only chosen languages and preserve the interface', () => {
  history.replaceState({}, '', '/?locale=es-ES');
  init();
  language('en-GB').click();
  language('fr-FR').click();
  expect(store.get('quote-locales')).toBe('en-GB,fr-FR');
  expect(store.get('random-locale')).toBe(true);
  expect(document.documentElement.lang).toBe('es-ES');
  for (let i = 0; i < 20; i++) expect(['en-GB', 'fr-FR']).toContain(getRandomLocale());
  selectUi('de-DE');
  expect(store.get('quote-locales')).toBe('en-GB,fr-FR');
  expect(document.documentElement.lang).toBe('de-DE');
});

test('select all is idempotent; clear is available for partial selections and follows the interface', () => {
  history.replaceState({}, '', '/?locale=fr-FR&ui-locale=en-GB&quote-locales=fr-FR');
  init();
  const all = document.getElementById('select-all-languages')!;
  const clear = document.getElementById('clear-languages')!;
  expect(all.closest('p')).toBe(clear.closest('p'));
  expect(document.getElementById('clear-languages-action')!.hidden).toBe(false);
  all.click();
  all.click();
  expect(
    [...document.querySelectorAll<HTMLInputElement>('#quote-language-options input')].every((input) => input.checked),
  ).toBe(true);
  expect(all.textContent).toBe('Select all');
  language('fr-FR').click();
  expect(document.getElementById('clear-languages-action')!.hidden).toBe(false);
  clear.click();
  expect(store.get('quote-locales')).toBe('');
  expect(store.get('random-locale')).toBe(false);
  expect(store.get('locale')).toBe('en-GB');
  expect(document.getElementById('clear-languages-action')!.hidden).toBe(true);
  init();
  expect(document.querySelectorAll('#quote-language-options input:checked')).toHaveLength(0);
  selectUi('es-ES');
  expect(store.get('locale')).toBe('es-ES');
});

test('changing only the interface preserves the quote and translates controls and chip codes', () => {
  history.replaceState({}, '', '/?locale=en-GB&ui-locale=es-ES&quote-locales=en-GB');
  init();
  selectUi('fr-FR');
  expect(store.get('locale')).toBe('en-GB');
  expect(updateQuote).not.toHaveBeenCalled();
  expect(readingStrings().pause).toBe('Mettre en pause');
  for (const input of document.querySelectorAll<HTMLInputElement>('#quote-language-options input')) {
    expect(input.nextElementSibling!.textContent!.split(`(${input.value})`)).toHaveLength(2);
  }
});

test('legacy random preferences still select every language', () => {
  history.replaceState({}, '', '/?locale=es-ES&random-locale=true');
  init();
  expect(
    [...document.querySelectorAll<HTMLInputElement>('#quote-language-options input')].every((input) => input.checked),
  ).toBe(true);
});

test('deselecting the last chip follows the interface without preselecting a replacement', () => {
  history.replaceState({}, '', '/?locale=fr-FR&ui-locale=en-GB&quote-locales=fr-FR');
  init();
  language('fr-FR').click();
  expect(store.get('locale')).toBe('en-GB');
  expect(document.querySelectorAll('#quote-language-options input:checked')).toHaveLength(0);
  document.getElementById('settings-dialog')!.dispatchEvent(new Event('close'));
  expect(document.querySelectorAll('#quote-language-options input:checked')).toHaveLength(0);
});

test('Greek is selectable for the interface and quote rotation', () => {
  init();
  selectUi('el-GR');
  expect(document.documentElement.lang).toBe('el-GR');
  expect(store.get('locale')).toBe('el-GR');
  language('el-GR').click();
  expect(store.get('quote-locales')).toBe('el-GR');
  expect(getRandomLocale()).toBe('el-GR');
  expect(language('el-GR').nextElementSibling!.textContent).toContain('(el-GR)');
});
