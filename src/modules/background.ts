import { store } from '../store';
import { BACKGROUNDS, Background, resolveBackground, supportsBackground } from '../utils/background';
import { updatePhotoBackground, clearPhotoBackground } from './photo-background';
import { getBaseLocale, getInterfaceLocale } from './locales';
import SETTINGS from '../strings/settings.json';

export function refreshBackground() {
  const theme = store.get('theme');
  const background = resolveBackground(theme, store.get('background'));
  document.documentElement.dataset.background = background;
  const select = document.querySelector<HTMLSelectElement>('#background-select');
  if (select) {
    select.disabled = !supportsBackground(theme);
    select.value = select.disabled ? background : store.get('background');
  }
  if (background === 'photo') updatePhotoBackground();
  else clearPhotoBackground();
}

export function initBackground(dialog: HTMLDialogElement) {
  const row = document.createElement('div');
  row.className = 'settings-row settings-background-row';
  row.innerHTML = `<label for="background-select" data-text="settings_background"></label>
    <div class="input-group"><select id="background-select">${BACKGROUNDS.map(
      (value) => `<option value="${value}" data-text="settings_background_${value}"></option>`,
    ).join('')}</select></div>`;
  dialog.querySelector('.settings-theme-picker')!.after(row);
  row.querySelector('select')!.addEventListener('change', (event) => {
    const select = event.target as HTMLSelectElement;
    if (!select.disabled) store.set('background', select.value as Background);
  });
  const refresh = () => {
    const labels = SETTINGS[getBaseLocale(getInterfaceLocale())];
    row.querySelectorAll<HTMLElement>('[data-text]').forEach((element) => {
      element.textContent = labels[element.dataset.text as keyof typeof labels];
    });
    refreshBackground();
  };
  store.subscribe((state, old) => {
    if (
      state.theme !== old.theme ||
      state.background !== old.background ||
      state['ui-locale'] !== old['ui-locale'] ||
      state.locale !== old.locale
    )
      refresh();
  });
  refresh();
}
