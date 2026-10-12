import { setTextLocale } from '../utils/text-direction';
import { applyLocaleThemeFont } from './locale-fonts';
import { store } from '../store';
import { getBaseLocale, getInterfaceLocale, getStrings, resolveLocale } from './locales';
import SETTINGS from '../strings/settings.json';
import { Locale, Quote } from '../types';
import { fitQuote } from '../utils';
import { quoteMarkup } from '../utils/quote-markup';

const strings = () => SETTINGS[getBaseLocale(getInterfaceLocale())];
let translationRequest = 0;

// Chrome 128 introduced line breaking within ruby base/annotation pairs.
// Chromium browsers expose the same Blink engine version in their Chrome token;
// iOS Chrome uses CriOS and is intentionally excluded because it uses WebKit.
export function supportsLineBreakableRuby(userAgent = navigator.userAgent): boolean {
  const version = userAgent.match(/(?:Chrome|Chromium)\/(\d+)/)?.[1];
  return !!version && Number(version) >= 128 && !/CriOS\//.test(userAgent);
}

function clearRubyTranslation() {
  const blockquote = document.getElementById('quote');
  const original = blockquote?.querySelector<HTMLElement>(':scope > p');
  const ruby = original?.querySelector<HTMLElement>(':scope > ruby');
  if (ruby) {
    const base = [...ruby.childNodes].filter((node) => !(node instanceof HTMLElement && node.tagName === 'RT'));
    ruby.replaceWith(...base);
  }
  blockquote?.classList.remove('has-ruby-translation');
}

