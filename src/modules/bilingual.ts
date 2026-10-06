import { setTextLocale } from '../utils/text-direction';
import { applyLocaleThemeFont } from './locale-fonts';
import { store } from '../store';
import { getBaseLocale, getInterfaceLocale, getStrings, resolveLocale } from './locales';
import SETTINGS from '../strings/settings.json';
import { Locale, Quote } from '../types';
import { fitQuote } from '../utils';

const strings = () => SETTINGS[getBaseLocale(getInterfaceLocale())];
let translationRequest = 0;

const targetLocale = () => {
  const locale = store.get('translation-locale');
  return locale ? getBaseLocale(resolveLocale(locale)) : '';
};

export async function renderTranslation() {
  const request = ++translationRequest;
  const quote = store.get('active-quote');
  const blockquote = document.getElementById('quote');
  if (!store.get('bilingual') || !quote || !blockquote || store.get('quote')) {
    document.getElementById('quote-translation')?.remove();
    return;
  }

  const locale = targetLocale();
  const panel = document.createElement('section');
  panel.id = 'quote-translation';
  setTextLocale(panel, getBaseLocale(getInterfaceLocale()));
  panel.setAttribute('aria-labelledby', 'translation-heading');
  const heading = document.createElement('div');
  heading.id = 'translation-heading';
  const select = document.createElement('select');
  select.id = 'clock-translation-locale';
  select.setAttribute('aria-label', strings().bilingual_language);
  select.add(new Option(strings().bilingual_select_language, ''));
  const names = new Intl.DisplayNames([getBaseLocale(getInterfaceLocale())], { type: 'language' });
  for (const language of Object.keys(SETTINGS)) {
    select.add(
      new Option(`${names.of(language === 'zh-CN' ? 'zh-Hans' : language.split('-')[0])} (${language})`, language),
    );
  }
  select.value = locale;
  select.addEventListener('change', () => store.set('translation-locale', select.value as Locale | ''));
  heading.append(select);
  const content = document.createElement('div');
  content.className = 'translation-content';
  setTextLocale(content, getBaseLocale(getInterfaceLocale()));
  content.setAttribute('role', 'status');
  panel.append(heading, content);
  const commit = () => {
    if (request !== translationRequest || store.get('active-quote') !== quote || !store.get('bilingual')) return;
    document.getElementById('quote-translation')?.remove();
    blockquote.append(panel);
    fitQuote();
  };
  if (!locale) {
    content.classList.add('translation-notice');
    content.textContent = strings().bilingual_select_prompt;
    commit();
    return;
  }
  if (quote.locale.replace(/-draft$/, '') === locale) {
    content.classList.add('translation-notice');
    content.textContent = strings().bilingual_same;
    commit();
    return;
  }
  // Prepare offscreen so the loading message cannot resize the visible quote.
  try {
    const response = await fetch(`../times/${locale}/${quote.time.replace(':', '_')}.json`);
    if (!response.ok) throw new Error('Translation unavailable');
    const quotes: Quote[] = await response.json();
    const translation = quotes.find(
      (item) => item.id === quote.id && !item.draft && (!store.get('work') || item.sfw === true),
    );
    if (!translation || quote.fallback) throw new Error('Translation unavailable');
    if (request !== translationRequest) return;
    setTextLocale(content, locale);
    applyLocaleThemeFont(content);
    const passage = document.createElement('p');
    passage.innerHTML = `${translation.quote_first}<span class="time">${translation.quote_time_case}</span>${translation.quote_last}`;
    const attribution = document.createElement('cite');
    attribution.dir = 'auto';
    const title = document.createElement('span');
    title.className = 'translation-book-title';
    title.dir = 'auto';
    title.textContent = translation.title;
    const separator = document.createElement('span');
    separator.className = 'translation-book-title';
    separator.textContent = ', ';
    const author = document.createElement('bdi');
    author.textContent = translation.author;
    attribution.append('— ', title, separator, author);
    content.replaceChildren(passage, attribution);
  } catch {
    if (request !== translationRequest) return;
    content.textContent = strings().bilingual_unavailable;
  }
  commit();
}

export function initBilingual() {
  const toolbarButton = document.createElement('button');
  toolbarButton.type = 'button';
  toolbarButton.id = 'bilingual';
  toolbarButton.dataset.title = 'bilingual_mode';
  toolbarButton.dataset.ariaLabel = 'bilingual_mode';
  const icon =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h12M9 3v2M5 5c0 5 4 9 8 10M13 5c-1 5-5 9-10 11M13 21l4-10 4 10M14.5 17h5"/></svg>';
  toolbarButton.innerHTML = icon;
  document.getElementById('screensaver')?.after(toolbarButton);
  const row = document.createElement('div');
  row.className = 'settings-row';
  row.innerHTML =
    icon +
    '<label for="settings-bilingual" data-text="bilingual_mode"></label><button type="button" id="settings-bilingual" class="settings-switch" role="switch" data-aria-label="bilingual_mode"></button>';
  const languageRow = document.createElement('div');
  languageRow.className = 'settings-row';
  languageRow.innerHTML =
    '<label for="translation-locale" data-text="bilingual_language"></label><div class="input-group"><select id="translation-locale"></select></div>';
  const notice = document.createElement('p');
  notice.id = 'translation-language-notice';
  notice.className = 'settings-help';
  document.getElementById('settings-content')?.append(row, languageRow, notice);
  const switchButton = row.querySelector('button')!;
  const select = languageRow.querySelector('select')!;
  select.setAttribute('aria-describedby', notice.id);
  const placeholder = new Option(strings().bilingual_select_language, '');
  placeholder.dataset.text = 'bilingual_select_language';
  select.add(placeholder);
  for (const locale of Object.keys(SETTINGS)) {
    const option = new Option(locale, locale);
    option.dataset.text = locale;
    select.add(option);
  }
  for (const button of [toolbarButton, switchButton]) button.addEventListener('click', () => store.toggle('bilingual'));
  select.addEventListener('change', () => store.set('translation-locale', select.value as Locale | ''));
  const refresh = () => {
    const enabled = !!store.get('bilingual');
    toolbarButton.classList.toggle('active', enabled);
    toolbarButton.setAttribute('aria-pressed', String(enabled));
    switchButton.setAttribute('aria-checked', String(enabled));
    select.value = targetLocale();
    notice.textContent = strings().bilingual_language_notice;
    const labels = getStrings(getInterfaceLocale());
    for (const option of select.options)
      option.textContent = option.value
        ? labels[getBaseLocale(option.value as Locale)]
        : strings().bilingual_select_language;
  };
  store.subscribe((state, previous) => {
    refresh();
    if (
      state.bilingual !== previous.bilingual ||
      state['translation-locale'] !== previous['translation-locale'] ||
      state['ui-locale'] !== previous['ui-locale'] ||
      state.work !== previous.work
    ) {
      void renderTranslation();
      if (!state.bilingual) fitQuote();
    }
  });
  refresh();
}
