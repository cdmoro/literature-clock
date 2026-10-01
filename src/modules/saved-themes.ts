import { store, validateSettings } from '../store';
import { applyCustomFont, resetFont } from './font';
import { setTheme } from './themes';
import { getBaseLocale, getInterfaceLocale } from './locales';
import SETTINGS from '../strings/settings.json';

const ACTIVE_THEME_KEY = 'active-saved-theme';
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
        <button type="button" id="apply-saved-theme" data-title="settings_saved_apply" data-aria-label="settings_saved_apply" title="Apply" aria-label="Apply"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button>
        <button type="button" id="delete-saved-theme" data-title="settings_saved_delete" data-aria-label="settings_saved_delete" title="Delete" aria-label="Delete"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button></div>
      <form id="save-theme-form"><div class="input-group">
        <input id="saved-theme-name" maxlength="100" data-aria-label="settings_saved_name" aria-label="Name (optional)" data-placeholder="settings_saved_name" placeholder="Name (optional)">
        <button type="submit" data-text="settings_saved_save">Save current</button></div></form>
      <button type="button" id="update-saved-theme" data-text="settings_saved_update" hidden>Update active theme</button>
      <p class="settings-help" data-text="settings_saved_help">Saved only in this browser. Includes colours, font, transitions, safe-for-work filter, time visibility, book title and progress bar.</p>
      <p id="saved-theme-status" role="status" aria-live="polite"></p>
    </div>`,
  );
  const select = dialog.querySelector<HTMLSelectElement>('#saved-theme-select')!;
  const apply = dialog.querySelector<HTMLButtonElement>('#apply-saved-theme')!;
  const remove = dialog.querySelector<HTMLButtonElement>('#delete-saved-theme')!;
  const input = dialog.querySelector<HTMLInputElement>('#saved-theme-name')!;
  const status = dialog.querySelector<HTMLElement>('#saved-theme-status')!;
  const update = dialog.querySelector<HTMLButtonElement>('#update-saved-theme')!;
  let entries = readSavedThemes();
  let activeId = '';
  try {
    activeId = localStorage.getItem(ACTIVE_THEME_KEY) || '';
  } catch {
    /* Storage may be unavailable. */
  }
  const setActive = (id: string) => {
    activeId = id;
    try {
      localStorage.setItem(ACTIVE_THEME_KEY, id);
    } catch {
      /* Settings still apply in memory. */
    }
  };
  const snapshot = () => Object.fromEntries(KEYS.map((key) => [key, store.get(key)])) as Preferences;
  const refreshActions = () => {
    apply.disabled = remove.disabled = !select.value;
    update.hidden = !activeId || select.value !== activeId;
    const active = entries.find((entry) => entry.id === activeId);
    update.disabled = !active || KEYS.every((key) => active.settings[key] === store.get(key));
  };
  store.subscribe(refreshActions);
  const strings = () => SETTINGS[getBaseLocale(getInterfaceLocale())];
  const refresh = (id = select.value) => {
    select.replaceChildren();
    const placeholder = new Option(strings().settings_saved_choose, '');
    placeholder.dataset.text = 'settings_saved_choose';
    select.append(placeholder);
    entries.forEach((entry) => select.append(new Option(entry.name, entry.id)));
    select.value = entries.some((entry) => entry.id === id) ? id : '';
    refreshActions();
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
  select.addEventListener('change', refreshActions);
  dialog.querySelector('#save-theme-form')!.addEventListener('submit', (event) => {
    event.preventDefault();
    const baseName =
      document.querySelector<HTMLSelectElement>('#theme-select')?.selectedOptions[0]?.textContent || 'Theme';
    let number = 1;
    while (entries.some((entry) => entry.name === `${baseName} (custom) ${number}`)) number++;
    const name = input.value.trim() || `${baseName} (custom) ${number}`;
    const settings = snapshot();
    const entry = { id: crypto.randomUUID(), name, settings };
    if (persist([...entries, entry])) {
      input.value = '';
      setActive(entry.id);
      refresh(entry.id);
    }
  });
  apply.addEventListener('click', async () => {
    const entry = entries.find((entry) => entry.id === select.value);
    if (!entry) return;
    apply.disabled = true;
    try {
      await applySavedTheme(entry.settings);
      setActive(entry.id);
      refreshActions();
    } finally {
      apply.disabled = !select.value;
    }
  });
  remove.addEventListener('click', () => {
    const id = select.value;
    if (persist(entries.filter((entry) => entry.id !== id))) {
      if (activeId === id) setActive('');
      refresh('');
    }
  });
  update.addEventListener('click', () => {
    if (update.hidden || update.disabled) return;
    const next = entries.map((entry) => (entry.id === activeId ? { ...entry, settings: snapshot() } : entry));
    if (persist(next)) refresh(activeId);
  });
  const matching = entries.find((entry) => KEYS.every((key) => entry.settings[key] === store.get(key)));
  if (!entries.some((entry) => entry.id === activeId)) activeId = matching?.id || '';
  refresh(activeId);
}
