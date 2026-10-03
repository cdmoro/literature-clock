import { beforeEach, expect, it, vi } from 'vitest';
import { shareQuote } from './share';
import { renderShareCard } from './share-card';
const { state } = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock('../store', () => ({ store: { get: (key: string) => state[key] } }));
vi.mock('../utils', () => ({ getTime: () => '12:00' }));
vi.mock('./locales', () => ({ getBaseLocale: () => 'en-GB' }));
vi.mock('./share-card', () => ({ renderShareCard: vi.fn() }));
beforeEach(() => {
  vi.mocked(renderShareCard).mockReset();
  vi.mocked(renderShareCard).mockResolvedValue({
    toBlob: (callback: BlobCallback) => callback(new Blob(['image'], { type: 'image/png' })),
  } as HTMLCanvasElement);
  Object.keys(state).forEach((key) => delete state[key]);
  state.locale = 'en-GB';
  state['active-quote'] = {
    id: '1200-001',
    time: '12:00',
    locale: 'es-ES',
    quote_raw: 'Quote',
    title: 'Book',
    author: 'Writer',
  };
  document.body.innerHTML = '';
  history.replaceState({}, '', '/');
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});
it('copies the exact URL when native sharing is unavailable', async () => {
  await shareQuote();
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('quote-id=1200-001'));
  expect(document.getElementById('quote-notice')?.textContent).toBe('Link copied');
});
it('falls back to text and URL when file sharing is unavailable', async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { share });
  await shareQuote();
  expect(share).toHaveBeenCalledWith({ text: 'Quote — Book, Writer', url: expect.stringContaining('locale=es-ES') });
});
it('reports clipboard failures rather than claiming the link was copied', async () => {
  vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('denied'));
  await shareQuote();
  expect(document.getElementById('quote-notice')?.textContent).toContain('Could not share');
});
it('treats cancelling the share sheet as a normal action', async () => {
  vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')) });
  await shareQuote();
  expect(document.getElementById('quote-notice')).toBeNull();
});

it('shares the image and link without duplicating the quote as text', async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  const canShare = vi.fn().mockReturnValue(true);
  vi.stubGlobal('navigator', { share, canShare });
  await shareQuote();
  const data = share.mock.calls[0][0];
  expect(data).toEqual({ url: expect.stringContaining('quote-id=1200-001'), files: [expect.any(File)] });
  expect(data.files[0].type).toBe('image/png');
  expect(canShare).toHaveBeenCalledWith(data);
});
it('retains the text alternative when image sharing is rejected', async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { share, canShare: vi.fn().mockReturnValue(false) });
  await shareQuote();
  expect(share).toHaveBeenCalledWith({
    text: 'Quote — Book, Writer',
    url: expect.stringContaining('quote-id=1200-001'),
  });
});
it('retains the text alternative if image generation fails', async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { share, canShare: vi.fn().mockReturnValue(true) });
  vi.mocked(renderShareCard).mockRejectedValue(new Error('render failed'));
  await shareQuote();
  expect(share).toHaveBeenCalledWith({
    text: 'Quote — Book, Writer',
    url: expect.stringContaining('quote-id=1200-001'),
  });
});
