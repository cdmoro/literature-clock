import { beforeEach, expect, it, vi } from 'vitest';
import html2canvas from 'html2canvas-pro';
import { loadGoogleFont } from '../utils/google-font';
import { renderShareCard } from './share-card';
import type { ResolvedQuote } from '../types';
vi.mock('../store', () => ({ store: { get: () => 'none' } }));
vi.mock('../utils/google-font', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/google-font')>()),
  loadGoogleFont: vi.fn().mockResolvedValue(undefined),
}));
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
  vi.mocked(loadGoogleFont).mockReset().mockResolvedValue(undefined);
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

it('resolves preview colour and pattern on an isolated palette and exports its tile dimensions', async () => {
  document.documentElement.dataset.theme = 'base-light';
  const liveStyle = document.documentElement.getAttribute('style');
  const original = getComputedStyle;
  const computed = vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
    if (element.classList.contains('background-pattern-surface')) {
      expect((element as HTMLElement).dataset.backgroundPattern).toBe('grid');
      expect((element as HTMLElement).style.getPropertyValue('--accent-color')).toBe('#123456');
      return {
        color: 'rgb(47, 46, 44)',
        backgroundColor: 'rgb(240, 240, 240)',
        backgroundImage: 'url("/pattern.png")',
        backgroundSize: '24px 24px',
        backgroundPosition: '0px 0px',
        getPropertyValue: (name: string) => (name === '--accent-color' ? '#123456' : 'serif'),
      } as CSSStyleDeclaration;
    }
    return original(element);
  });
  vi.mocked(html2canvas).mockImplementation(async (element) => {
    expect(element.style.backgroundSize).toBe('24px 24px');
    expect(element.style.backgroundImage).toContain('/pattern.png');
    expect(element.firstElementChild?.getAttribute('style')).toContain('rgb(18, 52, 86)');
    return document.createElement('canvas');
  });
  await renderShareCard(quote, 'square', undefined, undefined, { color: '#123456', pattern: 'grid' });
  expect(document.documentElement.getAttribute('style')).toBe(liveStyle);
  expect(document.documentElement.dataset.theme).toBe('base-light');
  computed.mockRestore();
});

it('loads the chosen image font and exports it without changing the live font', async () => {
  const liveFamily = document.getElementById('quote')!.style.fontFamily;
  vi.mocked(html2canvas).mockImplementation(async (element) => {
    expect(element.style.fontFamily).toContain('Lora');
    return document.createElement('canvas');
  });
  await renderShareCard(quote, 'square', undefined, undefined, { font: 'Lora' });
  expect(loadGoogleFont).toHaveBeenCalledWith('Lora');
  expect(document.getElementById('quote')!.style.fontFamily).toBe(liveFamily);
});

it('uses the theme fallback when a custom image font cannot load', async () => {
  vi.mocked(loadGoogleFont).mockRejectedValue(new Error('unavailable'));
  vi.mocked(html2canvas).mockImplementation(async (element) => {
    expect(element.style.fontFamily).not.toContain('Unavailable Family');
    return document.createElement('canvas');
  });
  await renderShareCard(quote, 'square', undefined, undefined, { font: 'Unavailable Family' });
  expect(loadGoogleFont).toHaveBeenCalledWith('Unavailable Family');
});

it('rejects a known incompatible font when rendering an Arabic quote', async () => {
  vi.mocked(html2canvas).mockImplementation(async (element) => {
    expect(element.style.fontFamily).not.toContain('Special Elite');
    return document.createElement('canvas');
  });
  await renderShareCard({ ...quote, locale: 'ar-AE' }, 'square', undefined, undefined, { font: 'Special Elite' });
  expect(loadGoogleFont).not.toHaveBeenCalledWith('Special Elite');
});
