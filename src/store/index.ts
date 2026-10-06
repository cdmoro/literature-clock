import { BackgroundPattern, isBackgroundPattern } from '../utils/background-patterns';
import { resolveTransition, TransitionMode } from '../utils/transition-settings';
import { resolveLocale } from '../modules/locales';
import { Locale, ResolvedQuote } from '../types';

export type ProgressbarMode = 'theme' | 'bottom' | 'top' | 'background' | 'none';

interface Stateful {
  locale: Locale;
  'ui-locale'?: Locale;
  'quote-locales'?: string;
  bilingual?: boolean;
  'translation-locale'?: Locale | '';
  zen: boolean;
  work: boolean;
  screensaver: boolean;
  transition: TransitionMode;
  'show-time': boolean;
  'hide-book-title': boolean;
  'auto-read': boolean;
  'read-attribution': boolean;
  font: string;
  theme: string;
  color: string;
  palette: string;
  'custom-color': string;
  'background-pattern': BackgroundPattern;
  progressbar: ProgressbarMode;
  'random-locale': boolean;
}

export interface Stateless {
  fade?: boolean; // Legacy shared links and saved settings.
  'custom-font'?: string;
  time?: string;
  'quote-id'?: string;
  paused?: boolean;
  quote?: string;
  scene?: string;
  progress?: string;
  index?: string;
  static?: boolean;
  'active-quote'?: ResolvedQuote;
}

type State = Stateful & Stateless;

type Listener = (newState: State, oldState: State) => void;

const IGNORE_FROM_URL: (keyof State)[] = [
  'custom-color',
  'custom-font',
  'active-quote',
  'paused',
  'auto-read',
  'read-attribution',
];
const REMOVE_VALUES_FROM_URL: Partial<State> = {
  transition: 'fade',
  progressbar: 'theme',
  font: 'default',
  theme: 'base-system',
  color: '#d24335',
  'background-pattern': 'none',
  palette: 'default',
};

const BOOLEAN_KEYS = new Set([
  'bilingual',
  'zen',
  'work',
  'screensaver',
  'show-time',
  'hide-book-title',
  'auto-read',
  'read-attribution',
  'random-locale',
  'static',
  'fade',
]);
const THEMES =
  /^(base|pink|green|orange|purple|blue|gray|color|retro|elegant|festive|bohemian|book|handwriting|anaglyph|whatsapp|terminal|frame|subtle|poster|horizon|dynamic|photo|kindle)(-(system|light|dark))?$/;
const TEMPORARY_KEYS = new Set(['time', 'quote', 'quote-id', 'scene', 'progress', 'index', 'static']);

