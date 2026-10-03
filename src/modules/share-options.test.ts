import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { initShareOptions } from './share-options';
import { renderShareCard } from './share-card';
import { shareQuote, downloadQuote } from './share';
const { state } = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock('../store', () => ({ store: { get: (key: string) => state[key], subscribe: vi.fn() } }));
vi.mock('./locales', () => ({ getBaseLocale: () => 'en-GB' }));
vi.mock('./share', () => ({
  shareQuote: vi.fn().mockResolvedValue(undefined),
  downloadQuote: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./share-card', () => ({ renderShareCard: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  state.locale = 'en-GB';
  state.quote = undefined;
  state['active-quote'] = { id: '1200-001', quote_raw: 'Original quote', locale: 'en-GB', time: '12:00' };
  document.documentElement.dataset.theme = 'base-dark';
  document.body.innerHTML =
    '<button id="share"><svg id="existing-share-icon"></svg></button><button id="download"></button><select id="theme-select"><option value="base">Base</option><option value="book">Book page</option></select>';
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

it('cycles image themes in both directions without changing the live theme', async () => {
  button('Next theme').click();
  await Promise.resolve();
  expect(document.querySelector('.share-theme-carousel span')?.textContent).toBe('Book page');
  expect(vi.mocked(renderShareCard).mock.calls[vi.mocked(renderShareCard).mock.calls.length - 1]?.[3]).toBe('book');
  button('Previous theme').click();
  expect(document.querySelector('.share-theme-carousel span')?.textContent).toBe('Base');
  expect(document.documentElement.dataset.theme).toBe('base-dark');
});
