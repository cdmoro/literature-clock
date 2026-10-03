import { beforeEach, expect, it, vi } from 'vitest';
import html2canvas from 'html2canvas-pro';
import { renderShareCard } from './share-card';
import type { ResolvedQuote } from '../types';
vi.mock('html2canvas-pro', () => ({ default: vi.fn() }));
const quote = {
  locale: 'es-ES',
  time: '12:00',
  quote_first: '&lt;script&gt;<br><em>Before</em>',
  quote_time_case: 'noon',
  quote_last: ' arrived',
  quote_raw: '<script>noon arrived',
  title: 'Book',
  author: 'Writer',
} as ResolvedQuote;
beforeEach(() => {
  document.body.innerHTML = '<blockquote id="quote"></blockquote>';
  vi.mocked(html2canvas).mockReset();
});
it.each([
  ['square', 1080, 1080],
  ['portrait', 1080, 1920],
  ['landscape', 1920, 1080],
] as const)(
  'exports %s independently of the viewport and safely preserves quote text',
  async (format, width, height) => {
    const canvas = document.createElement('canvas');
    vi.mocked(html2canvas).mockImplementation(async (element, options) => {
      expect(options).toMatchObject({ width, height, scale: 1 });
      expect(element.textContent).toContain('<script>Beforenoon arrived');
      expect(element.querySelector('script')).toBeNull();
      expect(element.querySelector('br')).not.toBeNull();
      expect(element.querySelector('em')?.textContent).toBe('Before');
      expect(element.textContent).toContain('Book — Writer');
      return canvas;
    });
    expect(await renderShareCard(quote, format)).toBe(canvas);
    expect(document.body.children).toHaveLength(1);
  },
);
it('removes the temporary card when rendering fails', async () => {
  vi.mocked(html2canvas).mockRejectedValue(new Error('render failed'));
  await expect(renderShareCard(quote, 'square')).rejects.toThrow('render failed');
  expect(document.body.children).toHaveLength(1);
});
it('grows unusually long quotes instead of clipping their content', async () => {
  const height = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(2000);
  vi.mocked(html2canvas).mockResolvedValue(document.createElement('canvas'));
  await renderShareCard(quote, 'square');
  expect(vi.mocked(html2canvas).mock.calls[0][1]?.height).toBe(2342);
  height.mockRestore();
});
