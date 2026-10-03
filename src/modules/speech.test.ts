import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createStore, store } from '../store';
import { initSpeech } from './speech';
import type { ResolvedQuote } from '../types';

let cleanup: (() => void) | undefined;
const speak = vi.fn();
const cancel = vi.fn();
class Utterance {
  lang = '';
  voice = null;
  onend?: () => void;
  onerror?: (event: { error: string }) => void;
  constructor(public text: string) {}
}
const quote = { id: '1200-001', time: '12:00', locale: 'es-ES' } as ResolvedQuote;
beforeEach(() => {
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.body.innerHTML =
    '<div id="reading-controls"></div><section id="settings-behavior"></section><blockquote id="quote"><p>Son <em>las doce</em>.<br>Hola.</p><cite>Autor</cite></blockquote>';
  vi.stubGlobal('speechSynthesis', { speak, cancel, getVoices: () => [] });
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  createStore();
  store.set('active-quote', quote);
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.unstubAllGlobals();
});
const click = (id: string) => document.getElementById(id)!.click();
const minute = (minuteTick = true) =>
  document.dispatchEvent(new CustomEvent('quote-rendered', { detail: { minuteTick } }));

it('reads the displayed text in the quote language, then stops with the same button', () => {
  cleanup = initSpeech();
  click('read-quote');
  const utterance = speak.mock.calls[0][0] as Utterance;
  expect(utterance.text).toBe('Son las doce. Hola.');
  expect(utterance.lang).toBe('es-ES');
  expect(document.getElementById('read-quote')!.getAttribute('aria-pressed')).toBe('true');
  cancel.mockClear();
  click('read-quote');
  expect(cancel).toHaveBeenCalledOnce();
  expect(document.getElementById('read-quote')!.getAttribute('aria-pressed')).toBe('false');
});
it('reads automatically only for clock minutes after activation, and respects pause', () => {
  cleanup = initSpeech();
  click('auto-read');
  expect(store.get('auto-read')).toBe(true);
  speak.mockClear();
  minute(false);
  expect(speak).not.toHaveBeenCalled();
  minute();
  expect(speak).toHaveBeenCalledOnce();
  store.set('paused', true, false);
  minute();
  expect(speak).toHaveBeenCalledOnce();
  click('auto-read');
  expect(store.get('auto-read')).toBe(false);
});
it('does not autoplay a saved preference before interaction', () => {
  store.set('auto-read', true);
  cleanup = initSpeech();
  minute();
  expect(speak).not.toHaveBeenCalled();
  expect(JSON.parse(localStorage.getItem('settings')!)['auto-read']).toBe(true);
  expect(location.search).not.toContain('auto-read');
  click('read-quote');
  speak.mockClear();
  minute();
  expect(speak).toHaveBeenCalledOnce();
});
it('cancels an old quote and ignores its delayed completion callback', () => {
  cleanup = initSpeech();
  click('read-quote');
  const old = speak.mock.calls[0][0] as Utterance;
  store.set('active-quote', { ...quote, id: '1201-001' });
  expect(document.getElementById('read-quote')!.getAttribute('aria-pressed')).toBe('false');
  click('read-quote');
  old.onend!();
  expect(document.getElementById('read-quote')!.getAttribute('aria-pressed')).toBe('true');
});
it('stops when hidden and does not read in the background', () => {
  cleanup = initSpeech();
  click('auto-read');
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  document.dispatchEvent(new Event('visibilitychange'));
  expect(document.getElementById('read-quote')!.getAttribute('aria-pressed')).toBe('false');
  speak.mockClear();
  minute();
  expect(speak).not.toHaveBeenCalled();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});
it('disables controls gracefully when speech is unsupported', () => {
  vi.stubGlobal('speechSynthesis', undefined);
  cleanup = initSpeech();
  expect((document.getElementById('read-quote') as HTMLButtonElement).disabled).toBe(true);
  expect((document.getElementById('auto-read') as HTMLButtonElement).disabled).toBe(true);
});
