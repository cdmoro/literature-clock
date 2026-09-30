import { store } from '../store';

/** Render the actual theme CSS in an isolated, script-free document. */
export function themePreviewDocument() {
  const root = document.documentElement.cloneNode(false) as HTMLElement;
  const head = document.createElement('head');
  const base = document.createElement('base');
  const baseUrl = new URL(document.baseURI);
  baseUrl.search = '';
  baseUrl.hash = '';
  base.href = baseUrl.href;
  head.append(base);
  document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((style) => {
    const copy = style.cloneNode(true) as HTMLElement;
    if (copy instanceof HTMLLinkElement) copy.href = (style as HTMLLinkElement).href;
    head.append(copy);
  });
  const sizing = document.createElement('style');
  sizing.textContent = `
    html, body { min-height: 100%; height: 100%; }
    body { margin: 0; padding: 1rem 1.75rem; box-sizing: border-box; display: flex; overflow: hidden; }
    *, *::before, *::after { animation: none !important; transition: none !important; }
    #clock { width: 100%; max-width: none; margin: auto; }
    #quote { margin: 0; padding: 0; transform: none; opacity: 1; visibility: visible; }
    #quote p { font-size: 1rem; line-height: 1.5; max-height: none; margin-bottom: .6rem;
      display: block; overflow: visible; visibility: visible; }
    #quote cite { display: block; font-size: .8rem; line-height: 1.4; margin-top: .5rem; overflow: visible; }
    .preview-passage, .preview-attribution { display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; }
    .preview-passage { -webkit-line-clamp: 3; }
    .preview-attribution { -webkit-line-clamp: 2; }
    #quote::before, #quote::after, #quote p::before, #quote p::after, #quote cite::after { content: none; }
    [data-theme|='frame'] #quote { border: 2px solid; padding: .75rem; border-radius: 1rem 0; }
    [data-theme|='festive'] #quote p { line-height: 1.8; padding-top: .4rem; }
    [data-theme|='festive'] #quote cite { font-size: .8rem; line-height: 1.8; }
    [data-theme|='festive'] .preview-attribution { -webkit-line-clamp: 1; }
    [data-theme|='anaglyph'] #quote { word-spacing: .08rem; }
    [data-theme='anaglyph-light'] #quote .time { text-shadow: 1px 0 #e60c05, -1px 0 #4be4e2; }
    [data-theme='anaglyph-dark'] #quote .time { text-shadow: 1px 0 #f50d3f, -1px 0 #41ceee; }
    [data-theme|='poster'] #quote { border: 2px solid color-mix(in srgb, var(--font-color), transparent 65%);
      border-image: none; background-image: none; box-shadow: 0 2px 6px #0002; padding: .75rem .9rem; }
    [data-theme|='poster'] #quote cite { padding-top: .4rem; border-top-width: 1px;
      font-family: var(--override-quote-font-family, var(--quote-font-family)); }
    :is([data-theme|='frame'], [data-theme|='poster'], [data-theme|='whatsapp']) .preview-passage { -webkit-line-clamp: 2; }
    [data-theme|='whatsapp'] #quote p { padding: .5rem .7rem; margin-inline-start: 0; max-width: 90%; }
    [data-theme|='whatsapp'] #quote cite { padding: .4rem .7rem; margin-inline-end: 0; max-width: 80%; }
    [data-theme='whatsapp-light'] #quote .time { color: color-mix(in srgb, var(--accent-color) 35%, #133d2b); }
    [data-theme='whatsapp-dark'] #quote .time { color: color-mix(in srgb, var(--accent-color) 35%, #ddffe8); }
    [data-theme|='subtle'] #quote { text-align: center; }
    [data-theme|='subtle'] #quote cite { margin-top: .6rem; }
    .sky-haze { filter: blur(12px); }
    .sky-sun, .sky-moon { width: 26px !important; height: 26px !important; }
  `;
  head.append(sizing);
  const body = document.createElement('body');
  body.className = document.body.className;
  body.classList.remove('screensaver', 'zen', 'bilingual');
  const sky = document.querySelector('.living-sky');
  if (sky) body.append(sky.cloneNode(true));
  const overlay = document.getElementById('photo-overlay');
  if (overlay) {
    const copy = overlay.cloneNode(true) as HTMLElement;
    copy.removeAttribute('style');
    body.append(copy);
  }
  const clock = document.createElement('div');
  clock.id = 'clock';
  const quote = document.getElementById('quote')?.cloneNode(true) as HTMLElement | undefined;
  if (quote) {
    // Remove secondary content so bilingual :has() layout rules cannot affect the preview.
    quote.querySelector('#quote-translation')?.remove();
    quote.removeAttribute('style');
    quote.querySelectorAll('[style]').forEach((element) => element.removeAttribute('style'));
    // Clamp only the text, leaving themed bubbles, padding and borders intact.
    for (const [selector, className] of [
      [':scope > p', 'preview-passage'],
      [':scope > cite', 'preview-attribution'],
    ]) {
      const content = quote.querySelector(selector);
      if (!content) continue;
      const text = document.createElement('span');
      text.className = className;
      text.append(...content.childNodes);
      content.append(text);
    }
    clock.append(quote);
  }
  body.append(clock);
  root.append(head, body);
  return `<!doctype html>${root.outerHTML}`;
}

