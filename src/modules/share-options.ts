import { store } from '../store';
import { fontSupportsLocale } from './font-preferences';
import { getBaseLocale, getStrings } from './locales';
import { readingStrings } from './reading-ui';
import { closeDialogOnBackdropClick } from '../utils/dialog';
import { renderShareCard, type CardAppearance, type CardFormat } from './share-card';
import { downloadQuote, shareQuote } from './share';
import { BACKGROUND_PATTERNS, type BackgroundPattern } from '../utils/background-patterns';
import SETTINGS from '../strings/settings.json';
import STRINGS from '../strings/share.json';
import copyIcon from '../assets/copy.svg?raw';
import shareIcon from '../assets/share.svg?raw';
import downloadIcon from '../assets/download.svg?raw';
import { COLOR_PRESETS, mountColorPalette } from './color-palette';
import { defaultColor } from './themes';
import COLOR_STRINGS from '../strings/colorControls.json';
import '../styles/share-color-controls.css';

let format: CardFormat = 'square';
let appearance: CardAppearance | undefined;
let theme: string | undefined;
let pattern: BackgroundPattern | undefined;
let color: string | undefined;
let palette: string | undefined;
let useDefaultColor = false;
let font: string | undefined;
export const selectedCardOptions = () => ({
  pattern: pattern ?? store.get('background-pattern') ?? 'none',
  color,
  ...(palette && palette !== 'default' ? { palette } : {}),
  font,
  ...(useDefaultColor ? { useDefaultColor: true } : {}),
});
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
    const settingsStrings = SETTINGS[getBaseLocale(store.get('ui-locale') || store.get('locale'))];
    pattern = store.get('background-pattern') || 'none';
    color = undefined;
    palette =
      store.get('palette') === 'random'
        ? document.documentElement.dataset.accentPalette || document.documentElement.dataset.palette || 'default'
        : store.get('palette') || 'default';
    useDefaultColor = false;
    font = store.get('font') || 'default';
    const dialog = document.createElement('dialog');
    dialog.id = 'share-preview';
    dialog.setAttribute('aria-labelledby', 'share-preview-title');
    const heading = document.createElement('h2');
    heading.id = 'share-preview-title';
    heading.tabIndex = -1;
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
    const field = (caption: string, control: HTMLElement) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'share-control';
      const label = document.createElement('span');
      label.className = 'share-control-caption';
      label.textContent = caption;
      wrapper.append(label, control);
      return wrapper;
    };
    controls.append(field(strings.format, formatGroup), field(strings.appearance, appearanceGroup));
    const customization = document.createElement('details');
    customization.className = 'share-customization';
    const customizationSummary = document.createElement('summary');
    const customizationControls = document.createElement('div');
    customizationControls.className = 'share-customization-controls';
    customization.append(customizationSummary, customizationControls);
    controls.append(customization);
    const mobileLayout = window.matchMedia?.('(max-width: 600px)');
    const syncCustomization = () => {
      customization.open = !mobileLayout?.matches;
    };
    syncCustomization();
    mobileLayout?.addEventListener('change', syncCustomization);
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
    const imageColors = new Map<
      string,
      { palette: string | undefined; color: string | undefined; useDefaultColor: boolean }
    >();
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
        imageColors.set(currentTheme(), { palette, color, useDefaultColor });
        theme = themes[(index + step + themes.length) % themes.length].value;
        const saved = imageColors.get(theme);
        palette = saved?.palette || 'default';
        color = saved?.color;
        useDefaultColor = saved?.useDefaultColor ?? true;
        updateThemeName();
        void refresh();
      });
      carousel.append(arrow);
      if (step === -1) carousel.append(themeName);
    }
    updateThemeName();
    customizationControls.append(field(strings.theme, carousel));
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.id = 'share-preview-color';
    colorInput.value = store.get('color') || '#d24335';
    colorInput.setAttribute('aria-label', settingsStrings.settings_color);
    colorInput.title = settingsStrings.settings_color;
    colorInput.addEventListener('input', () => {
      if (colorInput.disabled) return;
      color = colorInput.value;
      palette = 'default';
      useDefaultColor = false;
      void refresh();
    });
    const colorControl = document.createElement('div');
    colorControl.className = 'share-control share-palette-control';
    const colorCaption = document.createElement('label');
    colorCaption.htmlFor = colorInput.id;
    colorCaption.className = 'share-control-caption';
    colorCaption.textContent = settingsStrings.settings_color;
    const resetColor = document.createElement('button');
    resetColor.id = 'share-preview-reset-color';
    resetColor.type = 'button';
    resetColor.textContent = '↺';
    resetColor.title = COLOR_STRINGS[getBaseLocale(store.get('ui-locale') || store.get('locale'))].reset_color;
    resetColor.setAttribute('aria-label', resetColor.title);
    resetColor.addEventListener('click', () => {
      if (colorInput.disabled) return;
      color = undefined;
      palette = 'default';
      useDefaultColor = true;
      void refresh();
    });
    const colorGroup = document.createElement('span');
    colorGroup.className = 'share-color-input-group';
    colorGroup.append(colorInput, resetColor);
    const colorDropdown = document.createElement('details');
    colorDropdown.className = 'share-color-dropdown';
    const colorToggle = document.createElement('summary');
    colorToggle.setAttribute('aria-label', settingsStrings.settings_color);
    const colorIndicator = document.createElement('span');
    colorIndicator.className = 'toolbar-color-indicator';
    colorToggle.append(colorIndicator);
    colorGroup.classList.add('share-color-popover');
    colorDropdown.append(colorToggle, colorGroup);
    colorGroup.addEventListener('palette-default-selected', () => {
      colorDropdown.open = false;
      colorToggle.focus();
    });
    const compactReset = document.createElement('button');
    compactReset.type = 'button';
    compactReset.className = 'share-color-reset';
    compactReset.setAttribute('aria-label', resetColor.title);
    compactReset.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/></svg>';
    compactReset.addEventListener('click', () => resetColor.click());
    const compactGroup = document.createElement('div');
    compactGroup.className = 'share-color-compact';
    compactGroup.append(colorDropdown, compactReset);
    const closeColorOnOutsideClick = (event: MouseEvent) => {
      if (!event.composedPath().includes(compactGroup)) colorDropdown.open = false;
    };
    document.addEventListener('click', closeColorOnOutsideClick);
    colorDropdown.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && colorDropdown.open) {
        event.preventDefault();
        event.stopPropagation();
        colorDropdown.open = false;
        colorToggle.focus();
      }
    });
    colorControl.append(colorCaption, compactGroup);
    controls.insertBefore(colorControl, customization);
    const patternControl = document.createElement('label');
    patternControl.className = 'share-pattern-control';
    const patternCaption = document.createElement('span');
    patternCaption.textContent = settingsStrings.settings_background_pattern;
    const patternSelect = document.createElement('select');
    patternSelect.id = 'share-preview-pattern';
    for (const value of BACKGROUND_PATTERNS) {
      patternSelect.append(new Option(settingsStrings[`settings_pattern_${value}`], value));
    }
    patternSelect.value = pattern;
    patternSelect.addEventListener('change', () => {
      pattern = patternSelect.value as BackgroundPattern;
      void refresh();
    });
    patternControl.append(patternCaption, patternSelect);
    customizationControls.append(patternControl);
    const fontControl = document.createElement('label');
    fontControl.className = 'share-font-control';
    const fontCaption = document.createElement('span');
    const fontStrings = getStrings(store.get('ui-locale') || store.get('locale'));
    customizationSummary.textContent = `${strings.theme} / ${settingsStrings.settings_color} / ${fontStrings.font}`;
    fontCaption.textContent = fontStrings.font;
    const fontSelect = document.createElement('select');
    fontSelect.id = 'share-preview-font';
    const sourceFonts = document.querySelectorAll<HTMLOptionElement>('#font-select option');
    for (const source of sourceFonts) {
      const option = source.cloneNode(true) as HTMLOptionElement;
      option.removeAttribute('data-text');
      option.disabled = option.value !== 'default' && fontSupportsLocale(option.value, snapshot.locale) === false;
      fontSelect.append(option);
    }
    if (!fontSelect.querySelector('option[value="default"]')) fontSelect.prepend(new Option('', 'default'));
    fontSelect.querySelector<HTMLOptionElement>('option[value="default"]')!.textContent = fontStrings.default_font;
    if (fontSupportsLocale(font, snapshot.locale) === false) font = 'default';
    if (![...fontSelect.options].some((option) => option.value === font)) font = 'default';
    fontSelect.value = font;
    fontSelect.addEventListener('change', () => {
      font = fontSelect.value;
      void refresh();
    });
    fontControl.append(fontCaption, fontSelect);
    customizationControls.append(fontControl);
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
    const setActionContent = (target: HTMLButtonElement, text: string, icon: string) => {
      target.setAttribute('aria-label', text);
      target.title = text;
      target.innerHTML = icon;
      target.querySelector('svg')?.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = 'share-action-label';
      label.textContent = text;
      target.append(label);
    };
    const copyText = document.createElement('button');
    copyText.type = 'button';
    setActionContent(copyText, fontStrings.copy_title, copyIcon);
    copyText.disabled = typeof navigator.clipboard?.writeText !== 'function';
    copyText.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(snapshot.quote_raw);
        status.textContent = fontStrings.copy_mode_copied;
      } catch {
        status.textContent = strings.textCopyFailed;
      }
    });
    actions.append(copyText);
    for (const [text, action, icon] of [
      [strings.share, shareQuote, shareIcon],
      [strings.download, downloadQuote, downloadIcon],
    ] as const) {
      const actionButton = document.createElement('button');
      actionButton.type = 'button';
      setActionContent(actionButton, text, icon);
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
    setActionContent(
      copyImage,
      strings.copyImage,
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1"/><path d="m3 17 6-6 4 4 3-3 5 5"/></svg>',
    );
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
      mobileLayout?.removeEventListener('change', syncCustomization);
      pattern = undefined;
      color = undefined;
      palette = undefined;
      appearance = undefined;
      theme = undefined;
      useDefaultColor = false;
      font = undefined;
      document.removeEventListener('click', closeColorOnOutsideClick);
      imagePalette.dispose();
      dialog.remove();
      button.focus();
    });
    const refresh = async () => {
      const current = ++revision;
      patternControl.hidden = false;
      patternSelect.disabled = false;
      formatButtons.forEach((option, value) => option.setAttribute('aria-pressed', String(value === format)));
      const variant = appearance || (document.documentElement.dataset.theme?.endsWith('-dark') ? 'dark' : 'light');
      colorInput.disabled = false;
      const resolvedPalette = palette === 'random' ? document.documentElement.dataset.palette : palette;
      const preset = resolvedPalette && resolvedPalette in COLOR_PRESETS ? resolvedPalette : undefined;
      colorInput.value = preset
        ? defaultColor(preset, variant === 'dark')
        : useDefaultColor
          ? defaultColor(currentTheme(), variant === 'dark')
          : color || store.get('custom-color') || store.get('color') || '#d24335';
      resetColor.hidden = !preset && colorInput.value === defaultColor(currentTheme(), variant === 'dark');
      colorIndicator.style.background = colorInput.value;
      compactReset.hidden = resetColor.hidden;
      imagePalette.refresh();
      appearanceButtons.forEach((option, value) => option.setAttribute('aria-pressed', String(value === variant)));
      status.textContent = strings.preparing;
      preview.replaceChildren();
      copyImage.disabled = true;
      try {
        const canvas = await renderShareCard(snapshot, format, appearance, theme, selectedCardOptions());
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
    const imagePalette = mountColorPalette(colorGroup, colorInput, {
      showRandom: false,
      randomLabel: getStrings(store.get('ui-locale') || store.get('locale')).color,
      locale: () => getBaseLocale(store.get('ui-locale') || store.get('locale')),
      state: () => ({
        palette: palette || 'default',
        color: colorInput.value,
        defaultColor: defaultColor(
          currentTheme(),
          (appearance || (document.documentElement.dataset.theme?.endsWith('-dark') ? 'dark' : 'light')) === 'dark',
        ),
        defaultSelected:
          !palette || palette === 'default'
            ? useDefaultColor ||
              colorInput.value ===
                defaultColor(
                  currentTheme(),
                  (appearance || (document.documentElement.dataset.theme?.endsWith('-dark') ? 'dark' : 'light')) ===
                    'dark',
                )
            : false,
      }),
      choose: (choice) => {
        if (choice.palette === 'default' && !choice.color) {
          resetColor.click();
          return;
        }
        const choices = Object.keys(COLOR_PRESETS).filter((name) => name !== palette);
        palette = choice.palette === 'random' ? choices[Math.floor(Math.random() * choices.length)] : choice.palette;
        color = choice.palette === 'default' ? choice.color : undefined;
        useDefaultColor = false;
        void refresh();
      },
    });
    dialog.showModal();
    heading.focus({ preventScroll: true });
    void refresh();
  });
}
