import { readingIcon } from './reading-icons';
import { store } from '../store';
import {
  BACKGROUND_PATTERNS,
  isBackgroundPattern,
  resolveBackgroundPattern,
  supportsBackgroundPattern,
} from '../utils/background-patterns';
import { getBaseLocale, getInterfaceLocale } from './locales';
import SETTINGS from '../strings/settings.json';

export function getCurrentBackgroundPattern(pattern = store.get('background-pattern')) {
  const now = new Date();
  const minute = store.get('active-quote')?.time || store.get('time') || `${now.getHours()}:${now.getMinutes()}`;
  return resolveBackgroundPattern(pattern, minute);
}

export function refreshBackgroundPattern() {
  const root = document.documentElement;
  const supported = supportsBackgroundPattern(root.dataset.theme || store.get('theme'));
  const pattern = store.get('background-pattern');
  const activePattern = getCurrentBackgroundPattern();
  root.dataset.backgroundPattern = supported ? activePattern : 'none';
  const select = document.querySelector<HTMLSelectElement>('#background-pattern');
  if (select) {
    select.value = pattern;
    select.disabled = !supported;
    select.closest<HTMLElement>('.settings-row')!.hidden = !supported;
  }
  const caption = document.getElementById('pattern-picker-name');
  if (caption) {
    const key = `settings_pattern_${pattern}` as keyof (typeof SETTINGS)['en-GB'];
    caption.dataset.text = key;
    caption.textContent = SETTINGS[getBaseLocale(getInterfaceLocale())][key];
    document.getElementById('pattern-picker-swatch')!.dataset.backgroundPattern = activePattern;
    document.querySelectorAll<HTMLButtonElement>('.pattern-option').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.pattern === pattern));
    });
  }
  if (!supported) {
    document.getElementById('pattern-picker-menu')?.setAttribute('hidden', '');
    document.getElementById('pattern-picker-toggle')?.setAttribute('aria-expanded', 'false');
  }
}

export function initBackgroundPatterns(dialog: HTMLDialogElement) {
  const row = document.createElement('div');
  row.className = 'settings-row settings-pattern-row';
  row.innerHTML = `<label id="pattern-picker-label" for="pattern-picker-toggle" data-text="settings_background_pattern">Background pattern</label>
    <select id="background-pattern" hidden aria-hidden="true" tabindex="-1">${BACKGROUND_PATTERNS.map(
      (pattern) => `<option value="${pattern}" data-text="settings_pattern_${pattern}">${pattern}</option>`,
    ).join('')}</select>
    <div class="input-group"><button type="button" id="pattern-picker-toggle" aria-expanded="false" aria-controls="pattern-picker-menu" aria-labelledby="pattern-picker-label pattern-picker-name">
      <span id="pattern-picker-swatch" class="pattern-swatch background-pattern-surface" aria-hidden="true"></span><span id="pattern-picker-name"></span><svg class="pattern-picker-arrow" width="16" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 5l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button></div>
    <div id="pattern-picker-menu" role="group" aria-labelledby="pattern-picker-label" hidden>${BACKGROUND_PATTERNS.map(
      (pattern) =>
        `<button type="button" class="pattern-option" data-pattern="${pattern}" aria-pressed="false"><span class="pattern-swatch background-pattern-surface" data-background-pattern="${pattern}" aria-hidden="true">${pattern === 'random' ? readingIcon('shuffle') : ''}<span class="pattern-selected-icon">${readingIcon('check')}</span></span><span data-text="settings_pattern_${pattern}">${pattern}</span></button>`,
    ).join('')}</div>`;
  const picker = dialog.querySelector('.settings-theme-picker');
  if (picker) picker.after(row);
  else dialog.querySelector('#settings-appearance')!.append(row);
  const toggle = row.querySelector<HTMLButtonElement>('#pattern-picker-toggle')!;
  const menu = row.querySelector<HTMLElement>('#pattern-picker-menu')!;
  const buttons = [...menu.querySelectorAll<HTMLButtonElement>('button')];
  const close = (focus = false) => {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    if (focus) toggle.focus();
  };
  toggle.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    toggle.setAttribute('aria-expanded', String(!menu.hidden));
    if (!menu.hidden) buttons.find((button) => button.dataset.pattern === store.get('background-pattern'))?.focus();
  });
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => {
      const pattern = button.dataset.pattern!;
      if (isBackgroundPattern(pattern)) store.set('background-pattern', pattern);
      close(true);
    });
    button.addEventListener('keydown', (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 }[event.key];
      if (step !== undefined || event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? buttons.length - 1
              : (index + step! + buttons.length) % buttons.length;
        buttons[next].focus();
      }
    });
  });
  row.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
  });
  document.addEventListener('click', (event) => {
    if (event.target instanceof Node && !row.contains(event.target)) close();
  });
  dialog.addEventListener('close', () => close());
  dialog.querySelectorAll('[role="tab"]').forEach((tab) => tab.addEventListener('click', () => close()));
  row.querySelector('select')!.addEventListener('change', (event) => {
    const value = (event.target as HTMLSelectElement).value;
    if (isBackgroundPattern(value)) store.set('background-pattern', value);
  });
  store.subscribe(refreshBackgroundPattern);
  refreshBackgroundPattern();
}