export function validateSettings(input: unknown, fromUrl: boolean): Partial<State> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const result: Record<string, string | boolean> = {};
  for (const [key, raw] of Object.entries(input)) {
    if (!fromUrl && TEMPORARY_KEYS.has(key)) continue;
    if (key === 'progressbar') {
      if (raw === true || (fromUrl && raw === 'true')) result[key] = 'theme';
      else if (raw === false || (fromUrl && raw === 'false')) result[key] = 'none';
      else if (typeof raw === 'string' && ['theme', 'bottom', 'top', 'background', 'none'].includes(raw))
        result[key] = raw;
      continue;
    }
    if (BOOLEAN_KEYS.has(key)) {
      const value = fromUrl ? (raw === 'true' ? true : raw === 'false' ? false : undefined) : raw;
      if (typeof value === 'boolean') result[key] = value;
      continue;
    }
    if (typeof raw !== 'string') continue;
    switch (key) {
      case 'translation-locale':
        result[key] = raw === '' ? '' : resolveLocale(raw);
        break;
      case 'ui-locale':
      case 'locale':
        result[key] = resolveLocale(raw);
        break;
      case 'quote-locales':
        if (raw === '' || raw.split(',').every((locale) => /^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale)))
          result[key] = raw;
        break;
      case 'quote-id':
        if (/^([01]\d|2[0-3])[0-5]\d-\d+$/.test(raw)) result[key] = raw;
        break;
      case 'theme':
        if (THEMES.test(raw)) result[key] = raw;
        break;
      case 'palette':
        if (['default', 'red', 'pink', 'green', 'orange', 'purple', 'blue', 'gray', 'random'].includes(raw))
          result[key] = raw;
        break;
      case 'transition':
        if (['none', 'fade', 'slide', 'blur', 'zoom'].includes(raw)) result[key] = raw;
        break;
      case 'background-pattern':
        if (isBackgroundPattern(raw)) result[key] = raw;
        break;
      case 'custom-color':
      case 'color':
        if (/^#[0-9a-f]{6}$/i.test(raw) || (key === 'custom-color' && raw === '')) result[key] = raw;
        break;
      case 'font':
        if (/^[\p{L}\p{N} _-]{1,100}$/u.test(raw)) result[key] = raw;
        break;
      case 'time':
        if (/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) result[key] = raw;
        break;
      case 'index':
        if (/^\d+$/.test(raw) && Number.isSafeInteger(Number(raw))) result[key] = raw;
        break;
      case 'progress':
        if (/^\d+(\.\d+)?$/.test(raw) && Number(raw) <= 100) result[key] = raw;
        break;
      case 'scene':
        if (['morning', 'afternoon', 'evening', 'night'].includes(raw)) result[key] = raw;
        break;
      case 'quote':
        result[key] = raw;
        break;
    }
  }
  if (typeof result.theme === 'string') {
    const [theme, variant = 'system'] = result.theme.split('-');
    if (['pink', 'green', 'orange', 'purple', 'blue', 'gray', 'color'].includes(theme)) {
      result.theme = `base-${variant}`;
      result.palette = theme === 'color' ? 'random' : theme;
      const colors: Record<string, string> = {
        pink: '#ff89d8',
        green: '#2ecc71',
        orange: '#f39c12',
        purple: '#9b59b6',
        blue: '#2c97df',
        gray: '#808686',
        color: '#d24335',
      };
      result.color = colors[theme];
      delete result['custom-color'];
    }
  }
  return result as Partial<State>;
}

export function parseUrlParams(urlParams: URLSearchParams): Partial<State> {
  const stateFromUrl = validateSettings(Object.fromEntries(urlParams), true);
  const id = stateFromUrl['quote-id'];
  if (!stateFromUrl.time && id) stateFromUrl.time = `${id.slice(0, 2)}:${id.slice(2, 4)}`;
  return stateFromUrl;
}

export function getStateFromLocalStorage(): Partial<State> {
  try {
    const storedSettings = localStorage.getItem('settings');
    return storedSettings ? validateSettings(JSON.parse(storedSettings), false) : {};
  } catch {
    return {};
  }
}

export function updateBooleanSettingStatus(key: string, value: boolean) {
  document.body.classList.toggle(key, value);
  document.getElementById(key)?.classList.toggle('active', value);
}

export class Store {
  private state: State;
  private listeners: Listener[] = [];
  private knownKeys: (keyof Stateful)[];

