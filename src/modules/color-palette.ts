import { store } from '../store';
import { defaultColor, setTheme } from './themes';
import { contrastingText } from '../utils/colors';
import { getBaseLocale, getInterfaceLocale } from './locales';
import SETTINGS from '../strings/settings.json';
import COLOR_STRINGS from '../strings/colorControls.json';

export const COLOR_PRESETS: Record<string, string> = {
  pink: '#ff89d8',
  green: '#2ecc71',
  orange: '#f39c12',
  purple: '#9b59b6',
  blue: '#2c97df',
  gray: '#808686',
};
const read = (key: string) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Session controls remain usable. */
  }
};
export function rememberThemeColor() {
  const stored = read('theme-colors');
  const colors = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  colors[store.get('theme').split('-')[0]] = { palette: store.get('palette'), color: store.get('custom-color') };
  write('theme-colors', colors);
}
export function restoreThemeColor(theme: string) {
  const saved = read('theme-colors')?.[theme];
  store.set(
    'palette',
    saved && ['default', 'random', ...Object.keys(COLOR_PRESETS)].includes(saved.palette) ? saved.palette : 'default',
  );
  const color = typeof saved?.color === 'string' && /^#[0-9a-f]{6}$/i.test(saved.color) ? saved.color : '';
  store.set('custom-color', color, false);
  if (color) store.set('color', color);
  else store.removeFromUrl('color');
}

