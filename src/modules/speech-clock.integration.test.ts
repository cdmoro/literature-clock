import { afterEach, expect, it, vi } from 'vitest';
import { createStore, store } from '../store';
import { initSpeech } from './speech';
import { initClock } from './clock';

vi.mock('../utils', () => ({
  getLiveTime: () => new Date().toTimeString().slice(0, 5),
  getTime: () => new Date().toTimeString().slice(0, 5),
  updateFavicon: vi.fn(),
  updateGHLinks: vi.fn(),
  fitQuote: vi.fn(),
  doFitQuote: vi.fn(),
}));
vi.mock('./horizon', () => ({ setDayParameters: vi.fn() }));
vi.mock('./themes', () => ({
  removeBackgroundImage: vi.fn(),
  setDynamicBackgroundPicture: vi.fn(),
  setTheme: vi.fn(),
}));
vi.mock('./font', () => ({ refreshDefaultFontLabel: vi.fn() }));
vi.mock('./locale-fonts', () => ({ applyLocaleThemeFont: vi.fn() }));
vi.mock('./bilingual', () => ({ renderTranslation: vi.fn() }));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
});
it('reads the newly fetched and rendered quote on successive real clock minute changes', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 3, 12, 0, 59));
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.body.innerHTML =
    '<div id="reading-controls"></div><section id="settings-behavior"></section><blockquote id="quote"></blockquote><div id="time-clock"><span></span></div>';
  const speak = vi.fn((utterance) => utterance.onstart?.());
  const cancel = vi.fn();
  vi.stubGlobal('speechSynthesis', { speak, cancel, getVoices: () => [] });
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      lang = '';
      voice = null;
      constructor(public text: string) {}
    },
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const time = /\/(\d{2}_\d{2})\.json/.exec(url)![1].replace('_', ':');
      return {
        ok: true,
        json: async () => [
          {
            id: time.replace(':', '') + '-001',
            quote_first: 'It is ',
            quote_time_case: time,
            quote_last: '.',
            title: 'A book',
            author: 'An author',
          },
        ],
      };
    }),
  );
  createStore();
  store.set('locale', 'en-GB');
  store.set('transition', 'none');
  store.set('progressbar', 'none');
  const cleanup = initSpeech();
  try {
    initClock();
    await vi.advanceTimersByTimeAsync(0);
    document.getElementById('auto-read')!.click();
    expect(speak.mock.calls[0][0].text).toBe('It is 12:00.');
    await vi.advanceTimersByTimeAsync(1000);
    expect(store.get('active-quote')!.time).toBe('12:01');
    expect(speak.mock.calls[1][0].text).toBe('It is 12:01.');
    await vi.advanceTimersByTimeAsync(60000);
    expect(speak.mock.calls[2][0].text).toBe('It is 12:02.');
    expect(speak).toHaveBeenCalledTimes(3);
    expect(cancel).toHaveBeenCalledTimes(2);
  } finally {
    cleanup?.();
    vi.clearAllTimers();
  }
});
