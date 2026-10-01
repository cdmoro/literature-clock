import { store, validateSettings } from '../store';
import { applyCustomFont, resetFont } from './font';
import { setTheme } from './themes';
import { getBaseLocale, getInterfaceLocale } from './locales';
import SETTINGS from '../strings/settings.json';

export const SAVED_THEMES_KEY = 'saved-themes';
const KEYS = ['theme', 'color', 'font', 'transition', 'work', 'show-time', 'hide-book-title', 'progressbar'] as const;
type Preferences = Pick<ReturnType<typeof validateSettings>, (typeof KEYS)[number]>;
interface SavedTheme {
  id: string;
  name: string;
  settings: Preferences;
}

export function readSavedThemes(): SavedTheme[] {
  try {
    const entries: unknown = JSON.parse(localStorage.getItem(SAVED_THEMES_KEY) || '[]');
    if (!Array.isArray(entries)) return [];
    const seen = new Set<string>();
    return entries.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const { id, name, settings } = entry;
      if (typeof id !== 'string' || seen.has(id) || typeof name !== 'string' || !name.trim()) return [];
      const validated = validateSettings(settings, false);
      if (!KEYS.every((key) => validated[key] !== undefined)) return [];
      const snapshot = Object.fromEntries(KEYS.map((key) => [key, validated[key]])) as Preferences;
      seen.add(id);
      return [{ id, name: name.trim().slice(0, 100), settings: snapshot }];
    });
  } catch {
    return [];
  }
}

export async function applySavedTheme(settings: Preferences) {
  const theme = document.querySelector<HTMLSelectElement>('#theme-select');
  const variant = document.querySelector<HTMLSelectElement>('#variant-select');
  if (!theme || !variant) return;
  [theme.value, variant.value] = settings.theme!.split('-');
  variant.value ||= 'system';
  setTheme();
  const color = document.querySelector<HTMLInputElement>('#settings-color-picker');
  if (color) {
    color.value = settings.color!;
    color.dispatchEvent(new Event('input', { bubbles: true }));
  }
  for (const key of ['work', 'show-time', 'hide-book-title'] as const) {
    if (store.get(key) !== settings[key]) document.getElementById(key)?.click();
  }
  for (const [key, id] of [
    ['transition', 'transition-select'],
    ['progressbar', 'progressbar'],
  ] as const) {
    const select = document.querySelector<HTMLSelectElement>(`#${id}`);
    if (select) {
      select.value = settings[key]!;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  if (settings.font === 'default') resetFont();
  else await applyCustomFont(settings.font!, true);
}

export function initSavedThemes(dialog: HTMLDialogElement) {
  const panel = dialog.querySelector('#settings-appearance');
  if (!panel) return;
  panel.insertAdjacentHTML(
    'beforeend',
    `
    <div class="settings-saved-themes">
      <label for="saved-theme-select" data-text="settings_saved_themes">Saved themes</label>
      <div class="input-group"><select id="saved-theme-select"></select>
        <button type="button" id="apply-saved-theme" data-text="settings_saved_apply">Apply</button>
        <button type="button" id="delete-saved-theme" data-text="settings_saved_delete">Delete</button></div>
      <form id="save-theme-form"><div class="input-group">
        <input id="saved-theme-name" maxlength="100" data-aria-label="settings_saved_name" aria-label="Name (optional)" data-placeholder="settings_saved_name" placeholder="Name (optional)">
        <button type="submit" data-text="settings_saved_save">Save current</button></div></form>
      <p class="settings-help" data-text="settings_saved_help">Saved only in this browser. Includes colours, font, transitions, safe-for-work filter, time visibility, book title and progress bar.</p>
      <p id="saved-theme-status" role="status" aria-live="polite"></p>
    </div>`,
  );
  const select = dialog.querySelector<HTMLSelectElement>('#saved-theme-select')!;
  const apply = dialog.querySelector<HTMLButtonElement>('#apply-saved-theme')!;
  const remove = dialog.querySelector<HTMLButtonElement>('#delete-saved-theme')!;
  const input = dialog.querySelector<HTMLInputElement>('#saved-theme-name')!;
  const status = dialog.querySelector<HTMLElement>('#saved-theme-status')!;
  let entries = readSavedThemes();
  const strings = () => SETTINGS[getBaseLocale(getInterfaceLocale())];
  const refresh = (id = select.value) => {
    select.replaceChildren();
    const placeholder = new Option(strings().settings_saved_choose, '');
    placeholder.dataset.text = 'settings_saved_choose';
    select.append(placeholder);
    entries.forEach((entry) => select.append(new Option(entry.name, entry.id)));
    select.value = entries.some((entry) => entry.id === id) ? id : '';
    apply.disabled = remove.disabled = !select.value;
  };
  const persist = (next: SavedTheme[]) => {
    try {
      localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify(next));
      entries = next;
      status.textContent = '';
      delete status.dataset.text;
      return true;
    } catch {
      status.dataset.text = 'settings_saved_error';
      status.textContent = strings().settings_saved_error;
      return false;
    }
  };
  select.addEventListener('change', () => {
    apply.disabled = remove.disabled = !select.value;
  });
  dialog.querySelector('#save-theme-form')!.addEventListener('submit', (event) => {
    event.preventDefault();
    const baseName =
      document.querySelector<HTMLSelectElement>('#theme-select')?.selectedOptions[0]?.textContent || 'Theme';
    let number = 1;
    while (entries.some((entry) => entry.name === `${baseName} (custom) ${number}`)) number++;
    const name = input.value.trim() || `${baseName} (custom) ${number}`;
    const settings = Object.fromEntries(KEYS.map((key) => [key, store.get(key)])) as Preferences;
    const entry = { id: crypto.randomUUID(), name, settings };
    if (persist([...entries, entry])) {
      input.value = '';
      refresh(entry.id);
    }
  });
  apply.addEventListener('click', async () => {
    const entry = entries.find((entry) => entry.id === select.value);
    if (!entry) return;
    apply.disabled = true;
    try {
      await applySavedTheme(entry.settings);
    } finally {
      apply.disabled = !select.value;
    }
  });
  remove.addEventListener('click', () => {
    if (persist(entries.filter((entry) => entry.id !== select.value))) refresh('');
  });
  refresh();
}