export interface PaletteChoice {
  palette: string;
  color?: string;
}
interface PaletteState {
  palette: string;
  color: string;
  defaultColor: string;
  defaultSelected: boolean;
  disabled?: boolean;
}
interface PaletteOptions {
  showRandom?: boolean;
  randomLabel?: string;
  state: () => PaletteState;
  choose: (choice: PaletteChoice) => void;
  // Existing clock/share input handlers apply live native-picker changes.
  locale?: () => ReturnType<typeof getBaseLocale>;
}
const paletteUpdates = new EventTarget();
let sessionColors: string[] = [];
function customColors(): string[] {
  const saved = read('custom-colors');
  return Array.isArray(saved)
    ? [
        ...new Set(
          saved
            .filter((color): color is string => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color))
            .map((color) => color.toLowerCase()),
        ),
      ]
    : sessionColors;
}
function saveColors(colors: string[]) {
  sessionColors = colors;
  write('custom-colors', colors);
  paletteUpdates.dispatchEvent(new Event('change'));
}
/** One palette for clock settings, its toolbar popup and independent share previews. */
export function mountColorPalette(control: HTMLElement, picker: HTMLInputElement, options: PaletteOptions) {
  control.classList.add('color-palette');
  const swatches = document.createElement('span');
  swatches.className = 'color-swatches';
  control.prepend(swatches);
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'color-add';
  picker.classList.remove('palette-editor-picker');
  picker.classList.add('palette-native-picker');
  picker.tabIndex = -1;
  add.addEventListener('click', () => {
    manage.setAttribute('aria-pressed', 'false');
    refresh();
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else picker.click();
  });
  const saveCustom = () => {
    const color = picker.value.toLowerCase();
    const saved = customColors();
    if (!saved.includes(color)) saveColors([...saved, color]);
  };
  picker.addEventListener('change', saveCustom);
  const random = document.createElement('button');
  random.type = 'button';
  random.hidden = options.showRandom === false;
  random.className = 'palette-random color-swatch color-random';
  random.addEventListener('click', () => {
    options.choose({ palette: 'random' });
  });
  const manage = document.createElement('button');
  manage.type = 'button';
  manage.className = 'color-manage';
  manage.setAttribute('aria-pressed', 'false');
  manage.addEventListener('click', () => {
    manage.setAttribute('aria-pressed', String(manage.getAttribute('aria-pressed') !== 'true'));
    refresh();
  });
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'palette-reset';
  reset.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/></svg>';
  reset.addEventListener('click', () => options.choose({ palette: 'default' }));
  control.append(random, add, manage, reset, picker);
  let signature = '';
  function refresh() {
    const state = options.state();
    const locale = options.locale?.() || getBaseLocale(getInterfaceLocale());
    const labels = SETTINGS[locale];
    reset.hidden = state.defaultSelected;
    reset.title = COLOR_STRINGS[locale].reset_color;
    reset.setAttribute('aria-label', reset.title);
    const saved = customColors();
    const managing = manage.getAttribute('aria-pressed') === 'true';
    const next = JSON.stringify([state, locale, saved, managing]);
    if (signature === next) return;
    signature = next;
    const focusedKey = control.contains(document.activeElement)
      ? (document.activeElement as HTMLElement)?.dataset.paletteKey
      : undefined;
    swatches.replaceChildren();
    add.textContent = '+';
    add.title = labels.settings_color_customize;
    add.setAttribute('aria-label', add.title);
    random.title = options.randomLabel || labels.settings_color_random;
    random.setAttribute('aria-label', random.title);
    random.setAttribute('aria-pressed', String(state.palette === 'random'));
    random.innerHTML =
      state.palette === 'random'
        ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg>'
        : '';
    manage.title = managing ? labels.settings_color_done : labels.settings_color_manage;
    manage.setAttribute('aria-label', manage.title);
    manage.innerHTML = managing
      ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m14 5 5 5"/></svg>';
    manage.hidden = !saved.length;
    const createSwatch = (key: string, color: string, label: string, selected: boolean, action: () => void) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'color-swatch';
      button.dataset.paletteKey = key;
      button.style.setProperty('--swatch-color', color);
      button.style.color = contrastingText(color);
      button.title = label;
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', String(selected));
      button.disabled = !!state.disabled;
      button.textContent = '';
      const mark = document.createElement('span');
      mark.className = 'color-swatch-mark';
      if (selected)
        mark.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg>';
      button.append(mark);
      button.addEventListener('click', action);
      swatches.append(button);
      return button;
    };
    createSwatch('default', state.defaultColor, COLOR_STRINGS[locale].reset_color, state.defaultSelected, () =>
      options.choose({ palette: 'default' }),
    );
    for (const [name, color] of [...Object.entries(COLOR_PRESETS), ...saved.map((color) => [color, color])]) {
      const isCustom = name.startsWith('#');
      const selected = isCustom
        ? state.palette === 'default' && !state.defaultSelected && state.color.toLowerCase() === color
        : state.palette === name;
      const label = managing && isCustom ? `${labels.settings_color_remove} ${color}` : color;
      const button = createSwatch(name, color, label, selected, () => {
        if (managing && isCustom) {
          saveColors(customColors().filter((entry) => entry !== color));
          return;
        }
        options.choose({ palette: isCustom ? 'default' : name, color });
      });
      button.dataset.color = color;
      if (managing && isCustom) {
        button.classList.add('is-removing');
        button.querySelector('.color-swatch-mark')!.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
      }
    }
    if (focusedKey) {
      const replacement = [...swatches.querySelectorAll<HTMLButtonElement>('button')].find(
        (button) => button.dataset.paletteKey === focusedKey,
      );
      (replacement || add).focus({ preventScroll: true });
    }
  }
  paletteUpdates.addEventListener('change', refresh);
  refresh();
  return {
    refresh,
    dispose: () => {
      paletteUpdates.removeEventListener('change', refresh);
      picker.removeEventListener('change', saveCustom);
    },
  };
}