/** The native select remains the single source of theme change events. */
export function initThemePicker(dialog: HTMLDialogElement) {
  const select = dialog.querySelector<HTMLSelectElement>('#theme-select');
  const row = select?.closest<HTMLElement>('.settings-row');
  if (!select || !row) return;
  row.hidden = true;
  const picker = document.createElement('div');
  picker.className = 'settings-theme-picker';
  // Match the chevron used by native selects in main.css.
  const chevron =
    '<svg class="theme-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false"><path d="M2 5l6 6 6-6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>';
  picker.innerHTML = `<div class="settings-theme-heading"><span data-text="theme">Theme</span></div>
    <div class="settings-theme-navigation">
      <button type="button" class="theme-previous" data-aria-label="settings_previous_theme" aria-label="Previous theme">${chevron}</button>
      <button type="button" id="theme-picker-toggle" aria-expanded="false" aria-controls="theme-picker-list"><span id="selected-theme-name"></span>${chevron}</button>
      <button type="button" class="theme-next" data-aria-label="settings_next_theme" aria-label="Next theme">${chevron}</button>
    </div>
    <div class="settings-theme-stage">
      <div id="theme-picker-list" hidden></div>
      <iframe id="settings-theme-preview" sandbox="" tabindex="-1" aria-hidden="true" title="Theme preview"></iframe>
    </div>`;
  row.after(picker);
  const colors = dialog.querySelector<HTMLElement>('#settings-color-controls');
  if (colors) {
    const colorRow = colors.closest('.settings-row');
    picker.querySelector('.theme-next')!.before(colors);
    colorRow?.remove();
  }
  const list = picker.querySelector<HTMLElement>('#theme-picker-list')!;
  const preview = picker.querySelector<HTMLIFrameElement>('#settings-theme-preview')!;
  const toggle = picker.querySelector<HTMLButtonElement>('#theme-picker-toggle')!;
  const setExpanded = (expanded: boolean) => {
    toggle.setAttribute('aria-expanded', String(expanded));
    list.hidden = !expanded;
    preview.hidden = expanded;
  };
  toggle.addEventListener('click', () => setExpanded(list.hidden));
  list.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    setExpanded(false);
    toggle.focus();
  });
  const choose = (value: string) => {
    if (select.value !== value) {
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setExpanded(false);
    scheduleRefresh();
  };
  for (const group of select.querySelectorAll('optgroup')) {
    const section = document.createElement('div');
    section.className = 'settings-theme-group';
    const heading = document.createElement('div');
    heading.className = 'settings-theme-group-title';
    heading.dataset.text = group.dataset.label;
    heading.textContent = group.label;
    const options = document.createElement('div');
    options.className = 'settings-theme-options';
    options.setAttribute('role', 'group');
    options.setAttribute('aria-label', group.label);
    section.append(heading, options);
    for (const option of group.querySelectorAll('option')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'settings-theme-option';
      button.dataset.value = option.value;
      const swatch = document.createElement('span');
      swatch.className = 'settings-theme-swatch';
      swatch.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.dataset.text = option.dataset.text;
      label.textContent = option.textContent;
      button.append(swatch, label);
      button.addEventListener('click', () => {
        choose(option.value);
        toggle.focus();
      });
      options.append(button);
    }
    list.append(section);
  }
  const step = (direction: number) => {
    const index = (select.selectedIndex + direction + select.options.length) % select.options.length;
    choose(select.options[index].value);
  };
  picker.querySelector('.theme-previous')!.addEventListener('click', () => step(-1));
  picker.querySelector('.theme-next')!.addEventListener('click', () => step(1));

  const refresh = () => {
    const selected = select.options[select.selectedIndex];
    picker.querySelector('#selected-theme-name')!.textContent = selected?.textContent || '';
    const variant = document.documentElement.dataset.theme?.endsWith('-dark') ? 'dark' : 'light';
    list.querySelectorAll<HTMLButtonElement>('.settings-theme-option').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.value === select.value));
      button.querySelector<HTMLElement>('.settings-theme-swatch')!.dataset.theme = `${button.dataset.value}-${variant}`;
    });
    list.querySelectorAll<HTMLElement>('.settings-theme-group').forEach((section, index) => {
      section
        .querySelector('[role="group"]')!
        .setAttribute('aria-label', select.querySelectorAll('optgroup')[index].label);
    });
    if (!dialog.open) return;
    const source = themePreviewDocument();
    if (preview.srcdoc !== source) preview.srcdoc = source;
  };
  // Observe completed updates, never an interpolated background during its transition.
  let scheduled = false;
  const scheduleRefresh = () => {
    if (scheduled || !dialog.isConnected) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      if (dialog.isConnected) refresh();
    });
  };
  store.subscribe(scheduleRefresh);
  const observer = new MutationObserver(scheduleRefresh);
  const quote = document.getElementById('quote');
  if (quote) observer.observe(quote, { childList: true, subtree: true, characterData: true });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'], childList: true });
  observer.observe(document.head, { childList: true, subtree: true, characterData: true });
  observer.observe(select, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['label'],
  });
  dialog.addEventListener('settings-preview', refresh);
  dialog.addEventListener('close', () => setExpanded(false));
  refresh();
}
