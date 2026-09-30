import { store } from '../store';
import { getBaseLocale } from './locales';
import STRINGS from '../strings/reading.json';

export function readingStrings() {
  return STRINGS[getBaseLocale(store.get('ui-locale') || store.get('locale'))];
}

let noticeTimeout: ReturnType<typeof setTimeout> | undefined;

export function showQuoteNotice(message: string, persistent = false) {
  clearTimeout(noticeTimeout);
  let notice = document.getElementById('quote-notice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'quote-notice';
    notice.setAttribute('role', 'status');
    notice.setAttribute('data-html2canvas-ignore', '');
    document.body.appendChild(notice);
  }
  notice.textContent = message;
  notice.hidden = !message;
  if (message && !persistent) {
    const current = notice;
    noticeTimeout = setTimeout(() => {
      current.hidden = true;
    }, 6000);
  }
}
