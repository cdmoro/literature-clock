import { store } from '../store';
import { getBaseLocale, getInterfaceLocale } from './locales';
import { setTheme } from './themes';
import { supportsBackgroundPattern } from '../utils/background-patterns';
import SETTINGS from '../strings/settings.json';

interface AppearancePreset {
  id: 'christmas' | 'halloween' | 'valentine';
  palette?: 'green' | 'purple' | 'pink';
  background?: 'default';
  pattern?: 'christmas' | 'halloween' | 'valentine';
  effect?: 'snow' | 'dust-v2' | 'stars';
  size?: '2';
}

const PRESETS: AppearancePreset[] = [
  { id: 'christmas', palette: 'green', background: 'default', pattern: 'christmas', effect: 'snow', size: '2' },
  { id: 'halloween', palette: 'purple', background: 'default', pattern: 'halloween', effect: 'dust-v2', size: '2' },
  { id: 'valentine', palette: 'pink', background: 'default', pattern: 'valentine', effect: 'stars', size: '2' },
];

export function initAppearancePresets(dialog: HTMLDialogElement) {
  const panel = dialog.querySelector('#settings-appearance');
  const themePicker = panel?.querySelector('.settings-theme-picker');
  if (!panel || !themePicker) return;

  const section = document.createElement('section');
  section.className = 'settings-appearance-presets';
  section.setAttribute('aria-labelledby', 'appearance-presets-title');
  section.innerHTML = `
    <h3 id="appearance-presets-title" data-text="settings_presets_title"></h3>
    <p class="settings-presets-help" data-text="settings_presets_help"></p>
    <div class="settings-preset-options" role="group" aria-labelledby="appearance-presets-title">
      ${PRESETS.map(
        ({ id }) => `<button type="button" class="settings-preset" data-preset="${id}" aria-pressed="false">
          <span class="settings-preset-preview background-pattern-surface" data-preset="${id}" data-theme="base-dark" data-background-pattern="${id}" aria-hidden="true"></span>
          <span data-text="settings_preset_${id}"></span>
        </button>`,
      ).join('')}
    </div>`;
  themePicker.before(section);

  const updateLabels = () => {
    const labels = SETTINGS[getBaseLocale(getInterfaceLocale())];
    section.querySelectorAll<HTMLElement>('[data-text]').forEach((element) => {
      const text = labels[element.dataset.text as keyof typeof labels];
      if (text) element.textContent = text;
    });
  };
  const updateSelection = () => {
    const theme = store.get('theme').split('-')[0];
    const current = PRESETS.find(
      (preset) =>
        (!preset.palette || theme === 'base') &&
        (!preset.palette || store.get('palette') === preset.palette) &&
        (!preset.background || store.get('background') === preset.background) &&
        (!preset.pattern || store.get('background-pattern') === preset.pattern) &&
        (!preset.effect || store.get('background-effect') === preset.effect) &&
        (!preset.size || store.get('pattern-size') === preset.size),
    );
    section.querySelectorAll<HTMLButtonElement>('.settings-preset').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.preset === current?.id));
    });
  };

  section.querySelectorAll<HTMLButtonElement>('.settings-preset').forEach((button) => {
    button.addEventListener('click', () => {
      const preset = PRESETS.find(({ id }) => id === button.dataset.preset);
      if (!preset) return;

      const theme = dialog.querySelector<HTMLSelectElement>('#theme-select');
      const needsBaseTheme = !!preset.palette || (!!preset.pattern && !!theme && !supportsBackgroundPattern(theme.value));
      if (theme && needsBaseTheme && theme.value !== 'base') {
        theme.value = 'base';
        theme.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (preset.palette) {
        store.set('palette', preset.palette);
        setTheme({ isVariantChange: true });
      }
      if (preset.background) store.set('background', preset.background);
      if (preset.pattern) store.set('background-pattern', preset.pattern);
      if (preset.effect) store.set('background-effect', preset.effect);
      if (preset.size) store.set('pattern-size', preset.size);
    });
  });

  store.subscribe((state, old) => {
    updateSelection();
    if (state['ui-locale'] !== old['ui-locale'] || state.locale !== old.locale) updateLabels();
  });
  updateLabels();
  updateSelection();
}
