import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createStore, store } from '../store';
import { initBilingual, renderTranslation, supportsLineBreakableRuby } from './bilingual';
vi.mock('../utils', () => ({ fitQuote: vi.fn(), loadFontIfNotExists: vi.fn() }));
const quote = {
  id: '1200-000',
  time: '12:00',
  locale: 'en-GB' as const,
  quote_first: 'At ',
  quote_time_case: 'noon',
  quote_last: '',
  title: 'Book',
  author: 'Author',
  sfw: true,
  fallback: false,
  variants: 1,
  index: 0,
  quote_raw: 'At noon',
};
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.body.innerHTML =
    '<div id="menu"><div id="settings"></div></div><button id="screensaver"></button><section id="settings-content"></section><section id="settings-behavior"></section><blockquote id="quote"></blockquote>';
  createStore();
  store.set('active-quote', quote);
  initBilingual();
  store.set('translation-locale', 'es-ES');
});
afterEach(() => {
  vi.unstubAllGlobals();
});
async function translationPanel() {
  await vi.waitFor(() => expect(document.getElementById('quote-translation')).not.toBeNull());
  const panel = document.getElementById('quote-translation')!;
  await vi.waitFor(() => expect(panel.textContent).not.toContain('Loading translation'));
  return panel;
}
it('synchronizes both switches and persists the language', async () => {
  document.getElementById('bilingual')!.click();
  expect(document.getElementById('settings-bilingual')!.getAttribute('aria-checked')).toBe('true');
  await vi.waitFor(() => expect(document.getElementById('quote-translation')).not.toBeNull());
  const select = document.querySelector<HTMLSelectElement>('#translation-locale')!;
  select.value = 'fr-FR';
  select.dispatchEvent(new Event('change'));
  expect(JSON.parse(localStorage.getItem('settings')!)['translation-locale']).toBe('fr-FR');
  document.getElementById('settings-bilingual')!.click();
  expect(document.getElementById('quote-translation')).toBeNull();
  expect(document.getElementById('bilingual')!.getAttribute('aria-pressed')).toBe('false');
  expect(document.getElementById('bilingual-menu-control')!.hidden).toBe(true);
});
it.each([true, false])('restores bilingual preferences after reload (keep URL: %s)', (keepUrl) => {
  document.getElementById('settings-bilingual')!.click();
  const select = document.querySelector<HTMLSelectElement>('#translation-locale')!;
  select.value = 'fr-FR';
  select.dispatchEvent(new Event('change'));

  if (!keepUrl) history.replaceState({}, '', '/');
  document.body.innerHTML =
    '<div id="menu"><div id="settings"></div></div><button id="screensaver"></button><section id="settings-content"></section><section id="settings-behavior"></section><blockquote id="quote"></blockquote>';
  createStore();
  initBilingual();

  expect(store.get('bilingual')).toBe(true);
  expect(store.get('translation-locale')).toBe('fr-FR');
  expect(document.getElementById('settings-bilingual')!.getAttribute('aria-checked')).toBe('true');
  expect(document.getElementById('clock-translation-locale')!.hidden).toBe(false);
  expect(document.getElementById('clock-translation-locale')!.getAttribute('aria-label')).toBe('Translate quote to');
  expect(document.getElementById('bilingual')!.getAttribute('aria-pressed')).toBe('true');
  expect(document.querySelector<HTMLSelectElement>('#translation-locale')!.value).toBe('fr-FR');
  expect(JSON.parse(localStorage.getItem('settings')!)).toMatchObject({
    bilingual: true,
    'translation-locale': 'fr-FR',
  });
});

it('lets URL bilingual preferences override saved settings', () => {
  localStorage.setItem('settings', JSON.stringify({ bilingual: true, 'translation-locale': 'fr-FR' }));
  history.replaceState({}, '', '/?bilingual=false&translation-locale=it-IT');
  createStore();
  expect(store.get('bilingual')).toBe(false);
  expect(store.get('translation-locale')).toBe('it-IT');
});

it('automatically loads the matching ID when enabled', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [
      { ...quote, id: 'other', quote_first: 'Wrong' },
      { ...quote, quote_first: 'Al ', quote_time_case: 'mediodía' },
    ],
  });
  vi.stubGlobal('fetch', fetch);
  store.set('bilingual', true);
  expect(fetch).toHaveBeenCalledOnce();
  expect(document.querySelector('details')).toBeNull();
  const details = await translationPanel();
  expect(details.textContent).toContain('Al mediodía');
  expect(details.textContent).not.toContain('Wrong');
  expect(details.querySelector('[lang]')!.getAttribute('lang')).toBe('es-ES');
});

