import { store } from '../store';
import { getBaseLocale } from './locales';
import { readingStrings } from './reading-ui';
import { closeDialogOnBackdropClick } from '../utils/dialog';
import { renderShareCard, type CardFormat } from './share-card';
import STRINGS from '../strings/share.json';

let format: CardFormat = 'square';
export const selectedCardFormat = () => format;
export const shareOptionStrings = () => STRINGS[getBaseLocale(store.get('ui-locale') || store.get('locale'))];

export function initShareOptions() {
  const download = document.getElementById('download');
  if (!download || document.getElementById('share-options')) return;
  const button = document.createElement('button');
  button.id = 'share-options';
  button.type = 'button';
  button.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1"/><path d="m3 17 6-6 4 4 3-3 5 5"/></svg>';
  button.setAttribute('aria-haspopup', 'dialog');
  download.after(button);
  const updateLabel = () => {
    button.title = shareOptionStrings().title;
    button.setAttribute('aria-label', button.title);
  };
  updateLabel();
  store.subscribe(updateLabel);
  button.addEventListener('click', () => {
    const quote = store.get('active-quote');
    if (!quote || store.get('quote')) return;
    const snapshot = { ...quote };
    const strings = shareOptionStrings();
    const dialog = document.createElement('dialog');
    dialog.id = 'share-preview';
    dialog.setAttribute('aria-labelledby', 'share-preview-title');
    const heading = document.createElement('h2');
    heading.id = 'share-preview-title';
    heading.textContent = strings.title;
    const close = document.createElement('button');
    close.textContent = readingStrings().close;
    close.addEventListener('click', () => dialog.close());
    const label = document.createElement('label');
    label.textContent = strings.format;
    const select = document.createElement('select');
    for (const value of ['square', 'portrait', 'landscape'] as const) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = strings[value];
      select.append(option);
    }
    select.value = format;
    label.append(select);
    const preview = document.createElement('div');
    preview.className = 'share-preview-image';
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    const hint = document.createElement('p');
    hint.textContent = strings.hint;
    dialog.append(heading, label, status, preview, hint, close);
    document.body.append(dialog);
    closeDialogOnBackdropClick(dialog);
    let revision = 0;
    dialog.addEventListener('close', () => {
      revision++;
      dialog.remove();
      button.focus();
    });
    const refresh = async () => {
      const current = ++revision;
      format = select.value as CardFormat;
      status.textContent = strings.preparing;
      preview.replaceChildren();
      try {
        const canvas = await renderShareCard(snapshot, format);
        if (current !== revision) return;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', snapshot.quote_raw);
        preview.append(canvas);
        status.textContent = '';
      } catch {
        if (current === revision) status.textContent = strings.failed;
      }
    };
    select.addEventListener('change', () => void refresh());
    dialog.showModal();
    void refresh();
  });
}
