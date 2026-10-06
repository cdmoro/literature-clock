import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { initShareOptions, selectedCardOptions } from './share-options';
import { renderShareCard } from './share-card';
import { shareQuote, downloadQuote } from './share';
const { state } = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock('../store', () => ({ store: { get: (key: string) => state[key], subscribe: vi.fn() } }));
vi.mock('./locales', () => ({
  getBaseLocale: () => 'en-GB',
  getStrings: () => ({
    font: 'Font',
    default_font: 'Default font',
    copy_title: 'Copy quote',
    copy_mode_copied: 'Quote copied!',
  }),
}));
vi.mock('./share', () => ({
  shareQuote: vi.fn().mockResolvedValue(undefined),
  downloadQuote: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./share-card', () => ({ renderShareCard: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  state.locale = 'en-GB';
  state['background-pattern'] = 'none';
  localStorage.clear();
  state.palette = 'default';
  document.documentElement.dataset.palette = 'default';
  state.color = '#d24335';
  state['custom-color'] = '';
  state.font = 'default';
  state.quote = undefined;
  state['active-quote'] = { id: '1200-001', quote_raw: 'Original quote', locale: 'en-GB', time: '12:00' };
  document.documentElement.dataset.theme = 'base-dark';
  document.body.innerHTML =
    '<button id="share"><svg id="existing-share-icon"></svg></button><select id="theme-select"><option value="base">Base</option><option value="book">Book page</option></select><select id="font-select"><option value="default">Default font</option><option value="Lora">Lora</option><option value="Special Elite">Special Elite</option><option value="My Custom Font">My Custom Font (custom, unverified)</option></select>';
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
  vi.mocked(renderShareCard).mockImplementation(async () => document.createElement('canvas'));
  initShareOptions();
  document.getElementById('share')!.click();
});

const button = (label: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('#share-preview button')].find(
    (el) => el.getAttribute('aria-label') === label || el.textContent === label,
  )!;
it('changes image format and appearance without changing the live clock', async () => {
  button('Vertical').click();
  button('Light').click();
  await Promise.resolve();
  expect(renderShareCard).toHaveBeenLastCalledWith(
    expect.objectContaining({ quote_raw: 'Original quote' }),
    'portrait',
    'light',
    undefined,
    { pattern: 'none', color: undefined, font: 'default' },
  );
  expect(button('Vertical').getAttribute('aria-pressed')).toBe('true');
  expect(button('Light').getAttribute('aria-pressed')).toBe('true');
  expect(document.documentElement.dataset.theme).toBe('base-dark');
});
it('shares and downloads the preview quote even when the live quote changes', async () => {
  state['active-quote'] = { quote_raw: 'New minute' };
  button('Share').click();
  button('Download').click();
  await Promise.resolve();
  expect(shareQuote).toHaveBeenCalledWith(expect.objectContaining({ quote_raw: 'Original quote' }));
  expect(downloadQuote).toHaveBeenCalledWith(expect.objectContaining({ quote_raw: 'Original quote' }));
});
it('discards a preview render after the dialog closes', async () => {
  const canvas = document.createElement('canvas');
  let finish!: (canvas: HTMLCanvasElement) => void;
  vi.mocked(renderShareCard).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  button('Horizontal').click();
  button('Close').click();
  finish(canvas);
  await Promise.resolve();
  expect(document.getElementById('share-preview')).toBeNull();
  expect(canvas.isConnected).toBe(false);
});

afterEach(() => {
  document.querySelector<HTMLDialogElement>('#share-preview')?.close();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('disables image copying when the browser does not support it', () => {
  expect(button('Copy image').disabled).toBe(true);
  expect(button('Copy image').title).toContain('unavailable');
});
it.each([false, true])('copies a PNG and reports clipboard denial: %s', async (denied) => {
  const write = denied ? vi.fn().mockRejectedValue(new Error('denied')) : vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { write } });
  vi.stubGlobal(
    'ClipboardItem',
    class {
      constructor(public data: Record<string, Promise<Blob>>) {}
    },
  );
  const blob = new Blob(['png'], { type: 'image/png' });
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(blob));
  button('Close').click();
  document.getElementById('share')!.click();
  await vi.waitFor(() => expect(button('Copy image').disabled).toBe(false));
  button('Copy image').click();
  await vi.waitFor(() =>
    expect(document.querySelector('#share-preview [role="status"]')?.textContent).toBe(
      denied ? 'Could not copy the image. Please try again.' : 'Image copied',
    ),
  );
  expect(write).toHaveBeenCalledOnce();
  expect(await write.mock.calls[0][0][0].data['image/png']).toBe(blob);
});