it('detects line-breakable ruby from Chromium 128 engine tokens', () => {
  expect(supportsLineBreakableRuby('Mozilla/5.0 Chrome/127.0.0.0 Safari/537.36')).toBe(false);
  expect(supportsLineBreakableRuby('Mozilla/5.0 Chrome/128.0.0.0 Safari/537.36')).toBe(true);
  expect(
    supportsLineBreakableRuby(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
    ),
  ).toBe(true);
  expect(supportsLineBreakableRuby('Mozilla/5.0 Edg/128.0.0.0 Chrome/128.0.0.0 Safari/537.36')).toBe(true);
  expect(supportsLineBreakableRuby('Mozilla/5.0 Chrome/128.0.0.0 CriOS/128.0.0.0 Mobile')).toBe(false);
  expect(supportsLineBreakableRuby('Mozilla/5.0 Firefox/130.0')).toBe(false);
});

it('renders the translated passage as ruby in Chromium 128 and keeps its HTML time markup', async () => {
  vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 Chrome/128.0.0.0 Safari/537.36' });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [{
      ...quote,
      quote_first: '<em>Una frase</em> ',
      quote_time_case: 'mediodía',
      quote_last: '<br>Otra línea.',
    }],
  }));
  document.getElementById('quote')!.innerHTML = '<p>Original quote.</p><cite>Original attribution</cite>';
  store.set('bilingual-ruby', true);
  store.set('bilingual', true);
  await translationPanel();
  const ruby = document.querySelector<HTMLElement>('#quote ruby')!;
  expect(ruby).not.toBeNull();
  expect(ruby.querySelector('rt')!.lang).toBe('es-ES');
  expect(ruby.querySelector('rt em')!.textContent).toBe('Una frase');
  expect(ruby.querySelector('rt .time')!.textContent).toBe('mediodía');
  expect(ruby.querySelector('rt br')).not.toBeNull();
  expect(document.querySelector('#bilingual-toolbar-control > #bilingual')).not.toBeNull();
  expect(document.querySelector('#bilingual-menu-control > .bilingual-menu-icon')).not.toBeNull();
  expect(document.querySelector('#bilingual-menu-control > #clock-translation-locale')).not.toBeNull();
  expect(document.querySelector('#bilingual-menu-control #bilingual')).toBeNull();
  expect(document.querySelector('#quote-translation #clock-translation-locale')).toBeNull();
  expect(document.querySelector('#quote-translation .translation-content p')).toBeNull();
  expect(document.querySelector('#quote')!.classList.contains('has-ruby-translation')).toBe(true);
  store.set('bilingual', false);
  expect((document.getElementById('bilingual-menu-control') as HTMLElement).hidden).toBe(true);
  expect(document.querySelector('#quote > p')!.textContent).toBe('Original quote.');
  expect(document.querySelector('#quote rt')).toBeNull();
  expect(document.querySelector('#quote')!.classList.contains('has-ruby-translation')).toBe(false);
});
it('keeps normal bilingual paragraphs by default and disables line-by-line mode outside supported Chromium', async () => {
  vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 Firefox/130.0' });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [{ ...quote, quote_first: 'Una frase', quote_time_case: '', quote_last: ' traducida.' }],
  }));
  const option = document.getElementById('bilingual-ruby') as HTMLButtonElement;
  expect(option.disabled).toBe(true);
  expect(option.closest('.bilingual-ruby-section')?.parentElement?.id).toBe('settings-content');
  expect(document.getElementById('bilingual-ruby-heading')!.dataset.text).toBe('bilingual_display_section');
  store.set('bilingual', true);
  const panel = await translationPanel();
  expect(panel.querySelector('.translation-content p')!.textContent).toContain('Una frase');
  expect(document.querySelector('#quote ruby')).toBeNull();
});
it('reports missing translations without using another quote', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ ...quote, id: 'other' }] }));
  store.set('bilingual', true);
  expect((await translationPanel()).textContent).toContain('No published translation');
});

