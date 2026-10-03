import { store } from '../store';
import { BACKGROUND_PATTERNS, isBackgroundPattern, supportsBackgroundPattern } from '../utils/background-patterns';

export function refreshBackgroundPattern() {
  const root = document.documentElement;
  const supported = supportsBackgroundPattern(root.dataset.theme || store.get('theme'));
  root.dataset.backgroundPattern = supported ? store.get('background-pattern') : 'none';
  const select = document.querySelector<HTMLSelectElement>('#background-pattern');
  if (select) {
    select.value = store.get('background-pattern');
    select.disabled = !supported;
    select.closest<HTMLElement>('.settings-row')!.hidden = !supported;
  }
}

export function initBackgroundPatterns(dialog: HTMLDialogElement) {
  const row = document.createElement('div');
  row.className = 'settings-row';
  row.innerHTML = `<label for="background-pattern" data-text="settings_background_pattern">Background pattern</label>
    <div class="input-group"><select id="background-pattern">${BACKGROUND_PATTERNS.map(
      (pattern) => `<option value="${pattern}" data-text="settings_pattern_${pattern}">${pattern}</option>`,
    ).join('')}</select></div>`;
  const picker = dialog.querySelector('.settings-theme-picker');
  if (picker) picker.after(row);
  else dialog.querySelector('#settings-appearance')!.append(row);
  row.querySelector('select')!.addEventListener('change', (event) => {
    const value = (event.target as HTMLSelectElement).value;
    if (isBackgroundPattern(value)) store.set('background-pattern', value);
  });
  store.subscribe(refreshBackgroundPattern);
  refreshBackgroundPattern();
}