it('opens the dialog from Share and preserves its existing icon without an extra toolbar button', () => {
  expect(document.getElementById('existing-share-icon')?.parentElement?.id).toBe('share');
  expect(document.getElementById('share-options')).toBeNull();
  expect(document.getElementById('share-preview-title')?.textContent).toBe('Share quote');
});

it('folds customization on mobile and opens it when switching to desktop', () => {
  button('Close').click();
  const listeners = new Set<() => void>();
  const media = {
    matches: true,
    addEventListener: vi.fn((_type: string, listener: () => void) => listeners.add(listener)),
    removeEventListener: vi.fn((_type: string, listener: () => void) => listeners.delete(listener)),
  };
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(media));
  document.getElementById('share')!.click();
  const customization = document.querySelector<HTMLDetailsElement>('.share-customization')!;
  expect(customization.open).toBe(false);
  expect(customization.querySelector('summary')?.textContent).toBe('Theme / Colour / Font');
  expect(customization.contains(document.getElementById('share-preview-font'))).toBe(true);
  expect(customization.contains(button('Vertical'))).toBe(false);
  customization.open = true;
  button('Next theme').click();
  expect(customization.open).toBe(true);
  button('Previous theme').click();
  media.matches = false;
  listeners.forEach((listener) => listener());
  expect(customization.open).toBe(true);
  media.matches = true;
  listeners.forEach((listener) => listener());
  expect(customization.open).toBe(false);
  button('Close').click();
  expect(listeners.size).toBe(0);
});

it('keeps customization expanded on desktop', () => {
  expect(document.querySelector<HTMLDetailsElement>('.share-customization')?.open).toBe(true);
});

it('cycles image themes in both directions without changing the live theme', async () => {
  button('Next theme').click();
  await Promise.resolve();
  expect(document.querySelector('.share-theme-carousel span')?.textContent).toBe('Book page');
  expect(vi.mocked(renderShareCard).mock.calls[vi.mocked(renderShareCard).mock.calls.length - 1]?.[3]).toBe('book');
  button('Previous theme').click();
  expect(document.querySelector('.share-theme-carousel span')?.textContent).toBe('Base');
  expect(document.documentElement.dataset.theme).toBe('base-dark');
});

it('changes the preview colour and pattern without touching clock preferences or the URL', async () => {
  const originalUrl = location.href;
  const input = document.getElementById('share-preview-color') as HTMLInputElement;
  const select = document.getElementById('share-preview-pattern') as HTMLSelectElement;
  input.value = '#123456';
  input.dispatchEvent(new Event('input'));
  select.value = 'dots';
  select.dispatchEvent(new Event('change'));
  await Promise.resolve();
  expect(renderShareCard).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), undefined, undefined, {
    color: '#123456',
    pattern: 'dots',
    font: 'default',
  });
  expect(state.color).toBe('#d24335');
  expect(state['background-pattern']).toBe('none');
  expect(location.href).toBe(originalUrl);
  expect(document.documentElement.dataset.theme).toBe('base-dark');
  button('Next theme').click();
  expect(select.disabled).toBe(false);
  expect(select.closest('label')!.hidden).toBe(false);
  button('Previous theme').click();
  expect(select.disabled).toBe(false);
  expect(select.value).toBe('dots');
  button('Close').click();
  expect(selectedCardOptions()).toEqual({ pattern: 'none', color: undefined, font: undefined });
});

it('starts each popup from the saved clock pattern and clears its temporary colour', () => {
  button('Close').click();
  state['background-pattern'] = 'grid';
  document.getElementById('share')!.click();
  const input = document.getElementById('share-preview-color') as HTMLInputElement;
  input.value = '#abcdef';
  input.dispatchEvent(new Event('input'));
  button('Close').click();
  document.getElementById('share')!.click();
  expect((document.getElementById('share-preview-pattern') as HTMLSelectElement).value).toBe('grid');
  expect(renderShareCard).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), undefined, undefined, {
    color: undefined,
    pattern: 'grid',
    font: 'default',
  });
});

