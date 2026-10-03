import { store } from '../store';
import { getBaseLocale, getInterfaceLocale } from './locales';
import { readingIcon } from './reading-icons';
import { showQuoteNotice } from './reading-ui';
import STRINGS from '../strings/speech.json';

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

  let armed = false;
  let utterance: SpeechSynthesisUtterance | undefined;
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
    help.textContent = supported ? text.help : text.unsupported;
  };
  const stop = () => {
    utterance = undefined;
    if (supported) synth.cancel();
    refresh();
  };
  const read = () => {
    const quote = store.get('active-quote');
    const paragraph = document.querySelector('#quote > p');
    if (!supported || !quote || !paragraph || document.hidden) return;
    stop();
    const copy = paragraph.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
    const text = copy.textContent?.trim();
    if (!text) return;
    const attribution = store.get('read-attribution')
      ? [quote.title, quote.author].filter((part) => part?.trim()).join(', ')
      : '';
    const current = new SpeechSynthesisUtterance(attribution ? `${text}\n${attribution}.` : text);
    current.lang = quote.locale.replace(/-draft$/, '');
    const voices = synth.getVoices();
    current.voice =
      voices.find((voice) => voice.lang.toLowerCase() === current.lang.toLowerCase()) ||
      voices.find((voice) => voice.lang.split('-')[0] === current.lang.split('-')[0]) ||
      null;
    current.onend = () => {
      if (utterance === current) {
        utterance = undefined;
        refresh();
      }
    };
    current.onerror = (event) => {
      if (utterance !== current) return;
      utterance = undefined;
      if (event.error !== 'canceled' && event.error !== 'interrupted') showQuoteNotice(strings().error);
      refresh();
    };
    utterance = current;
    refresh();
    try {
      synth.speak(current);
    } catch {
      stop();
      showQuoteNotice(strings().error);
    }
  };
  button.addEventListener('click', () => {
    armed = true;
    if (utterance) stop();
    else read();
  });
  toggle.addEventListener('click', () => {
    armed = true;
    if (store.toggle('auto-read')) read();
    else stop();
  });
  const unsubscribe = store.subscribe((state, previous) => {
    if (state['active-quote'] !== previous['active-quote'] || (previous['auto-read'] && !state['auto-read'])) stop();
    refresh();
  });
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
  document.addEventListener('quote-rendered', rendered);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', stop);
  refresh();
  return () => {
    stop();
    unsubscribe();
    document.removeEventListener('quote-rendered', rendered);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', stop);
  };
}
