import { store } from '../store';

/** Move the existing controls so their state and event handlers remain shared. */
export function initSettingsDialog() {
  const toolbar = document.getElementById('settings');
  if (!toolbar) return;

  const dialog = document.createElement('dialog');
  dialog.id = 'settings-dialog';
  dialog.setAttribute('aria-labelledby', 'settings-title');
  dialog.setAttribute('data-html2canvas-ignore', '');
  dialog.innerHTML = `
    <header><h2 id="settings-title" data-text="settings_title">Settings</h2>
      <button type="button" id="close-settings" autofocus data-aria-label="settings_close" aria-label="Close settings">×</button></header>
    <section id="settings-appearance"><h3 data-text="settings_appearance">Appearance</h3></section>
    <section id="settings-content"><h3 data-text="settings_content">Content</h3></section>
    <section id="settings-behavior"><h3 data-text="settings_behavior">Behaviour</h3></section>`;
  document.body.append(dialog);

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
  move('transition-select', 'appearance', 'transition', true);
  const localeSelect = document.getElementById('locale-select');
  if (localeSelect) localeSelect.id = 'ui-locale-select';
  document.getElementById('random-locale')?.remove();
  move('ui-locale-select', 'content', 'settings_ui_language', true);
  dialog.querySelector('#settings-content')!.insertAdjacentHTML(
    'beforeend',
    `
    <fieldset id="quote-languages"><legend data-text="settings_quote_languages">Quote languages</legend>
      <label class="settings-follow"><span data-text="settings_follow_language">Same as the interface</span><input class="settings-switch" type="checkbox" role="switch" id="follow-ui-language"></label>
      <p class="settings-help" data-text="settings_languages_help">Choose one or more languages to rotate through.</p>
      <div id="quote-language-options"></div>
    </fieldset>`,
  );
  move('work', 'behavior', 'settings_work_help');
  move('show-time', 'behavior', 'time_mode');
  move('progressbar', 'behavior', 'progressbar_mode');

  for (const key of ['work', 'show-time', 'progressbar'] as const) {
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
    fontRow.before(fontGroup);
    fontGroup.append(fontRow);
    fontGroup.insertAdjacentHTML(
      'beforeend',
      '<p id="font-preview" data-text="settings_font_preview">The time is always right to read a good book.</p>',
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
    dialog.showModal();
    dialog.scrollTop = 0;
  });
  dialog.querySelector('#close-settings')!.addEventListener('click', () => dialog.close());
  // A click on empty space within the panel is not a backdrop click.
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    if (
      event.target === dialog &&
      (event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom)
    ) {
      dialog.close();
    }
  });
  dialog.addEventListener('close', () => open.focus());
}
