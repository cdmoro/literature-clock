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
  expect(customization.querySelector('summary')?.textContent).toBe('Theme / Font');
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
  expect(renderShareCard).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.anything(),
    expect.anything(),
    expect.anything(),
    { color: '#123456', pattern: 'dots', font: 'default' },
  );
  expect(state.color).toBe('#d24335');
  expect(state['background-pattern']).toBe('none');
  expect(location.href).toBe(originalUrl);
  expect(document.documentElement.dataset.theme).toBe('base-dark');
  button('Next theme').click();
  expect(select.disabled).toBe(true);
  expect(select.closest('label')!.hidden).toBe(true);
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
  expect(renderShareCard).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.anything(),
    expect.anything(),
    expect.anything(),
    { color: undefined, pattern: 'grid', font: 'default' },
  );
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
    expect.anything(),
    expect.anything(),
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
    gray: '#f1f1f1',
  }),
)('disables the share picker for %s with its palette color', (theme, accent) => {
  button('Close').click();
  document.documentElement.dataset.theme = `${theme}-dark`;
  document
    .querySelector('#theme-select')!
    .insertAdjacentHTML('beforeend', `<option value="${theme}">${theme}</option>`);
  state['custom-color'] = '#123456';
  document.getElementById('share')!.click();
  while (document.querySelector('.share-theme-carousel span')!.textContent !== theme) button('Next theme').click();
  button('Dark').click();
  const picker = document.getElementById('share-preview-color') as HTMLInputElement;
  expect(picker.disabled).toBe(true);
  expect(document.getElementById('share-preview-reset-color')!.hidden).toBe(true);
  expect(picker.value).toBe(accent);
  picker.value = '#abcdef';
  picker.dispatchEvent(new Event('input'));
  expect(selectedCardOptions().color).toBeUndefined();
  if (theme === 'gray') {
    button('Light').click();
    expect(picker.value).toBe('#808686');
  }
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

it('retains the image custom accent across fixed palettes and restores editing on return', () => {
  button('Close').click();
  document.querySelector('#theme-select')!.insertAdjacentHTML('beforeend', '<option value="pink">Pink</option>');
  document.getElementById('share')!.click();
  while (document.querySelector('.share-theme-carousel span')!.textContent !== 'Base') button('Next theme').click();
  const picker = document.getElementById('share-preview-color') as HTMLInputElement;
  picker.value = '#123456';
  picker.dispatchEvent(new Event('input'));
  button('Previous theme').click();
  expect(picker.disabled).toBe(true);
  expect(picker.value).toBe('#ff89d8');
  expect(selectedCardOptions().color).toBeUndefined();
  button('Next theme').click();
  expect(picker.disabled).toBe(false);
  expect(picker.value).toBe('#123456');
  expect(selectedCardOptions().color).toBe('#123456');
  expect(state['custom-color']).toBe('');
});

it('opens with title focus and restores the launcher on close', () => {
  expect(document.activeElement).toBe(document.getElementById('share-preview-title'));
  document.querySelector<HTMLDialogElement>('#share-preview')!.close();
  expect(document.activeElement).toBe(document.getElementById('share'));
});
