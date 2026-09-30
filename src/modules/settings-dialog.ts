import { store } from '../store';
import { initThemePicker } from './theme-picker';
import { readingIcon } from './reading-icons';
import { closeDialogOnBackdropClick } from '../utils/dialog';

/** Move the existing controls so their state and event handlers remain shared. */
export function initSettingsDialog() {
  const toolbar = document.getElementById('settings');
  if (!toolbar) return;

  const dialog = document.createElement('dialog');
  dialog.id = 'settings-dialog';
  dialog.setAttribute('aria-labelledby', 'settings-title');
  dialog.setAttribute('data-html2canvas-ignore', '');
  dialog.innerHTML = `
    <header><h2 id="settings-title" tabindex="-1" data-text="settings_title">Settings</h2>
      <button type="button" id="close-settings" class="dialog-close" data-aria-label="settings_close" aria-label="Close settings">${readingIcon('close')}</button></header>
    <div class="settings-tabs" role="tablist" data-aria-label="settings_title" aria-label="Settings">
      <button type="button" id="tab-content" role="tab" aria-controls="settings-content" aria-selected="true" data-text="settings_content">Content</button>
      <button type="button" id="tab-appearance" role="tab" aria-controls="settings-appearance" aria-selected="false" tabindex="-1" data-text="settings_appearance">Appearance</button>
      <button type="button" id="tab-behavior" role="tab" aria-controls="settings-behavior" aria-selected="false" tabindex="-1" data-text="settings_behavior">Behaviour</button>
    </div>
    <section id="settings-appearance" role="tabpanel" aria-labelledby="tab-appearance" tabindex="0" hidden></section>
    <section id="settings-content" role="tabpanel" aria-labelledby="tab-content" tabindex="0"></section>
    <section id="settings-behavior" role="tabpanel" aria-labelledby="tab-behavior" tabindex="0" hidden></section>`;
  document.body.append(dialog);

  const tabs = [...dialog.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const selectTab = (selected: HTMLButtonElement) => {
    tabs.forEach((tab) => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')!)!.hidden = !active;
    });
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
      let next: number;
      switch (event.key) {
        case 'ArrowRight':
          next = (index + 1) % tabs.length;
          break;
        case 'ArrowLeft':
          next = (index + tabs.length - 1) % tabs.length;
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = tabs.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      selectTab(tabs[next]);
      tabs[next].focus();
    });
  });

  const move = (id: string, section: string, label: string, group = false) => {
    const control = document.getElementById(id);
    if (!control) return;
    const row = document.createElement('div');
    row.className = 'settings-row';
    const caption = document.createElement('label');
    caption.htmlFor = id;
    caption.dataset.text = label;
    row.append(caption, group ? control.closest('.input-group')! : control);
    dialog.querySelector(`#settings-${section}`)!.append(row);
  };
  move('variant-select', 'appearance', 'settings_scheme', true);
  move('theme-select', 'appearance', 'theme', true);
  move('font-select', 'appearance', 'font', true);
  move('transition-select', 'behavior', 'transition', true);
  const localeSelect = document.getElementById('locale-select');
  if (localeSelect) localeSelect.id = 'ui-locale-select';
  document.getElementById('random-locale')?.remove();
  move('ui-locale-select', 'content', 'settings_ui_language', true);
  dialog.querySelector('#settings-content')!.insertAdjacentHTML(
    'beforeend',
    `
    <fieldset id="quote-languages"><legend data-text="settings_quote_languages">Quote languages</legend>
      <p class="settings-help"><span data-text="settings_languages_help">Choose languages to rotate through. If none are selected, quotes use the interface language.</span> <span id="select-all-languages-row"><a id="select-all-languages" href="#" data-text="settings_select_all">Select all</a><span id="clear-languages-action" hidden> · <a id="clear-languages" href="#" data-text="settings_clear_selection">Clear selection</a></span>.</span></p>
      <div id="quote-language-options"></div>
    </fieldset>`,
  );
  const hideTitle = document.createElement('button');
  hideTitle.id = 'hide-book-title';
  hideTitle.type = 'button';
  hideTitle.innerHTML = readingIcon('hide-title');
  toolbar.append(hideTitle);
  hideTitle.addEventListener('click', () => store.toggle('hide-book-title'));
  move('hide-book-title', 'behavior', 'settings_hide_book_title');
  move('work', 'behavior', 'settings_work_help');

  move('show-time', 'behavior', 'time_mode');
  move('progressbar', 'behavior', 'progressbar_mode');

  for (const key of ['work', 'show-time', 'progressbar', 'hide-book-title'] as const) {
    const button = document.getElementById(key);
    if (!button) continue;
    button.classList.add('settings-switch');
    button.setAttribute('role', 'switch');
    const caption = button.closest('.settings-row')!.querySelector('label')!;
    caption.id = `${key}-caption`;
    button.setAttribute('aria-labelledby', caption.id);
    const icon = button.querySelector('svg');
    if (icon) {
      icon.setAttribute('aria-hidden', 'true');
      caption.before(icon);
    }
    button.replaceChildren();
    const refresh = () => button.setAttribute('aria-checked', String(store.get(key)));
    store.subscribe(refresh);
    refresh();
  }
  const fontRow = document.getElementById('font-select')?.closest('.settings-row');
  if (fontRow) {
    const fontGroup = document.createElement('div');
    fontGroup.className = 'settings-font';
    const controls = fontRow.querySelector('.input-group')!;
    controls.before(fontGroup);
    fontGroup.append(controls);
    controls.insertAdjacentHTML(
      'beforeend',
      `<button type="button" id="remove-custom-font" data-title="settings_font_remove" data-aria-label="settings_font_remove" aria-label="Remove this font" hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Z"/></svg>
      </button>`,
    );
    fontRow.insertAdjacentHTML(
      'afterend',
      `<div class="settings-row settings-google-fonts">
        <label for="custom-font-name" data-text="settings_custom_font">Google Fonts</label>
        <div class="settings-custom-font">
        <p id="custom-font-help" class="settings-help" data-text="settings_font_help">Paste a Google Fonts family name and choose Apply. If unavailable, the theme’s default font is used.</p>
        <form id="custom-font-form">
          <div><input id="custom-font-name" type="text" maxlength="100" placeholder="e.g. Lora" autocomplete="off" spellcheck="false" aria-describedby="custom-font-help custom-font-status">
          <button type="submit" data-text="settings_font_apply">Apply</button></div>
          <p id="custom-font-status" role="status" aria-live="polite"></p>
        </form>
        </div>
      </div>`,
    );
  }

  const colors = document.getElementById('color-controls');
  if (colors) {
    toolbar.append(colors);
    const copy = colors.cloneNode(true) as HTMLElement;
    copy.id = 'settings-color-controls';
    copy.querySelector('#color-picker')!.id = 'settings-color-picker';
    copy.querySelector('#reset-color')!.id = 'settings-reset-color';
    dialog.querySelector('#settings-appearance')!.append(copy);
    move('settings-color-picker', 'appearance', 'settings_color', true);
    const colorRow = copy.closest('.settings-row')!;
    document.getElementById('theme-select')?.closest('.settings-row')?.after(colorRow);
  }

  initThemePicker(dialog);

  // Moving controls leaves whitespace-only wrappers that still occupy a flex gap.
  toolbar.querySelectorAll(':scope > span').forEach((group) => {
    if (!group.children.length && !group.textContent?.trim()) group.remove();
  });

  const open = document.createElement('button');
  open.id = 'open-settings';
  open.type = 'button';
  open.setAttribute('aria-haspopup', 'dialog');
  open.setAttribute('aria-controls', dialog.id);
  open.setAttribute('data-title', 'settings_title');
  open.setAttribute('data-aria-label', 'settings_title');
  open.setAttribute('aria-label', 'Settings');
  open.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M19.76 8.79 20.18 10.11 22.83 10.09 22.83 13.91 20.18 13.89 19.76 15.21 19.12 16.45 21.01 18.31 18.31 21.01 16.45 19.12 15.21 19.76 13.89 20.18 13.91 22.83 10.09 22.83 10.11 20.18 8.79 19.76 7.55 19.12 5.69 21.01 2.99 18.31 4.88 16.45 4.24 15.21 3.82 13.89 1.17 13.91 1.17 10.09 3.82 10.11 4.24 8.79 4.88 7.55 2.99 5.69 5.69 2.99 7.55 4.88 8.79 4.24 10.11 3.82 10.09 1.17 13.91 1.17 13.89 3.82 15.21 4.24 16.45 4.88 18.31 2.99 21.01 5.69 19.12 7.55Z M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8Z"/></svg>';
  toolbar.append(open);
  open.addEventListener('click', () => {
    selectTab(tabs[0]);
    dialog.showModal();
    dialog.dispatchEvent(new Event('settings-preview'));
    dialog.scrollTop = 0;
    // Land focus on the title, not the close button — showModal() would
    // otherwise focus the first focusable descendant (the close button),
    // making it look focused as soon as the dialog opens.
    dialog.querySelector<HTMLElement>('#settings-title')?.focus();
  });
  dialog.querySelector('#close-settings')!.addEventListener('click', () => dialog.close());
  closeDialogOnBackdropClick(dialog);
  dialog.addEventListener('close', () => open.focus());
}