function initToolbarPalette(control: HTMLElement) {
  const panel = document.createElement('div');
  panel.id = 'toolbar-color-palette';
  panel.className = 'color-palette-popover';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Colour');
  panel.append(...control.childNodes);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.id = 'toolbar-color-toggle';
  toggle.className = 'toolbar-color-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-haspopup', 'dialog');
  toggle.setAttribute('aria-controls', panel.id);
  toggle.innerHTML = '<span class="toolbar-color-indicator" aria-hidden="true"></span>';
  const toolbarReset = document.createElement('button');
  toolbarReset.type = 'button';
  toolbarReset.className = 'toolbar-color-reset';
  toolbarReset.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/></svg>';
  toolbarReset.addEventListener('click', () => panel.querySelector<HTMLButtonElement>('[id$="reset-color"]')?.click());
  control.append(toggle, toolbarReset, panel);
  const close = (focus = false) => {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    if (focus) toggle.focus();
  };
  const position = () => {
    if (panel.hidden) return;
    const anchor = toggle.getBoundingClientRect();
    const width = panel.getBoundingClientRect().width;
    panel.style.left = `${Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8))}px`;
    const height = panel.getBoundingClientRect().height;
    panel.style.top = `${Math.max(8, anchor.top >= height + 8 ? anchor.top - height - 8 : Math.min(anchor.bottom + 8, window.innerHeight - height - 8))}px`;
  };
  panel.addEventListener('toggle', () => requestAnimationFrame(position), true);
  toggle.addEventListener('click', () => {
    if (!panel.hidden) {
      close();
      return;
    }
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    position();
    (
      panel.querySelector<HTMLButtonElement>('.color-swatch[aria-pressed="true"]') ||
      panel.querySelector<HTMLButtonElement>('.color-swatch')
    )?.focus();
  });
  document.addEventListener('click', (event) => {
    if (!event.composedPath().includes(control)) close();
  });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
  });
  panel.addEventListener('focusout', (event) => {
    if (event.relatedTarget instanceof Node && !control.contains(event.relatedTarget)) close();
  });
  window.addEventListener('resize', () => close());
  const update = () => {
    const label = SETTINGS[getBaseLocale(getInterfaceLocale())].settings_color;
    toolbarReset.title = COLOR_STRINGS[getBaseLocale(getInterfaceLocale())].reset_color;
    toolbarReset.setAttribute('aria-label', toolbarReset.title);
    toggle.title = label;
    toggle.setAttribute('aria-label', label);
    panel.setAttribute('aria-label', label);
    const random = store.get('palette') === 'random';
    toolbarReset.hidden = store.get('palette') === 'default' && !store.get('custom-color');
    toggle.title = random ? SETTINGS[getBaseLocale(getInterfaceLocale())].settings_color_random : label;
    toggle.setAttribute('aria-label', toggle.title);
    const indicator = toggle.querySelector<HTMLElement>('.toolbar-color-indicator')!;
    indicator.classList.toggle('is-random', random);
    indicator.style.background = random ? '' : store.get('color');
    indicator.style.color = random ? '#fff' : contrastingText(store.get('color'));
  };
  store.subscribe(update);
  update();
  return panel;
}

export function initColorPalette() {
  sessionColors = [];
  for (const control of document.querySelectorAll<HTMLElement>('#color-controls, #settings-color-controls')) {
    const picker = control.querySelector<HTMLInputElement>('input[type=color]');
    if (!picker) continue;
    const host = control.id === 'color-controls' ? initToolbarPalette(control) : control;
    const palette = mountColorPalette(host, picker, {
      state: () => ({
        palette: store.get('palette'),
        color: store.get('color'),
        defaultColor: defaultColor(store.get('theme').split('-')[0]),
        defaultSelected: store.get('palette') === 'default' && !store.get('custom-color'),
      }),
      choose: (choice) => {
        if (choice.palette === 'default' && !choice.color)
          control.querySelector<HTMLButtonElement>('[id$="reset-color"]')?.click();
        else {
          if (choice.color) {
            picker.value = choice.color;
            picker.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (choice.palette !== 'default') {
            delete document.documentElement.dataset.palette;
            delete document.documentElement.dataset.accentPalette;
            store.set('palette', choice.palette);
            setTheme({ isVariantChange: true });
          }
          rememberThemeColor();
        }
        palette.refresh();
      },
    });
    store.subscribe(() => queueMicrotask(palette.refresh));
  }
}