it.each([false, 'false', 'true', 'unknown', undefined])(
  'work mode excludes translations without an explicit boolean true: %s',
  async (sfw) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ ...quote, sfw }] }));
    store.set('work', true);
    store.set('bilingual', true);
    expect((await translationPanel()).textContent).toContain('No published translation');
  },
);
it('does not fetch the same language', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  store.set('translation-locale', 'en-GB');
  store.set('bilingual', true);
  expect(document.querySelector('.translation-notice')!.textContent).toBe(
    'This quote is already in the selected language.',
  );
  expect(store.get('bilingual')).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});
it('loads English for an Esperanto draft with an independent English interface', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [quote] });
  vi.stubGlobal('fetch', fetch);
  store.set('active-quote', { ...quote, locale: 'eo-draft', quote_raw: 'Je noktomezo' });
  store.set('translation-locale', 'en-GB');
  store.set('bilingual', true);
  expect(fetch).toHaveBeenCalledWith('../times/en-GB/12_00.json');
  expect((await translationPanel()).textContent).toContain('At noon');
  expect(document.querySelector('.translation-notice')).toBeNull();
});
it('discards a response after the quote changes', async () => {
  let resolve!: (value: unknown) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    ),
  );
  store.set('bilingual', true);
  const resolveOld = resolve;
  store.set('active-quote', { ...quote, id: '1200-001' });
  renderTranslation();
  resolveOld({ ok: true, json: async () => [{ ...quote, quote_first: 'Stale translation' }] });
  await Promise.resolve();
  await Promise.resolve();
  expect(document.getElementById('quote')!.textContent).not.toContain('Stale translation');
});

it('uses the interface selector labels and an explicit locale heading', async () => {
  store.set('translation-locale', 'it-IT');
  store.set('bilingual', true);
  expect(document.querySelector('#translation-locale option[value="it-IT"]')!.textContent).toBe('Italiano (it-IT)');
  await translationPanel();
  const clockSelect = document.querySelector<HTMLSelectElement>('#clock-translation-locale')!;
  expect(clockSelect.selectedOptions[0].textContent).toBe('Italian (it-IT)');
  expect(clockSelect.getAttribute('aria-label')).toBe('Translate quote to');
  expect(document.querySelector('#bilingual svg')!.getAttribute('width')).toBe('16');
});

it('changes translation from the clock and synchronizes settings without changing the primary quote', async () => {
  store.set('bilingual', true);
  await translationPanel();
  const select = document.querySelector<HTMLSelectElement>('#clock-translation-locale')!;
  select.value = 'fr-FR';
  select.dispatchEvent(new Event('change'));
  expect(store.get('translation-locale')).toBe('fr-FR');
  expect(document.querySelector<HTMLSelectElement>('#translation-locale')!.value).toBe('fr-FR');
  expect(document.querySelector<HTMLSelectElement>('#clock-translation-locale')!.value).toBe('fr-FR');
  expect(JSON.parse(localStorage.getItem('settings')!)['translation-locale']).toBe('fr-FR');
  expect(fetch).toHaveBeenLastCalledWith('../times/fr-FR/12_00.json');
  expect(store.get('active-quote')).toEqual(quote);
  await translationPanel();
  const settingsSelect = document.querySelector<HTMLSelectElement>('#translation-locale')!;
  settingsSelect.value = 'en-GB';
  settingsSelect.dispatchEvent(new Event('change'));
  expect(document.querySelector<HTMLSelectElement>('#clock-translation-locale')!.value).toBe('en-GB');
  expect(document.querySelector('.translation-notice')).not.toBeNull();
});

it('lists Greek separately from British English and preserves the selected locale', () => {
  const select = document.querySelector<HTMLSelectElement>('#translation-locale')!;
  const options = [...select.options];
  expect(options.filter((option) => option.value === 'en-GB')).toHaveLength(1);
  expect(
    options.filter((option) => option.textContent === options.find((item) => item.value === 'en-GB')!.textContent),
  ).toHaveLength(1);
  expect(options.find((option) => option.value === 'el-GR')!.textContent).toContain('(el-GR)');
  select.value = 'el-GR';
  select.dispatchEvent(new Event('change'));
  expect(store.get('translation-locale')).toBe('el-GR');
  expect(select.value).toBe('el-GR');
});

