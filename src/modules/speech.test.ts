import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createStore, store } from '../store';
import { initSpeech } from './speech';
import type { ResolvedQuote } from '../types';

let cleanup: (() => void) | undefined;
const speak = vi.fn();
const cancel = vi.fn();
const highlights = new Map<string, Range[]>();
const highlightedText = () =>
  highlights
    .get('speech-word')
    ?.map((range) => range.toString())
    .join('');
class Utterance {
  lang = '';
  voice = null;
  onstart?: () => void;
  onend?: () => void;
  onerror?: (event: { error: string }) => void;
  onboundary?: (event: { name: string; charIndex: number; charLength: number }) => void;
  constructor(public text: string) {}
}
const quote = {
  id: '1200-001',
  time: '12:00',
  locale: 'es-ES',
  title: 'El libro',
  author: 'La autora',
} as ResolvedQuote;
beforeEach(() => {
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.body.innerHTML =
    '<div id="reading-controls"></div><section id="settings-behavior"></section><blockquote id="quote"><p>Son <em>las doce</em>.<br>Hola.</p><cite><span id="title">El libro</span>, <span id="author">La autora</span></cite></blockquote>';
  vi.stubGlobal('speechSynthesis', { speak, cancel, getVoices: () => [] });
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  createStore();
  store.set('active-quote', quote);
  highlights.clear();
  vi.stubGlobal('CSS', { highlights });
  vi.stubGlobal(
    'Highlight',
    class extends Array<Range> {
      constructor(...ranges: Range[]) {
        super(...ranges);
      }
    },
  );
  vi.clearAllMocks();
  speak.mockImplementation((utterance: Utterance) => utterance.onstart?.());
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const click = (id: string) => document.getElementById(id)!.click();
const minute = (minuteTick = true) =>
  document.dispatchEvent(new CustomEvent('quote-rendered', { detail: { minuteTick } }));

it('highlights successive words across emphasis and line breaks, then restores the markup', () => {
  cleanup = initSpeech();
  const paragraph = document.querySelector('#quote > p')!;
  const original = paragraph.innerHTML;
  click('read-quote');
  const current = speak.mock.calls[0][0] as Utterance;
  current.onboundary!({ name: 'word', charIndex: 4, charLength: 3 });
  expect(highlightedText()).toBe('las');
  expect(paragraph.innerHTML).toBe(original);
  current.onboundary!({ name: 'word', charIndex: 14, charLength: 0 });
  expect(highlights.get('speech-word')).toHaveLength(1);
  expect(highlightedText()).toBe('Hola.');
  expect(paragraph.innerHTML).toBe(original);
  expect(current.text).toBe('Son las doce. Hola.');
  current.onend!();
  expect(paragraph.innerHTML).toBe(original);
});

it('maps title and author boundaries and removes highlights on stop', () => {
  cleanup = initSpeech();
  click('read-attribution');
  click('read-quote');
  const current = speak.mock.calls[0][0] as Utterance;
  current.onboundary!({ name: 'word', charIndex: current.text.indexOf('libro'), charLength: 5 });
  expect(highlightedText()).toBe('libro');
  current.onboundary!({ name: 'word', charIndex: current.text.indexOf('autora'), charLength: 6 });
  expect(highlightedText()).toBe('autora');
  click('read-quote');
  expect(highlights.has('speech-word')).toBe(false);
});

it('clears highlights at a manual clock tick and ignores further boundaries from that quote', () => {
  cleanup = initSpeech();
  click('read-quote');
  const current = speak.mock.calls[0][0] as Utterance;
  current.onboundary!({ name: 'word', charIndex: 0, charLength: 3 });
  document.dispatchEvent(new CustomEvent('quote-changing', { detail: { minuteTick: true } }));
  document.querySelector('#quote > p')!.textContent = 'Another quote';
  current.onboundary!({ name: 'word', charIndex: 4, charLength: 3 });
  expect(highlights.has('speech-word')).toBe(false);
});

it('handles trimmed whitespace and precise boundaries in text without spaces', () => {
  document.querySelector('#quote > p')!.innerHTML = '  你好<em>世界</em>  ';
  cleanup = initSpeech();
  click('read-quote');
  const current = speak.mock.calls[0][0] as Utterance;
  expect(current.text).toBe('你好世界');
  current.onboundary!({ name: 'word', charIndex: 1, charLength: 2 });
  expect(highlightedText()).toBe('好世');
  current.onerror!({ error: 'interrupted' });
  expect(highlights.has('speech-word')).toBe(false);
  expect(document.querySelector('#quote > p')!.innerHTML).toBe('  你好<em>世界</em>  ');
});

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
  document.dispatchEvent(new CustomEvent('quote-changing', { detail: { minuteTick: false } }));
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

it('respects the hidden title in manual and automatic attribution reading', () => {
  cleanup = initSpeech();
  expect(store.get('read-attribution')).toBe(false);
  store.set('hide-book-title', true);
  click('read-attribution');
  expect(document.getElementById('read-attribution')!.getAttribute('aria-checked')).toBe('true');
  expect(JSON.parse(localStorage.getItem('settings')!)['read-attribution']).toBe(true);
  expect(location.search).not.toContain('read-attribution');
  click('read-quote');
  expect(speak.mock.calls[speak.mock.calls.length - 1][0].text).toBe('Son las doce. Hola.\nLa autora.');
  click('auto-read');
  speak.mockClear();
  minute();
  expect(speak.mock.calls[0][0].text).toBe('Son las doce. Hola.\nLa autora.');
  click('read-attribution');
  minute();
  expect(speak.mock.calls[speak.mock.calls.length - 1][0].text).toBe('Son las doce. Hola.');
});
it('omits missing attribution fields without speaking undefined', () => {
  cleanup = initSpeech();
  document.querySelector('#quote > cite')!.replaceChildren();
  store.set('active-quote', { ...quote, title: '', author: '' });
  click('read-attribution');
  click('read-quote');
  expect(speak.mock.calls[0][0].text).toBe('Son las doce. Hola.');
});

it('reads both visible attribution fields when enabled', () => {
  cleanup = initSpeech();
  click('read-attribution');
  click('read-quote');
  expect(speak.mock.calls[0][0].text).toBe('Son las doce. Hola.\nEl libro, La autora.');
});
it.each(['display: none', 'visibility: hidden', 'opacity: 0'])('omits a title hidden by CSS: %s', (rule) => {
  document.getElementById('title')!.setAttribute('style', rule);
  cleanup = initSpeech();
  click('read-attribution');
  click('read-quote');
  expect(speak.mock.calls[0][0].text).toBe('Son las doce. Hola.\nLa autora.');
});
it('omits all attribution when its parent is hidden by a theme rule', () => {
  const style = document.createElement('style');
  style.textContent = '[data-theme="hidden-citation"] #quote > cite { display: none; }';
  document.body.append(style);
  document.documentElement.dataset.theme = 'hidden-citation';
  cleanup = initSpeech();
  click('read-attribution');
  click('auto-read');
  minute();
  expect(speak.mock.calls[speak.mock.calls.length - 1][0].text).toBe('Son las doce. Hola.');
  delete document.documentElement.dataset.theme;
});
it('omits a hidden author while keeping the visible title', () => {
  document.getElementById('author')!.hidden = true;
  cleanup = initSpeech();
  click('read-attribution');
  click('read-quote');
  expect(speak.mock.calls[0][0].text).toBe('Son las doce. Hola.\nEl libro.');
});
it('stops ongoing narration when attribution visibility changes', () => {
  cleanup = initSpeech();
  click('read-attribution');
  click('read-quote');
  cancel.mockClear();
  store.set('hide-book-title', true);
  expect(cancel).toHaveBeenCalledOnce();
  expect(document.getElementById('read-quote')!.getAttribute('aria-pressed')).toBe('false');
});

it('stops manual speech and resets the button at a clock tick without a completion callback', () => {
  cleanup = initSpeech();
  click('read-quote');
  cancel.mockClear();
  document.dispatchEvent(new CustomEvent('quote-changing', { detail: { minuteTick: true } }));
  store.set('active-quote', { ...quote, time: '12:01' });
  minute();
  expect(cancel).toHaveBeenCalledOnce();
  expect(speak).toHaveBeenCalledOnce();
  expect(document.getElementById('read-quote')!.getAttribute('aria-pressed')).toBe('false');
  document.dispatchEvent(new CustomEvent('quote-changing', { detail: { minuteTick: false } }));
  expect(cancel).toHaveBeenCalledOnce();
});
it('offers explicit activation for a saved automatic preference', () => {
  store.set('auto-read', true);
  cleanup = initSpeech();
  expect(document.getElementById('activate-speech')!.hidden).toBe(false);
  click('activate-speech');
  expect(speak).toHaveBeenCalledOnce();
  expect(document.getElementById('activate-speech')!.hidden).toBe(true);
  minute();
  expect(speak).toHaveBeenCalledTimes(2);
});
it('reports a blocked browser and recovers with an explicit activation', () => {
  store.set('auto-read', true);
  cleanup = initSpeech();
  click('activate-speech');
  const current = speak.mock.calls[0][0] as Utterance;
  current.onerror!({ error: 'not-allowed' });
  expect(document.getElementById('speech-help')!.textContent).toContain('blocked');
  expect(document.getElementById('activate-speech')!.hidden).toBe(false);
  speak.mockClear();
  minute();
  expect(speak).not.toHaveBeenCalled();
  click('activate-speech');
  expect(speak).toHaveBeenCalledOnce();
  expect(document.getElementById('activate-speech')!.hidden).toBe(true);
});
it('detects a speech engine that never confirms playback started', () => {
  vi.useFakeTimers();
  store.set('auto-read', true);
  cleanup = initSpeech();
  speak.mockImplementationOnce(() => {});
  click('activate-speech');
  vi.advanceTimersByTime(8000);
  expect(document.getElementById('speech-help')!.textContent).toContain('did not start');
  expect(document.getElementById('read-quote')!.getAttribute('aria-pressed')).toBe('false');
  expect(document.getElementById('activate-speech')!.hidden).toBe(false);
});
it('does not cancel the native engine at natural completion or when already idle', () => {
  cleanup = initSpeech();
  expect(cancel).not.toHaveBeenCalled();
  click('read-quote');
  expect(cancel).not.toHaveBeenCalled();
  const current = speak.mock.calls[0][0] as Utterance;
  current.onend!();
  store.set('theme', 'poster-light');
  expect(cancel).not.toHaveBeenCalled();
});

it('keeps the DOM unchanged when the browser cannot paint custom highlights', () => {
  vi.stubGlobal('Highlight', undefined);
  const paragraph = document.querySelector('#quote > p')!;
  const original = paragraph.innerHTML;
  cleanup = initSpeech();
  click('read-quote');
  const current = speak.mock.calls[0][0] as Utterance;
  current.onboundary!({ name: 'word', charIndex: 4, charLength: 3 });
  expect(paragraph.innerHTML).toBe(original);
  expect(highlights.has('speech-word')).toBe(false);
  expect(document.getElementById('read-quote')!.getAttribute('aria-pressed')).toBe('true');
});
