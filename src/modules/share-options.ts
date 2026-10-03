import { store } from '../store';
import { getBaseLocale } from './locales';
import { readingStrings } from './reading-ui';
import { closeDialogOnBackdropClick } from '../utils/dialog';
import { renderShareCard, type CardAppearance, type CardFormat } from './share-card';
import { downloadQuote, shareQuote } from './share';
import STRINGS from '../strings/share.json';

let format: CardFormat = 'square';
let appearance: CardAppearance | undefined;
let theme: string | undefined;
export const selectedCardTheme = () => theme;
export const selectedCardAppearance = () => appearance;
export const selectedCardFormat = () => format;
export const shareOptionStrings = () => STRINGS[getBaseLocale(store.get('ui-locale') || store.get('locale'))];

export function initShareOptions() {
  const button = document.getElementById('share');
  if (!button || button.dataset.shareDialogBound) return;
  button.dataset.shareDialogBound = 'true';
  button.setAttribute('aria-haspopup', 'dialog');
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
    const header = document.createElement('header');
    const close = document.createElement('button');
    close.className = 'dialog-close';
    close.type = 'button';
    close.setAttribute('aria-label', readingStrings().close);
    close.textContent = '×';
    close.addEventListener('click', () => dialog.close());
    header.append(heading, close);
    const controls = document.createElement('div');
    controls.className = 'share-preview-controls';
    const formatGroup = document.createElement('div');
    formatGroup.className = 'share-choice-group';
    formatGroup.setAttribute('role', 'group');
    formatGroup.setAttribute('aria-label', strings.format);
    const formatButtons = new Map<CardFormat, HTMLButtonElement>();
    for (const [value, dimensions] of [
      ['landscape', [18, 12]],
      ['portrait', [12, 18]],
      ['square', [16, 16]],
    ] as const) {
      const option = document.createElement('button');
      option.type = 'button';
      option.title = strings[value];
      option.setAttribute('aria-label', strings[value]);
      const [width, height] = dimensions;
      option.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="${(24 - width) / 2}" y="${(24 - height) / 2}" width="${width}" height="${height}" rx="2"/></svg>`;
      option.addEventListener('click', () => {
        format = value;
        void refresh();
      });
      formatButtons.set(value, option);
      formatGroup.append(option);
    }
    const appearanceGroup = document.createElement('div');
    appearanceGroup.className = 'share-choice-group';
    appearanceGroup.setAttribute('role', 'group');
    appearanceGroup.setAttribute('aria-label', strings.appearance);
    const appearanceButtons = new Map<CardAppearance, HTMLButtonElement>();
    for (const value of ['light', 'dark'] as const) {
      const option = document.createElement('button');
      option.type = 'button';
      option.title = strings[value];
      option.setAttribute('aria-label', strings[value]);
      const source = document.querySelector<SVGGElement>(`[data-variant-icon="${value}"]`);
      if (source?.parentElement) {
        const icon = source.parentElement.cloneNode(false) as SVGSVGElement;
        const shape = source.cloneNode(true) as SVGGElement;
        shape.removeAttribute('data-variant-icon');
        icon.setAttribute('width', '24');
        icon.setAttribute('height', '24');
        icon.setAttribute('aria-hidden', 'true');
        icon.setAttribute('focusable', 'false');
        icon.append(shape);
        option.append(icon);
      } else {
        option.textContent = strings[value];
      }
      option.addEventListener('click', () => {
        appearance = value;
        void refresh();
      });
      appearanceButtons.set(value, option);
      appearanceGroup.append(option);
    }
    controls.append(formatGroup, appearanceGroup);
    const themes = [...document.querySelectorAll<HTMLOptionElement>('#theme-select option')].filter(
      (option) => option.value !== 'color',
    );
    const carousel = document.createElement('div');
    carousel.className = 'share-theme-carousel';
    carousel.setAttribute('role', 'group');
    carousel.setAttribute('aria-label', strings.theme);
    const themeName = document.createElement('span');
    themeName.setAttribute('aria-live', 'polite');
    const currentTheme = () =>
      theme || (document.documentElement.dataset.theme || 'base-light').replace(/-(light|dark)$/, '');
    const updateThemeName = () => {
      themeName.textContent = themes.find((option) => option.value === currentTheme())?.textContent || currentTheme();
    };
    for (const [step, label, icon] of [
      [-1, strings.previousTheme, '‹'],
      [1, strings.nextTheme, '›'],
    ] as const) {
      const arrow = document.createElement('button');
      arrow.type = 'button';
      arrow.textContent = icon;
      arrow.setAttribute('aria-label', label);
      arrow.title = label;
      arrow.disabled = themes.length < 2;
      arrow.addEventListener('click', () => {
        const index = Math.max(
          0,
          themes.findIndex((option) => option.value === currentTheme()),
        );
        theme = themes[(index + step + themes.length) % themes.length].value;
        updateThemeName();
        void refresh();
      });
      carousel.append(arrow);
      if (step === -1) carousel.append(themeName);
    }
    updateThemeName();
    controls.append(carousel);
    const preview = document.createElement('div');
    preview.className = 'share-preview-image';
    preview.setAttribute('role', 'group');
    preview.setAttribute('aria-label', strings.preview);
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    const hint = document.createElement('p');
    hint.textContent = strings.hint;
    const previewLabel = document.createElement('div');
    previewLabel.className = 'share-preview-label';
    previewLabel.textContent = strings.preview;
    const imageArea = document.createElement('div');
    imageArea.className = 'share-preview-area';
    imageArea.append(previewLabel, preview);
    const actions = document.createElement('div');
    actions.className = 'share-preview-actions';
    for (const [text, action] of [
      [strings.share, shareQuote],
      [strings.download, downloadQuote],
    ] as const) {
      const actionButton = document.createElement('button');
      actionButton.type = 'button';
      actionButton.textContent = text;
      actionButton.addEventListener('click', async () => {
        actionButton.disabled = true;
        try {
          const notice = await action(snapshot);
          status.textContent = notice || '';
        } finally {
          actionButton.disabled = false;
        }
      });
      actions.append(actionButton);
    }
    const copyImage = document.createElement('button');
    copyImage.type = 'button';
    copyImage.textContent = strings.copyImage;
    const canCopyImage = typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function';
    copyImage.disabled = true;
    if (!canCopyImage) copyImage.title = strings.copyUnavailable;
    copyImage.addEventListener('click', async () => {
      const canvas = preview.querySelector('canvas');
      if (!canvas || !canCopyImage) return;
      copyImage.disabled = true;
      try {
        // Start clipboard.write within the click gesture, before encoding completes.
        const png = new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Image unavailable'));
          }, 'image/png'),
        );
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
        status.textContent = strings.imageCopied;
      } catch {
        status.textContent = strings.copyFailed;
      } finally {
        copyImage.disabled = !canCopyImage || !preview.querySelector('canvas');
      }
    });
    actions.prepend(copyImage);
    dialog.append(header, controls, status, imageArea, hint, actions);
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
      formatButtons.forEach((option, value) => option.setAttribute('aria-pressed', String(value === format)));
      const variant = appearance || (document.documentElement.dataset.theme?.endsWith('-dark') ? 'dark' : 'light');
      appearanceButtons.forEach((option, value) => option.setAttribute('aria-pressed', String(value === variant)));
      status.textContent = strings.preparing;
      preview.replaceChildren();
      copyImage.disabled = true;
      try {
        const canvas = await renderShareCard(snapshot, format, appearance, theme);
        if (current !== revision) return;
        canvas.style.width = 'auto';
        canvas.style.height = 'auto';
        canvas.style.objectFit = 'contain';
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', snapshot.quote_raw);
        preview.append(canvas);
        copyImage.disabled = !canCopyImage;
        status.textContent = '';
      } catch {
        if (current === revision) status.textContent = strings.failed;
      }
    };
    dialog.showModal();
    void refresh();
  });
}