it('changes fonts only for the image, includes custom families and clears the override on close', async () => {
  const originalUrl = location.href;
  const select = document.getElementById('share-preview-font') as HTMLSelectElement;
  expect([...select.options].some((option) => option.value === 'My Custom Font')).toBe(true);
  select.value = 'Lora';
  select.dispatchEvent(new Event('change'));
  await Promise.resolve();
  expect(selectedCardOptions().font).toBe('Lora');
  expect(renderShareCard).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.anything(),
    undefined,
    undefined,
    expect.objectContaining({ font: 'Lora' }),
  );
  expect(state.font).toBe('default');
  expect((document.getElementById('font-select') as HTMLSelectElement).value).toBe('default');
  expect(location.href).toBe(originalUrl);
  button('Close').click();
  expect(selectedCardOptions().font).toBeUndefined();
});

it('starts with the current custom font and disables families incompatible with the quote language', () => {
  button('Close').click();
  state.font = 'My Custom Font';
  state['active-quote'] = { ...(state['active-quote'] as object), locale: 'ar-AE' };
  document.getElementById('share')!.click();
  const select = document.getElementById('share-preview-font') as HTMLSelectElement;
  expect(select.value).toBe('My Custom Font');
  expect(select.querySelector<HTMLOptionElement>('option[value="Special Elite"]')!.disabled).toBe(true);
  expect(select.querySelector<HTMLOptionElement>('option[value="My Custom Font"]')!.disabled).toBe(false);
});

it('offers large circles as an independent image pattern', () => {
  const select = document.getElementById('share-preview-pattern') as HTMLSelectElement;
  select.value = 'circles';
  select.dispatchEvent(new Event('change'));
  expect(selectedCardOptions().pattern).toBe('circles');
  expect(state['background-pattern']).toBe('none');
});

it('copies the preview text even after the live quote changes', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  button('Close').click();
  document.getElementById('share')!.click();
  await vi.waitFor(() => expect(document.querySelector('.share-preview-image canvas')).not.toBeNull());
  state['active-quote'] = { quote_raw: 'New minute' };
  button('Copy quote').click();
  await vi.waitFor(() =>
    expect(document.querySelector('#share-preview [role="status"]')?.textContent).toBe('Quote copied!'),
  );
  expect(writeText).toHaveBeenCalledWith('Original quote');
  expect(document.querySelector('#share-preview [role="status"]')?.textContent).toBe('Quote copied!');
});

it.each(
  Object.entries({
    pink: '#ff89d8',
    green: '#2ecc71',
    orange: '#f39c12',
    purple: '#9b59b6',
    blue: '#2c97df',
    gray: '#808686',
  }),
)('selects the %s palette independently and resolves its dark appearance', (palette, color) => {
  const originalUrl = location.href;
  document.querySelector<HTMLButtonElement>(`#share-preview .color-swatch[data-palette-key="${palette}"]`)!.click();
  const picker = document.getElementById('share-preview-color') as HTMLInputElement;
  expect(picker.disabled).toBe(false);
  expect(picker.value).toBe(color);
  expect(selectedCardOptions()).toMatchObject({ palette, color: undefined });
  if (palette === 'gray') {
    button('Light').click();
    expect(picker.value).toBe('#808686');
    expect(document.querySelector<HTMLButtonElement>('#share-preview [data-palette-key="gray"]')!.dataset.color).toBe(
      picker.value,
    );
  }
  expect(state.palette).toBe('default');
  expect(state.color).toBe('#d24335');
  expect(location.href).toBe(originalUrl);
  picker.value = '#abcdef';
  picker.dispatchEvent(new Event('input'));
  expect(selectedCardOptions().color).toBe('#abcdef');
  expect(selectedCardOptions()).not.toHaveProperty('palette');
});

