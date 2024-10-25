import { store } from '../store';

export function initFadeMode() {
  document.getElementById('fade')?.addEventListener('click', toggleFadeMode);
}

function toggleFadeMode() {
  const isFadeMode = store.toggleState('fade');

  if (!isFadeMode) {
    document.getElementById('quote')?.classList.remove('fade-in', 'fade-out');
  }
}

export function fadeOutQuote() {
  const now = new Date();

  if (now.getSeconds() === 59) {
    const blockquote = document.getElementById('quote');

    blockquote?.classList.remove('fade-in');
    blockquote?.classList.add('fade-out');
  }
}

export function fadeInQuote() {
  const blockquote = document.getElementById('quote');

  blockquote?.classList.remove('fade-out');
  blockquote?.classList.add('fade-in');
}