it('fetches Chinese translations and retains the selected locale', async () => {
  store.set('bilingual', true);
  const select = document.querySelector<HTMLSelectElement>('#translation-locale')!;
  expect([...select.options].find((option) => option.value === 'zh-CN')!.textContent).toContain('中文（简体）');
  select.value = 'zh-CN';
  select.dispatchEvent(new Event('change'));
  expect(store.get('translation-locale')).toBe('zh-CN');
  expect(fetch).toHaveBeenLastCalledWith('../times/zh-CN/12_00.json');
  await translationPanel();
  expect(document.querySelector<HTMLSelectElement>('#clock-translation-locale')!.value).toBe('zh-CN');
});
it('fetches Russian translations and retains the selected locale', async () => {
  store.set('bilingual', true);
  const select = document.querySelector<HTMLSelectElement>('#translation-locale')!;
  expect([...select.options].find((option) => option.value === 'ru-RU')!.textContent).toContain('Русский');
  select.value = 'ru-RU';
  select.dispatchEvent(new Event('change'));
  expect(store.get('translation-locale')).toBe('ru-RU');
  expect(fetch).toHaveBeenLastCalledWith('../times/ru-RU/12_00.json');
  await translationPanel();
  expect(document.querySelector<HTMLSelectElement>('#clock-translation-locale')!.value).toBe('ru-RU');
});

it('keeps Arabic translation direction independent of the English interface', async () => {
  store.set('ui-locale', 'en-GB');
  store.set('translation-locale', 'ar-AE');
  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    json: async () => [{ ...quote, quote_first: 'عند ', quote_time_case: 'الظهر', title: 'Book', author: 'Author' }],
  } as Response);
  store.set('bilingual', true);
  await renderTranslation();
  const panel = document.getElementById('quote-translation')!;
  const content = panel.querySelector<HTMLElement>('.translation-content')!;
  expect(panel.dir).toBe('ltr');
  expect(content.dir).toBe('rtl');
  expect(content.lang).toBe('ar-AE');
  expect(content.querySelector('cite')!.dir).toBe('auto');
  expect(content.querySelector('bdi')!.textContent).toBe('Author');
});

it('keeps untranslated notices in Arabic when the main passage is English', async () => {
  store.set('ui-locale', 'ar-AE');
  store.set('translation-locale', 'ar-AE');
  store.set('bilingual', true);
  await renderTranslation();
  const content = document.querySelector<HTMLElement>('.translation-content')!;
  expect(content.lang).toBe('ar-AE');
  expect(content.dir).toBe('rtl');
  expect(content.textContent).toContain('لا تتوفر ترجمة');
});

it('keeps the current bilingual layout until the replacement is fully prepared', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [quote] }));
  store.set('bilingual', true);
  const previous = await translationPanel();
  let resolve!: (value: unknown) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    ),
  );
  store.set('translation-locale', 'fr-FR');
  expect(document.getElementById('quote-translation')).toBe(previous);
  expect(previous.textContent).not.toContain('Loading translation');
  resolve({ ok: true, json: async () => [{ ...quote, quote_first: 'French replacement' }] });
  await vi.waitFor(() =>
    expect(document.getElementById('quote-translation')!.textContent).toContain('French replacement'),
  );
  expect(document.getElementById('quote-translation')).not.toBe(previous);
});
it('does not restore a pending translation after bilingual mode is disabled', async () => {
  let resolve!: (value: unknown) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    ),
  );
  store.set('bilingual', true);
  expect(document.getElementById('quote-translation')).toBeNull();
  store.set('bilingual', false);
  resolve({ ok: true, json: async () => [quote] });
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  expect(document.getElementById('quote-translation')).toBeNull();
});

it('starts with no translation language and prompts without fetching', async () => {
  localStorage.clear();
  history.replaceState({}, '', '/');
  createStore();
  expect(store.get('translation-locale')).toBe('');
  document.body.innerHTML =
    '<div id="menu"><div id="settings"></div></div><button id="screensaver"></button><section id="settings-content"></section><blockquote id="quote"></blockquote>';
  initBilingual();
  store.set('active-quote', quote);
  store.set('translation-locale', '');
  store.set('bilingual', true);
  expect(document.querySelector<HTMLSelectElement>('#translation-locale')!.value).toBe('');
  expect((await translationPanel()).textContent).toContain('Please select a language');
  expect(fetch).not.toHaveBeenCalled();
  history.replaceState({}, '', '/');
  createStore();
  expect(store.get('translation-locale')).toBe('');
});