it('resets the image accent to the selected theme defaults without changing the clock custom color', () => {
  const originalUrl = location.href;
  while (document.querySelector('.share-theme-carousel span')!.textContent !== 'Base') button('Next theme').click();
  state['custom-color'] = '#abcdef';
  const picker = document.getElementById('share-preview-color') as HTMLInputElement;
  const reset = document.getElementById('share-preview-reset-color') as HTMLButtonElement;
  picker.value = '#123456';
  picker.dispatchEvent(new Event('input'));
  expect(reset.hidden).toBe(false);
  reset.click();
  expect(selectedCardOptions()).toMatchObject({ color: undefined, useDefaultColor: true });
  expect(reset.hidden).toBe(true);
  expect(state['custom-color']).toBe('#abcdef');
  expect(location.href).toBe(originalUrl);
  // With default mode active, a theme/appearance change follows that palette.
  while (document.querySelector('.share-theme-carousel span')!.textContent !== 'Book page')
    button('Next theme').click();
  button('Dark').click();
  expect(picker.value).toBe('#214cc6');
  button('Light').click();
  expect(picker.value).toBe('#fbf719');
  picker.value = '#123456';
  picker.dispatchEvent(new Event('input'));
  expect(selectedCardOptions().color).toBe('#123456');
  expect(selectedCardOptions()).not.toHaveProperty('useDefaultColor');
});

it('remembers image colors separately for each theme', () => {
  const picker = document.getElementById('share-preview-color') as HTMLInputElement;
  picker.value = '#123456';
  picker.dispatchEvent(new Event('input'));
  button('Next theme').click();
  expect(picker.value).toBe('#214cc6');
  document.querySelector<HTMLButtonElement>('#share-preview .color-swatch[data-color="#ff89d8"]')!.click();
  expect(selectedCardOptions()).toMatchObject({ palette: 'pink' });
  button('Previous theme').click();
  expect(picker.value).toBe('#123456');
  expect(selectedCardOptions().color).toBe('#123456');
  button('Next theme').click();
  expect(picker.value).toBe('#ff89d8');
  expect(selectedCardOptions()).toMatchObject({ palette: 'pink' });
  expect(state['custom-color']).toBe('');
});

it('opens with title focus and restores the launcher on close', () => {
  expect(document.activeElement).toBe(document.getElementById('share-preview-title'));
  document.querySelector<HTMLDialogElement>('#share-preview')!.close();
  expect(document.activeElement).toBe(document.getElementById('share'));
});

it('opens from the clock palette, resets it for the image and restores the clock palette on reopening', () => {
  button('Close').click();
  state.palette = 'blue';
  state.color = '#2c97df';
  document.documentElement.dataset.palette = 'blue';
  document.getElementById('share')!.click();
  expect(selectedCardOptions()).toMatchObject({ palette: 'blue' });
  button('Restore this theme’s default colour').click();
  expect(selectedCardOptions()).toMatchObject({ useDefaultColor: true });
  expect(selectedCardOptions()).not.toHaveProperty('palette');
  expect(state.palette).toBe('blue');
  button('Close').click();
  document.getElementById('share')!.click();
  expect(selectedCardOptions()).toMatchObject({ palette: 'blue' });
});

it('saves custom colors for other palettes and keeps the image accent when a swatch is deleted', () => {
  const picker = document.getElementById('share-preview-color') as HTMLInputElement;
  picker.value = '#123456';
  picker.dispatchEvent(new Event('input'));
  picker.dispatchEvent(new Event('change'));
  expect(JSON.parse(localStorage.getItem('custom-colors')!)).toContain('#123456');
  button('Close').click();
  document.getElementById('share')!.click();
  document.querySelector<HTMLButtonElement>('#share-preview .color-swatch[data-color="#123456"]')!.click();
  expect(selectedCardOptions().color).toBe('#123456');
  button('Manage colours').click();
  button('Remove colour #123456').click();
  expect(JSON.parse(localStorage.getItem('custom-colors')!)).not.toContain('#123456');
  expect(selectedCardOptions().color).toBe('#123456');
  expect(state.color).toBe('#d24335');
});

