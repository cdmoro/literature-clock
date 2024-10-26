interface Stateful {
  locale: string;
  zen: boolean;
  work: boolean;
  screensaver: boolean;
  fade: boolean;
  showtime: boolean;
  font: string;
  theme: string;
}

export interface Stateless {
  'custom-font'?: string;
  'last-locale'?: string;
  time?: string;
  quote?: string;
  scene?: string;
  progress?: string;
  index?: string;
}

type State = Stateful & Stateless;

type Listener = (newState: State, oldState: State) => void;

const REMOVE_FROM_URL: (keyof State)[] = ['custom-font', 'last-locale'];
const REMOVE_VALUES_FROM_URL: Partial<State> = {
  screensaver: false,
  fade: false,
  font: 'default',
  showtime: false,
  work: false,
  zen: false,
};

export function parseUrlParams(urlParams: URLSearchParams): Partial<State> {
  const stateFromUrl: Partial<State> = {};

  urlParams.forEach((value, key) => {
    if (value !== null) {
      // @ts-expect-error TODO
      stateFromUrl[key] = value === 'true' ? true : value === 'false' ? false : value;
    }
  });

  return stateFromUrl;
}

export function getStateFromLocalStorage(): Partial<State> {
  const storedSettings = localStorage.getItem('settings');
  return storedSettings ? JSON.parse(storedSettings) : {};
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

    Object.entries(this.state).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        updateBooleanSettingStatus(key, value);
      }
    });

    // Sync the final merged state to localStorage (without touching the URL yet)
    this.syncToLocalStorage();
  }

  // Get current state
  getState<K extends keyof State>(key: K) {
    return this.state[key];
  }

  // Update a state property and synchronize to localStorage and URL (for this key)
  setState<K extends keyof State>(key: K, value: State[K]) {
    const oldState = { ...this.state };
    this.state[key] = value;

    this.syncToLocalStorage();
    this.syncToUrl(key, value); // Sync only this key to the URL

    this.notifyListeners(oldState);

    if (typeof value === 'boolean') {
      updateBooleanSettingStatus(key, value);
    }

    return value;
  }

  toggleState(key: keyof State) {
    if (typeof this.state[key] === 'boolean') {
      const newValue = !this.getState(key);
      this.setState(key, newValue);

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

    // @ts-expect-error TODO
    this.knownKeys.forEach((key) => (statefulSettings[key] = this.state[key]));

    return statefulSettings;
  }

  // Sync entire state to localStorage
  private syncToLocalStorage() {
    localStorage.setItem('settings', JSON.stringify(this.getStatefulSettings()));
  }

  // Sync only one property to the URL using history API
  private syncToUrl<K extends keyof State>(key: K, value: State[K]) {
    if (REMOVE_FROM_URL.includes(key)) {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);

    if (REMOVE_VALUES_FROM_URL[key] === value) {
      urlParams.delete(key);
    } else if (value) {
      urlParams.set(key, value.toString());
    }

    const url = urlParams.size ? `?${urlParams.toString()}` : '/';
    history.replaceState({}, '', url);
  }
}

// Create and export store instance
export let store: Store;

// Create the store and pass default state to constructor
export function createStore(defaultState: State) {
  store = new Store(defaultState);
}
