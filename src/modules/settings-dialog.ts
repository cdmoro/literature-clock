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
  move('theme-select', 'appearance', 'theme', true);
  move('variant-select', 'appearance', 'settings_scheme', true);
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
      <label class="settings-check"><input type="checkbox" id="follow-ui-language"><span data-text="settings_follow_language">Same as the interface</span></label>
      <p class="settings-help" data-text="settings_languages_help">Choose one or more languages to rotate through.</p>
      <div id="quote-language-options"></div>
    </fieldset>`,
  );
  move('work', 'behavior', 'work_mode');
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
  const workRow = document.getElementById('work')?.closest('.settings-row');
  workRow?.insertAdjacentHTML(
    'beforeend',
    '<p id="work-description" class="settings-help" data-text="settings_work_help">Only show quotes that are safe to view at work.</p>',
  );
  document.getElementById('work')?.setAttribute('aria-describedby', 'work-description');
  document
    .getElementById('font-select')
    ?.closest('.settings-row')
    ?.insertAdjacentHTML(
      'afterend',
      '<p id="font-preview" data-text="settings_font_preview">The time is always right to read a good book.</p>',
    );

  const colors = document.getElementById('color-controls');
  if (colors) {
    toolbar.append(colors);
    const copy = colors.cloneNode(true) as HTMLElement;
    copy.id = 'settings-color-controls';
    copy.querySelector('#color-picker')!.id = 'settings-color-picker';
    copy.querySelector('#reset-color')!.id = 'settings-reset-color';
    dialog.querySelector('#settings-appearance')!.append(copy);
    move('settings-color-picker', 'appearance', 'settings_color', true);
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
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 3-.5 2.2-2 1.2-2.2-.7-2 3.5L4 10.8v2.4l-1.7 1.6 2 3.5 2.2-.7 2 1.2L9 21h4l.5-2.2 2-1.2 2.2.7 2-3.5-1.7-1.6v-2.4l1.7-1.6-2-3.5-2.2.7-2-1.2L13 3Z" transform="translate(1 0)"/><circle cx="12" cy="12" r="3"/></svg>';
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