it('selects an image font through the preview picker without changing the clock font', () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
  const customization = document.querySelector<HTMLDetailsElement>('.share-customization')!;
  customization.open = true;
  document.getElementById('share-preview-font-trigger')!.click();
  document.querySelector<HTMLButtonElement>('#share-preview .font-picker-options button[data-value="Lora"]')!.click();
  expect(selectedCardOptions().font).toBe('Lora');
  expect(state.font).toBe('default');
  expect(document.querySelector<HTMLSelectElement>('#font-select')!.value).toBe('default');
  expect(document.getElementById('share-preview-font-trigger')!.textContent).toBe('Lora');
  document.querySelector<HTMLDialogElement>('#share-preview')!.close();
  expect(document.getElementById('share-preview-font-trigger')).toBeNull();
  vi.unstubAllGlobals();
});

it('names the default font for the image theme and keeps it updated when changing themes', async () => {
  const option = () => document.querySelector<HTMLOptionElement>('#share-preview-font option[value="default"]')!;
  expect(option().textContent).toBe('Default font (Special Elite)');
  expect(option().dataset.previewFont).toBe('Special Elite');
  button('Next theme').click();
  expect(option().textContent).toBe('Default font (Libre Baskerville)');
  expect(option().dataset.previewFont).toBe('Libre Baskerville');
  await Promise.resolve();
  expect(document.getElementById('share-preview-font-trigger')!.textContent).toBe('Default font (Libre Baskerville)');
  expect(selectedCardOptions().font).toBe('default');
  expect(state.font).toBe('default');
});

it('resolves the default image font from the passage language rather than the interface language', () => {
  button('Close').click();
  state['active-quote'] = { id: '1200-002', quote_raw: 'Russian quote', locale: 'ru-RU', time: '12:00' };
  document.getElementById('share')!.click();
  const option = document.querySelector<HTMLOptionElement>('#share-preview-font option[value="default"]')!;
  expect(option.textContent).toBe('Default font (Pangolin)');
  expect(option.dataset.previewFont).toBe('Pangolin');
  button('Next theme').click();
  expect(option.textContent).toBe('Default font (Literata)');
  expect(option.dataset.previewFont).toBe('Literata');
});

it.each([0, 1])('consumes the font tap compatibility click in the sharing popup (detail %s)', (detail) => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
  document.getElementById('share-preview-font-trigger')!.click();
  const option = document.querySelector<HTMLButtonElement>(
    '#share-preview .font-picker-options button[data-value="Lora"]',
  )!;
  const pointer = (type: string) => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: 50, clientY: 100 });
    Object.defineProperties(event, { pointerType: { value: 'touch' }, pointerId: { value: 1 } });
    return event;
  };
  option.dispatchEvent(pointer('pointerdown'));
  option.dispatchEvent(pointer('pointerup'));
  expect(selectedCardOptions().font).toBe('Lora');
  // Closing the menu and rendering the preview can move the underlying control.
  const underlying = button('Light');
  const ghost = new MouseEvent('click', { bubbles: true, cancelable: true, detail, clientX: 50, clientY: 200 });
  underlying.dispatchEvent(ghost);
  expect(ghost.defaultPrevented).toBe(true);
  expect(underlying.getAttribute('aria-pressed')).toBe('false');
  underlying.dispatchEvent(pointer('pointerdown'));
  underlying.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
  expect(underlying.getAttribute('aria-pressed')).toBe('true');
});

it('renders the image only when the selected font changes', () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
  const choose = (value: string) => {
    document.getElementById('share-preview-font-trigger')!.click();
    document
      .querySelector<HTMLButtonElement>(`#share-preview .font-picker-options button[data-value="${value}"]`)!
      .click();
    expect(document.getElementById('share-preview-font-trigger')!.getAttribute('aria-expanded')).toBe('false');
  };
  vi.mocked(renderShareCard).mockClear();
  choose('default');
  expect(renderShareCard).not.toHaveBeenCalled();
  choose('Lora');
  expect(renderShareCard).toHaveBeenCalledTimes(1);
  choose('Lora');
  choose('Lora');
  expect(renderShareCard).toHaveBeenCalledTimes(1);
  choose('Special Elite');
  expect(renderShareCard).toHaveBeenCalledTimes(2);
  choose('Lora');
  expect(renderShareCard).toHaveBeenCalledTimes(3);
});
