import { store } from '../store';
import { getBaseLocale, getInterfaceLocale } from './locales';
import { readingIcon } from './reading-icons';
import { showQuoteNotice } from './reading-ui';
import STRINGS from '../strings/speech.json';
import { createSpeechHighlight, speechText } from './speech-highlight';

// Include only attribution that is actually shown, including ancestor CSS rules.
function visibleAttribution(id: 'title' | 'author') {
  const element = document.querySelector<HTMLElement>(`#quote > cite #${id}`);
  if (!element || (id === 'title' && store.get('hide-book-title'))) return '';
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (
      node.hidden ||
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.visibility === 'collapse' ||
      style.opacity === '0' ||
      style.getPropertyValue('content-visibility') === 'hidden'
    )
      return '';
  }
  return element.textContent?.trim() || '';
}

export function initSpeech() {
  const group = document.getElementById('reading-controls');
  if (!group || store.get('static')) return;
  const supported = !!window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function';
  const synth = window.speechSynthesis;
  const button = document.createElement('button');
  button.id = 'read-quote';
  button.type = 'button';
  const row = document.createElement('div');
  row.className = 'settings-row';
  const caption = document.createElement('label');
  caption.htmlFor = 'auto-read';
  caption.id = 'auto-read-caption';
  const toggle = document.createElement('button');
  toggle.id = 'auto-read';
  toggle.type = 'button';
  toggle.className = 'settings-switch';
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('aria-labelledby', caption.id);
  const help = document.createElement('p');
  help.id = 'speech-help';
  help.className = 'settings-help';
  toggle.setAttribute('aria-describedby', help.id);
  row.append(caption, toggle);
  document.getElementById('settings-behavior')?.append(row, help);
  group.append(button);
  const attributionRow = document.createElement('div');
  attributionRow.className = 'settings-row';
  const attributionCaption = document.createElement('label');
  attributionCaption.htmlFor = 'read-attribution';
  attributionCaption.id = 'read-attribution-caption';
  const attributionToggle = document.createElement('button');
  attributionToggle.id = 'read-attribution';
  attributionToggle.type = 'button';
  attributionToggle.className = 'settings-switch';
  attributionToggle.setAttribute('role', 'switch');
  attributionToggle.setAttribute('aria-labelledby', attributionCaption.id);
  attributionToggle.addEventListener('click', () => store.toggle('read-attribution'));
  attributionRow.append(attributionCaption, attributionToggle);
  row.after(attributionRow);

  const behavior = document.getElementById('settings-behavior');
  const section = (id: string, controls: string[]) => {
    const container = document.createElement('section');
    container.className = 'settings-behavior-section';
    const heading = document.createElement('h3');
    heading.id = id;
    container.setAttribute('aria-labelledby', id);
    container.append(heading);
    behavior?.append(container);
    controls.forEach((control) => {
      const current = document.getElementById(control)?.closest('.settings-row');
      if (current) container.append(current);
    });
    return { container, heading };
  };
  const contentSection = section('behavior-content-title', ['hide-book-title', 'work']);
  const clockSection = section('behavior-clock-title', ['transition-select', 'show-time', 'progressbar']);
  const speechSection = section('behavior-speech-title', []);
  const activate = document.createElement('button');
  activate.id = 'activate-speech';
  activate.type = 'button';
  speechSection.container.append(row, attributionRow, help, activate);

  let armed = false;
  let failure = '';
  let startTimer: ReturnType<typeof setTimeout> | undefined;
  let speakTimer: ReturnType<typeof setTimeout> | undefined;
  let cancelledAt = -Infinity;
  let utterance: SpeechSynthesisUtterance | undefined;
  let highlighting: ReturnType<typeof createSpeechHighlight> | undefined;
  const strings = () => STRINGS[getBaseLocale(getInterfaceLocale())];
  const refresh = () => {
    const text = strings();
    button.innerHTML = readingIcon(utterance ? 'stop' : 'speaker');
    button.title = supported ? (utterance ? text.stop : text.read) : text.unsupported;
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', String(!!utterance));
    button.disabled = !supported || !store.get('active-quote');
    caption.textContent = text.auto;
    attributionCaption.textContent = text.attribution;
    attributionToggle.disabled = !supported;
    attributionToggle.setAttribute('aria-checked', String(store.get('read-attribution')));
    toggle.disabled = !supported;
    toggle.setAttribute('aria-checked', String(store.get('auto-read')));
    contentSection.heading.textContent = text.contentSection;
    clockSection.heading.textContent = text.clockSection;
    speechSection.heading.textContent = text.speechSection;
    activate.textContent = text.activate;
    activate.hidden = !supported || !store.get('auto-read') || (armed && !failure);
    help.textContent = !supported
      ? text.unsupported
      : failure || (store.get('auto-read') && !armed ? text.activationNeeded : text.help);
  };
  const stop = () => {
    const active = !!utterance;
    utterance = undefined;
    highlighting?.clear();
    highlighting = undefined;
    clearTimeout(startTimer);
    clearTimeout(speakTimer);
    if (supported && active) {
      synth.cancel();
      cancelledAt = Date.now();
    }
    refresh();
  };
  const read = () => {
    const quote = store.get('active-quote');
    const paragraph = document.querySelector('#quote > p');
    if (!supported || !quote || !paragraph || document.hidden) return;
    stop();
    const text = speechText(paragraph).text;
    if (!text) return;
    const attribution = store.get('read-attribution')
      ? [visibleAttribution('title'), visibleAttribution('author')].filter(Boolean).join(', ')
      : '';
    const current = new SpeechSynthesisUtterance(attribution ? `${text}\n${attribution}.` : text);
    const parts = [{ element: paragraph, start: 0, text }];
    let attributionStart = text.length + 1;
    if (store.get('read-attribution')) {
      for (const id of ['title', 'author'] as const) {
        const value = visibleAttribution(id);
        const element = document.querySelector(`#quote > cite #${id}`);
        if (!value || !element) continue;
        parts.push({ element, start: attributionStart, text: value });
        attributionStart += value.length + 2;
      }
    }
    highlighting = createSpeechHighlight(parts);
    current.onboundary = (event) => {
      if (utterance === current && event.name === 'word') highlighting?.highlight(event.charIndex, event.charLength);
    };
    current.lang = quote.locale.replace(/-draft$/, '');
    const voices = synth.getVoices();
    current.voice =
      voices.find((voice) => voice.lang.toLowerCase() === current.lang.toLowerCase()) ||
      voices.find((voice) => voice.lang.split('-')[0] === current.lang.split('-')[0]) ||
      null;
    const failed = (message: string) => {
      if (utterance !== current) return;
      failure = message;
      armed = false;
      stop();
      showQuoteNotice(message, true);
    };
    current.onstart = () => {
      if (utterance !== current) return;
      clearTimeout(startTimer);
      failure = '';
      refresh();
    };
    current.onend = () => {
      if (utterance === current) {
        clearTimeout(startTimer);
        utterance = undefined;
        highlighting?.clear();
        highlighting = undefined;
        refresh();
      }
    };
    current.onerror = (event) => {
      if (utterance !== current) return;
      if (event.error === 'canceled' || event.error === 'interrupted') {
        clearTimeout(startTimer);
        utterance = undefined;
        highlighting?.clear();
        highlighting = undefined;
        refresh();
      } else failed(event.error === 'not-allowed' ? strings().blocked : strings().error);
    };
    utterance = current;
    refresh();
    startTimer = setTimeout(() => failed(strings().noStart), 8000);
    const speak = () => {
      if (utterance !== current) return;
      try {
        // Cancellation may still be reaching the native engine. Wake it even
        // when its exposed paused flag has not caught up with its actual state.
        synth.resume();
        synth.speak(current);
      } catch {
        failed(strings().error);
      }
    };
    const cancellationDelay = Math.max(0, 100 - (Date.now() - cancelledAt));
    if (cancellationDelay) speakTimer = setTimeout(speak, cancellationDelay);
    else speak();
  };
  const arm = () => {
    armed = true;
    failure = '';
    showQuoteNotice('');
  };
  activate.addEventListener('click', () => {
    arm();
    read();
  });
  button.addEventListener('click', () => {
    arm();
    if (utterance) stop();
    else read();
  });
  toggle.addEventListener('click', () => {
    arm();
    if (store.toggle('auto-read')) read();
    else stop();
  });
  const unsubscribe = store.subscribe((state, previous) => {
    if (
      (previous['auto-read'] && !state['auto-read']) ||
      state['hide-book-title'] !== previous['hide-book-title'] ||
      state.theme !== previous.theme ||
      (previous['read-attribution'] && !state['read-attribution'])
    )
      stop();
    refresh();
  });
  const changing = () => stop();
  const rendered = (event: Event) => {
    if (
      (event as CustomEvent<{ minuteTick: boolean }>).detail.minuteTick &&
      armed &&
      store.get('auto-read') &&
      !store.get('paused')
    )
      read();
  };
  const visibility = () => {
    if (document.hidden) stop();
  };
  document.addEventListener('quote-changing', changing);
  document.addEventListener('quote-rendered', rendered);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', stop);
  refresh();
  return () => {
    stop();
    unsubscribe();
    document.removeEventListener('quote-changing', changing);
    document.removeEventListener('quote-rendered', rendered);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', stop);
  };
}
