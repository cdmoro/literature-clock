import html2canvas from 'html2canvas-pro';
import { getTime } from '../utils';
import { store } from '../store';
import { getQuoteUrl } from './quote-links';
import { readingStrings, showQuoteNotice } from './reading-ui';

export function initShare() {
  const share = document.getElementById('share');

  document.getElementById('download')?.addEventListener('click', downloadQuote);
  store.subscribe((state) => {
    if (share)
      (share as HTMLButtonElement).disabled =
        !!state.quote || !state['active-quote'] || !getQuoteUrl(state['active-quote']);
  });
  if (share) (share as HTMLButtonElement).disabled = true;

  share?.addEventListener('click', shareQuote);
  if (!('share' in navigator) && share) {
    share.title = readingStrings().copyLink;
    share.setAttribute('aria-label', readingStrings().copyLink);
  }
}

async function getCanvas() {
  const quote = document.getElementById('quote');

  if (quote) {
    const canvas = await html2canvas(document.body, {
      allowTaint: true,
      useCORS: true,
      scale: 2,
      onclone(_document, element) {
        element.classList.add('share-quote');
        element.classList.remove('screensaver');
      },
    });

    const flashEl = document.createElement('div');
    flashEl.id = 'flash';
    document.body.appendChild(flashEl);

    setTimeout(() => {
      flashEl.remove();
    }, 500);

    return canvas;
  }
}

export async function shareQuote() {
  const quote = store.get('active-quote');
  if (!quote || store.get('quote')) return;
  const url = getQuoteUrl(quote);
  if (!url) return;
  try {
    if (!navigator.share) {
      await navigator.clipboard.writeText(url);
      showQuoteNotice(readingStrings().linkCopied);
      return;
    }
    const text = `${quote.quote_raw} — ${quote.title}, ${quote.author}`;
    const shareData: ShareData = { text, url };
    const canvas = await getCanvas();
    const blob = await new Promise<Blob | null>((resolve) => (canvas ? canvas.toBlob(resolve) : resolve(null)));
    if (blob && store.get('active-quote') === quote) {
      const files = [new File([blob], `Quote ${quote.time}.png`, { type: 'image/png' })];
      if (navigator.canShare?.({ ...shareData, files })) shareData.files = files;
    }
    await navigator.share(shareData);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    showQuoteNotice(readingStrings().linkFailed);
  }
}

async function downloadQuote() {
  const canvas = await getCanvas();
  const url = canvas?.toDataURL('image/png');
  const time = store.get('active-quote')?.time || getTime();

  if (url) {
    const a = document.createElement('a');

    a.style.display = 'none';
    a.setAttribute('href', url);
    a.setAttribute('download', `quote_${time.replace(':', '_')}.png`);
    document.body.appendChild(a);

    a.click();
    a.remove();
  }
}
