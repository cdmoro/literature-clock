import { store } from '../store';
import { getBaseLocale, getInterfaceLocale, resolveLocale } from './locales';
import SETTINGS from '../strings/settings.json';
import { Locale, Quote } from '../types';
import { fitQuote } from '../utils';

const strings = () => SETTINGS[getBaseLocale(getInterfaceLocale())];
const targetLocale = () => getBaseLocale(resolveLocale(store.get('translation-locale') || 'es-ES'));

export function renderTranslation() {
  document.getElementById('quote-translation')?.remove();
  const quote = store.get('active-quote');
  const blockquote = document.getElementById('quote');
  if (!store.get('bilingual') || !quote || !blockquote || store.get('quote')) return;

  const locale = targetLocale();
  const details = document.createElement('details');
  details.id = 'quote-translation';
  const summary = document.createElement('summary');
  summary.textContent = `${strings().bilingual_show} · ${new Intl.DisplayNames([getBaseLocale(getInterfaceLocale())], { type: 'language' }).of(locale)}`;
  const content = document.createElement('div');
  content.setAttribute('role', 'status');
  details.append(summary, content);
  blockquote.append(details);
  let loaded = false;
  details.addEventListener('toggle', async () => {
    fitQuote();
    if (!details.open || loaded) return;
    loaded = true;
    if (getBaseLocale(quote.locale) === locale) {
      content.textContent = strings().bilingual_same;
      fitQuote();
      return;
    }
    content.textContent = strings().bilingual_loading;
    try {
      const response = await fetch(`../times/${locale}/${quote.time.replace(':', '_')}.json`);
      if (!response.ok) throw new Error('Translation unavailable');
      const quotes: Quote[] = await response.json();
      const translation = quotes.find(
        (item) => item.id === quote.id && !item.draft && (!store.get('work') || item.sfw !== 'nsfw'),
      );
      if (!translation || quote.fallback) throw new Error('Translation unavailable');
      if (!details.isConnected) return;
      content.lang = locale;
      const passage = document.createElement('p');
      passage.innerHTML = `${translation.quote_first}<span class="time">${translation.quote_time_case}</span>${translation.quote_last}`;
      const attribution = document.createElement('cite');
      attribution.textContent = `— ${translation.title}, ${translation.author}`;
      content.replaceChildren(passage, attribution);
    } catch {
      if (!details.isConnected) return;
      content.textContent = strings().bilingual_unavailable;
    }
    fitQuote();
  });
}

export function initBilingual() {
  const toolbarButton = document.createElement('button');
  toolbarButton.type = 'button';
  toolbarButton.id = 'bilingual';
  toolbarButton.dataset.title = 'bilingual_mode';
  toolbarButton.dataset.ariaLabel = 'bilingual_mode';
  toolbarButton.innerHTML = '<span aria-hidden="true">文A</span>';
  document.getElementById('screensaver')?.after(toolbarButton);
  const row = document.createElement('div');
  row.className = 'settings-row';
  row.innerHTML =
    '<span aria-hidden="true">文A</span><label for="settings-bilingual" data-text="bilingual_mode"></label><button type="button" id="settings-bilingual" class="settings-switch" role="switch" data-aria-label="bilingual_mode"></button>';
  const languageRow = document.createElement('div');
  languageRow.className = 'settings-row';
  languageRow.innerHTML =
    '<label for="translation-locale" data-text="bilingual_language"></label><div class="input-group"><select id="translation-locale"></select></div>';
  document.getElementById('settings-content')?.append(row, languageRow);
  const switchButton = row.querySelector('button')!;
  const select = languageRow.querySelector('select')!;
  for (const locale of Object.keys(SETTINGS)) select.add(new Option(locale, locale));
  for (const button of [toolbarButton, switchButton]) button.addEventListener('click', () => store.toggle('bilingual'));
  select.addEventListener('change', () => store.set('translation-locale', select.value as Locale));
  const refresh = () => {
    const enabled = !!store.get('bilingual');
    toolbarButton.classList.toggle('active', enabled);
    toolbarButton.setAttribute('aria-pressed', String(enabled));
    switchButton.setAttribute('aria-checked', String(enabled));
    select.value = targetLocale();
    const names = new Intl.DisplayNames([getBaseLocale(getInterfaceLocale())], { type: 'language' });
    for (const option of select.options) option.textContent = names.of(option.value) || option.value;
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