function applyRubyTranslation(passage: HTMLElement, locale: string) {
  if (!supportsLineBreakableRuby()) return false;
  const blockquote = document.getElementById('quote');
  const original = blockquote?.querySelector<HTMLElement>(':scope > p');
  if (!original) return false;

  // A locale change replaces the previous annotation while keeping the original
  // passage and its inline formatting intact.
  const previousRuby = original.querySelector<HTMLElement>(':scope > ruby');
  if (previousRuby) {
    const base = [...previousRuby.childNodes].filter((node) => !(node instanceof HTMLElement && node.tagName === 'RT'));
    previousRuby.replaceWith(...base);
  }

  const ruby = document.createElement('ruby');
  ruby.className = 'bilingual-ruby-text';
  while (original.firstChild) ruby.append(original.firstChild);
  const annotation = document.createElement('rt');
  setTextLocale(annotation, locale);
  annotation.append(...[...passage.childNodes]);
  ruby.append(annotation);
  original.append(ruby);
  blockquote?.classList.add('has-ruby-translation');
  return true;
}

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
    clearRubyTranslation();
    return;
  }

  const locale = targetLocale();
  const panel = document.createElement('section');
  panel.id = 'quote-translation';
  setTextLocale(panel, getBaseLocale(getInterfaceLocale()));
  panel.setAttribute('aria-label', strings().bilingual_language);
  const content = document.createElement('div');
  content.className = 'translation-content';
  setTextLocale(content, getBaseLocale(getInterfaceLocale()));
  content.setAttribute('role', 'status');
  panel.append(content);
  let renderedAsRuby = false;
  const commit = () => {
    if (request !== translationRequest || store.get('active-quote') !== quote || !store.get('bilingual')) return;
    document.getElementById('quote-translation')?.remove();
    blockquote.append(panel);
    fitQuote();
  };
  if (!locale) {
    clearRubyTranslation();
    content.classList.add('translation-notice');
    content.textContent = strings().bilingual_select_prompt;
    commit();
    return;
  }
  if (quote.locale.replace(/-draft$/, '') === locale) {
    clearRubyTranslation();
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
    passage.append(quoteMarkup(translation.quote_first));
    const translatedTime = document.createElement('span');
    translatedTime.className = 'time';
    translatedTime.append(quoteMarkup(translation.quote_time_case));
    passage.append(translatedTime, quoteMarkup(translation.quote_last));
    if (store.get('bilingual-ruby') && supportsLineBreakableRuby()) {
      renderedAsRuby = applyRubyTranslation(passage, locale);
    } else {
      clearRubyTranslation();
    }
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
    content.replaceChildren(...(renderedAsRuby ? [] : [passage, attribution]));
  } catch {
    if (request !== translationRequest) return;
    clearRubyTranslation();
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
  const controls = document.createElement('span');
  controls.id = 'bilingual-toolbar-control';
  controls.className = 'input-group';
  controls.append(toolbarButton);
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
  const rubySection = document.createElement('section');
  rubySection.className = 'settings-behavior-section bilingual-ruby-section';
  const rubyRow = document.createElement('div');
  rubyRow.className = 'settings-row';
  const rubyLabel = document.createElement('label');
  rubyLabel.htmlFor = 'bilingual-ruby';
  rubyLabel.dataset.text = 'bilingual_line_by_line';
  const rubySwitch = document.createElement('button');
  rubySwitch.id = 'bilingual-ruby';
  rubySwitch.type = 'button';
  rubySwitch.className = 'settings-switch';
  rubySwitch.setAttribute('role', 'switch');
  rubySwitch.setAttribute('aria-describedby', 'bilingual-ruby-help');
  const rubyHelp = document.createElement('p');
  rubyHelp.id = 'bilingual-ruby-help';
  rubyHelp.className = 'settings-help';
  rubyHelp.dataset.text = 'bilingual_ruby_requirement';
  rubyRow.append(rubyLabel, rubySwitch);
  rubySection.append(rubyRow, rubyHelp);
  document.getElementById('settings-behavior')?.append(rubySection);
  rubySwitch.addEventListener('click', () => store.toggle('bilingual-ruby'));
  const menuSelect = document.createElement('select');
  menuSelect.id = 'clock-translation-locale';
  menuSelect.setAttribute('aria-label', strings().bilingual_translate_quote);
  menuSelect.add(new Option(strings().bilingual_select_language, ''));
  const names = new Intl.DisplayNames([getBaseLocale(getInterfaceLocale())], { type: 'language' });
  for (const locale of Object.keys(SETTINGS)) {
    menuSelect.add(
      new Option(`${names.of(locale === 'zh-CN' ? 'zh-Hans' : locale.split('-')[0])} (${locale})`, locale),
    );
  }
  const menuControl = document.createElement('span');
  menuControl.id = 'bilingual-menu-control';
  menuControl.className = 'input-group';
  const menuIcon = document.createElement('span');
  menuIcon.className = 'input-group-text bilingual-menu-icon';
  menuIcon.setAttribute('aria-hidden', 'true');
  menuIcon.innerHTML = icon;
  menuControl.append(menuIcon, menuSelect);
  document.getElementById('screensaver')?.after(controls);
  document.getElementById('settings')?.before(menuControl);
  menuSelect.addEventListener('change', () => store.set('translation-locale', menuSelect.value as Locale | ''));
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
    const rubyEnabled = !!store.get('bilingual-ruby');
    const rubySupported = supportsLineBreakableRuby();
    toolbarButton.classList.toggle('active', enabled);
    toolbarButton.setAttribute('aria-pressed', String(enabled));
    switchButton.setAttribute('aria-checked', String(enabled));
    select.value = targetLocale();
    menuSelect.value = targetLocale();
    menuControl.hidden = !enabled;
    rubySwitch.disabled = !rubySupported;
    rubySwitch.setAttribute('aria-checked', String(rubyEnabled && rubySupported));
    rubySwitch.setAttribute('aria-disabled', String(!rubySupported));
    menuSelect.setAttribute('aria-label', strings().bilingual_translate_quote);
    const menuNames = new Intl.DisplayNames([getBaseLocale(getInterfaceLocale())], { type: 'language' });
    for (const option of [...menuSelect.options]) {
      option.textContent = option.value
        ? `${menuNames.of(option.value === 'zh-CN' ? 'zh-Hans' : option.value.split('-')[0])} (${option.value})`
        : strings().bilingual_select_language;
    }
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
      state['bilingual-ruby'] !== previous['bilingual-ruby'] ||
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
