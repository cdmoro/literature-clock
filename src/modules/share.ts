import { renderShareCard, type CardFormat } from './share-card';
import {
  initShareOptions,
  selectedCardFormat,
  selectedCardAppearance,
  selectedCardTheme,
  selectedCardOptions,
  shareOptionStrings,
} from './share-options';
import type { ResolvedQuote } from '../types';
import { getTime } from '../utils';
import { store } from '../store';
import { getQuoteUrl } from './quote-links';
import { readingStrings, showQuoteNotice } from './reading-ui';

export function initShare() {
  const share = document.getElementById('share');
  initShareOptions();

  document.getElementById('download')?.addEventListener('click', () => void downloadQuote());
  store.subscribe((state) => {
    if (share)
      (share as HTMLButtonElement).disabled =
        !!state.quote || !state['active-quote'] || !getQuoteUrl(state['active-quote']);
  });
  if (share) (share as HTMLButtonElement).disabled = true;
}

export async function getCanvas(format: CardFormat = selectedCardFormat(), quote = store.get('active-quote')) {
  if (!quote) return;
  return renderShareCard({ ...quote }, format, selectedCardAppearance(), selectedCardTheme(), selectedCardOptions());
}

export async function shareQuote(snapshot?: ResolvedQuote) {
  const quote = snapshot || store.get('active-quote');
  if (!quote || (!snapshot && store.get('quote'))) return;
  const url = getQuoteUrl(quote);
  if (!url) return;
  try {
    if (!navigator.share) {
      await navigator.clipboard.writeText(url);
      showQuoteNotice(readingStrings().linkCopied);
      return readingStrings().linkCopied;
    }
    const text = `${quote.quote_raw} — ${quote.title}, ${quote.author}`;
    let shareData: ShareData = { text, url };
    const canvas =
      typeof navigator.canShare === 'function'
        ? await getCanvas(selectedCardFormat(), quote).catch(() => undefined)
        : undefined;
    const blob = await new Promise<Blob | null>((resolve) => (canvas ? canvas.toBlob(resolve) : resolve(null)));
    if (blob) {
      const files = [new File([blob], `Quote ${quote.time}.png`, { type: 'image/png' })];
      const imageData: ShareData = { files, url };
      if (navigator.canShare?.(imageData)) shareData = imageData;
    }
    await navigator.share(shareData);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    showQuoteNotice(readingStrings().linkFailed);
    return readingStrings().linkFailed;
  }
}

let downloading = false;
export async function downloadQuote(snapshot?: ResolvedQuote) {
  if (downloading) return;
  downloading = true;
  const quote = snapshot || store.get('active-quote');
  if (!quote || (!snapshot && store.get('quote'))) {
    downloading = false;
    return;
  }
  const time = quote.time || getTime();
  const button = document.getElementById('download') as HTMLButtonElement | null;
  if (button) button.disabled = true;
  try {
    const canvas = await getCanvas(selectedCardFormat(), quote);
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));
    if (!blob) throw new Error('Image unavailable');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quote_${time.replace(':', '_')}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    showQuoteNotice(shareOptionStrings().failed);
    return shareOptionStrings().failed;
  } finally {
    downloading = false;
    if (button) button.disabled = false;
  }
}
