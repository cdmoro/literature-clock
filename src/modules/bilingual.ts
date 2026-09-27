import { store } from '../store';
import { getBaseLocale, getInterfaceLocale, getStrings, resolveLocale } from './locales';
import SETTINGS from '../strings/settings.json';
import { Locale, Quote } from '../types';
import { fitQuote } from '../utils';

const strings = () => SETTINGS[getBaseLocale(getInterfaceLocale())];
const targetLocale = () => getBaseLocale(resolveLocale(store.get('translation-locale') || 'es-ES'));

export async function renderTranslation() {
  document.getElementById('quote-translation')?.remove();
  const quote = store.get('active-quote');
  const blockquote = document.getElementById('quote');
  if (!store.get('bilingual') || !quote || !blockquote || store.get('quote')) return;

  const locale = targetLocale();
  // Keep the preference enabled, but avoid duplicating a passage in its own language.
  if (getBaseLocale(quote.locale) === locale) return;
  const panel = document.createElement('section');
  panel.id = 'quote-translation';
  panel.setAttribute('aria-labelledby', 'translation-heading');
  const heading = document.createElement('div');
  heading.id = 'translation-heading';
  const name = new Intl.DisplayNames([getBaseLocale(getInterfaceLocale())], { type: 'language' }).of(
    locale.split('-')[0],
  );
  heading.textContent = `${name} (${locale})`;
  const content = document.createElement('div');
  content.className = 'translation-content';
  content.setAttribute('role', 'status');
  panel.append(heading, content);
  blockquote.append(panel);
  content.textContent = strings().bilingual_loading;
  fitQuote();
  try {
    const response = await fetch(`../times/${locale}/${quote.time.replace(':', '_')}.json`);
    if (!response.ok) throw new Error('Translation unavailable');
    const quotes: Quote[] = await response.json();
    const translation = quotes.find(
      (item) => item.id === quote.id && !item.draft && (!store.get('work') || item.sfw !== 'nsfw'),
    );
    if (!translation || quote.fallback) throw new Error('Translation unavailable');
    if (!panel.isConnected) return;
    content.lang = locale;
    const passage = document.createElement('p');
    passage.innerHTML = `${translation.quote_first}<span class="time">${translation.quote_time_case}</span>${translation.quote_last}`;
    const attribution = document.createElement('cite');
    attribution.textContent = `— ${translation.title}, ${translation.author}`;
    content.replaceChildren(passage, attribution);
  } catch {
    if (!panel.isConnected) return;
    content.textContent = strings().bilingual_unavailable;
  }
  fitQuote();
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
  notice.setAttribute('role', 'status');
  notice.hidden = true;
  document.getElementById('settings-content')?.append(row, languageRow, notice);
  const switchButton = row.querySelector('button')!;
  const select = languageRow.querySelector('select')!;
  for (const locale of Object.keys(SETTINGS)) {
    const option = new Option(locale, locale);
    option.dataset.text = locale;
    select.add(option);
  }
  for (const button of [toolbarButton, switchButton]) button.addEventListener('click', () => store.toggle('bilingual'));
  select.addEventListener('change', () => store.set('translation-locale', select.value as Locale));
  const refresh = () => {
    const enabled = !!store.get('bilingual');
    toolbarButton.classList.toggle('active', enabled);
    toolbarButton.setAttribute('aria-pressed', String(enabled));
    switchButton.setAttribute('aria-checked', String(enabled));
    select.value = targetLocale();
    const sameLanguage = enabled && targetLocale() === getBaseLocale(getInterfaceLocale());
    notice.hidden = !sameLanguage;
    notice.textContent = sameLanguage ? strings().bilingual_language_notice : '';
    if (sameLanguage) select.setAttribute('aria-describedby', notice.id);
    else select.removeAttribute('aria-describedby');
    const labels = getStrings(getInterfaceLocale());
    for (const option of select.options) option.textContent = labels[getBaseLocale(option.value as Locale)];
  };
  store.subscribe((state, previous) => {
    refresh();
    if (
      state.bilingual !== previous.bilingual ||
      state['translation-locale'] !== previous['translation-locale'] ||
      state['ui-locale'] !== previous['ui-locale'] ||
      state.work !== previous.work
    ) {
      renderTranslation();
      fitQuote();
    }
  });
  refresh();
}