  constructor(defaultState: State) {
    // Get known keys (state keys)
    this.knownKeys = Object.keys(defaultState) as (keyof Stateful)[];

    // Read settings from URL
    const urlParams = new URLSearchParams(window.location.search);
    const stateFromUrl = parseUrlParams(urlParams);

    // Read settings from localStorage
    const stateFromLocalStorage = getStateFromLocalStorage();

    // Merge: URL > localStorage > defaultState
    this.state = { ...defaultState, ...stateFromLocalStorage, ...stateFromUrl };

    if (['true', 'false'].includes(urlParams.get('progressbar') || '')) {
      this.syncToUrl('progressbar', this.state.progressbar);
    }

    const saved = stateFromLocalStorage;
    this.state.transition =
      stateFromUrl.transition !== undefined || stateFromUrl.fade !== undefined
        ? resolveTransition(stateFromUrl.transition, stateFromUrl.fade)
        : resolveTransition(saved.transition, saved.fade);
    delete this.state.fade;
    if (urlParams.has('fade')) {
      this.syncToUrl('fade', false);
      this.syncToUrl('transition', this.state.transition);
    }

    // Migrate saved settings and shared links to the renamed skin.
    const previousTheme = this.state.theme;
    this.state.theme = previousTheme.replace(/^dynamic(?=-|$)/, 'horizon');
    if (urlParams.has('theme') && previousTheme !== this.state.theme) {
      this.syncToUrl('theme', this.state.theme);
    }

    if (urlParams.has('theme') && /^(pink|green|orange|purple|blue|gray|color)(-|$)/.test(urlParams.get('theme')!)) {
      this.syncToUrl('theme', this.state.theme);
      this.syncToUrl('palette', this.state.palette);
      this.removeFromUrl('color');
    }
    this.state.locale = resolveLocale(this.state.locale);
    if (this.state['ui-locale']) this.state['ui-locale'] = resolveLocale(this.state['ui-locale']);
    if (urlParams.has('locale') && urlParams.get('locale') !== this.state.locale) {
      this.syncToUrl('locale', this.state.locale);
    }

    Object.entries(this.state).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        updateBooleanSettingStatus(key, value);
      }
    });

    // Sync the final merged state to localStorage (without touching the URL yet)
    this.syncToLocalStorage();
  }

  // Get current state
  get<K extends keyof State>(key: K) {
    return this.state[key];
  }

  // Update a state property and synchronize to localStorage and URL (for this key)
  set<K extends keyof State>(key: K, value: State[K], syncToUrl: boolean = true) {
    const oldState = { ...this.state };
    this.state[key] = value;

    this.syncToLocalStorage();
    if (syncToUrl) {
      this.syncToUrl(key, value);
    }

    this.notifyListeners(oldState);

    if (typeof value === 'boolean') {
      updateBooleanSettingStatus(key, value);
    }

    return value;
  }

  removeFromUrl(key: keyof State) {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete(key);
    const url = urlParams.size ? `?${urlParams.toString()}` : '/';
    history.replaceState({}, '', url);
  }

  toggle(key: keyof State) {
    if (typeof this.state[key] === 'boolean') {
      const newValue = !this.get(key);
      this.set(key, newValue);

      return newValue;
    } else {
      throw new Error(`${key} is not boolean`);
    }
  }

  // Subscribe to state changes
  subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify listeners of state changes
  private notifyListeners(oldState: State) {
    this.listeners.forEach((listener) => listener({ ...this.state }, oldState));
  }

  private getStatefulSettings() {
    const statefulSettings = {} as Stateful;

    // @ts-expect-error TODO: Investigate TS error
    this.knownKeys.forEach((key) => (statefulSettings[key] = this.state[key]));

    return statefulSettings;
  }

  // Sync entire state to localStorage
  private syncToLocalStorage() {
    try {
      localStorage.setItem('settings', JSON.stringify(this.getStatefulSettings()));
    } catch {
      // Settings still work in memory when browser storage is unavailable.
    }
  }

  // Sync only one property to the URL using history API
  private syncToUrl<K extends keyof State>(key: K, value: State[K]) {
    if (IGNORE_FROM_URL.includes(key)) {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);

    if (REMOVE_VALUES_FROM_URL[key] === value || value === false) {
      urlParams.delete(key);
    } else if (value || (key === 'quote-locales' && value === '')) {
      urlParams.set(key, value.toString());
    }

    const url = urlParams.size ? `?${urlParams.toString()}` : '/';
    history.replaceState({}, '', url);
  }
}

// Create and export store instance
export let store: Store;

// Create the store and pass default state to constructor
export function createStore() {
  store = new Store({
    locale: resolveLocale(),
    'ui-locale': undefined,
    'quote-locales': undefined,
    bilingual: false,
    'translation-locale': '',
    screensaver: false,
    work: false,
    zen: false,
    transition: 'fade',
    'show-time': true,
    'hide-book-title': false,
    'auto-read': false,
    'read-attribution': false,
    font: 'default',
    theme: 'base-system',
    color: '#d24335',
    palette: 'default',
    'custom-color': '',
    'background-pattern': 'none',
    progressbar: 'theme',
    'random-locale': false,
  });
}
