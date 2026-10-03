import { beforeEach, expect, it, vi } from 'vitest';
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
  state.locale = 'en-GB';
  state.quote = undefined;
  state['active-quote'] = { id: '1200-001', quote_raw: 'Original quote', locale: 'en-GB', time: '12:00' };
  document.documentElement.dataset.theme = 'base-dark';
  document.body.innerHTML = '<button id="download"></button>';
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
  vi.mocked(renderShareCard).mockImplementation(async () => document.createElement('canvas'));
  initShareOptions();
  document.getElementById('share-options')!.click();
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
