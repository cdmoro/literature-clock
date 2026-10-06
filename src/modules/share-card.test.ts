import { beforeEach, expect, it, vi } from 'vitest';
import html2canvas from 'html2canvas-pro';
import { loadGoogleFont } from '../utils/google-font';
import { renderShareCard } from './share-card';
import type { ResolvedQuote } from '../types';
const { state } = vi.hoisted(() => ({ state: { hideBookTitle: false } }));
vi.mock('../store', () => ({
  store: { get: (key: string) => (key === 'hide-book-title' ? state.hideBookTitle : 'none') },
}));
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
  state.hideBookTitle = false;
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
      expect(element.textContent).toContain('— Book, Writer');
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

it.each(['dots', 'circles', 'diagonal', 'diagonal-wide'] as const)(
  'uses a repeatable image for %s when rendering the exported card',
  async (pattern) => {
    document.documentElement.dataset.theme = 'base-dark';
    vi.mocked(html2canvas).mockImplementation(async (element) => {
      expect(element.style.backgroundImage).toContain('data:image/svg+xml,');
      expect(decodeURIComponent(element.style.backgroundImage)).toContain('opacity="0.12"');
      expect(element.style.backgroundSize).toMatch(/^\d+px \d+px$/);
      return document.createElement('canvas');
    });
    await renderShareCard(quote, 'square', undefined, undefined, { pattern });
  },
);

it.each([false, true])('matches web attribution when hide book title is %s', async (hidden) => {
  state.hideBookTitle = hidden;
  vi.mocked(html2canvas).mockImplementation(async (element) => {
    const credit = element.querySelector<HTMLElement>('.share-card-credit')!;
    expect(credit.textContent).toBe(hidden ? '— Writer' : '— Book, Writer');
    expect([...credit.querySelectorAll('span')].map((part) => part.textContent)).toEqual(
      hidden ? ['Writer'] : ['Book', 'Writer'],
    );
    for (const part of credit.querySelectorAll<HTMLElement>('span')) {
      expect(part.dir).toBe('auto');
      expect(part.style.unicodeBidi).toBe('isolate');
    }
    return document.createElement('canvas');
  });
  await renderShareCard(quote, 'square');
});

it('isolates mixed-script book and author names while preserving punctuation', async () => {
  vi.mocked(html2canvas).mockImplementation(async (element) => {
    const credit = element.querySelector('.share-card-credit')!;
    expect(credit.textContent).toBe('— كتاب عربي, Stanley R. Matthews');
    expect(credit.querySelectorAll('[dir="auto"]')).toHaveLength(2);
    return document.createElement('canvas');
  });
  await renderShareCard({ ...quote, locale: 'ar-AE', title: 'كتاب عربي', author: 'Stanley R. Matthews' }, 'square');
});

it('exports the shared noise asset at its native tile size', async () => {
  vi.mocked(html2canvas).mockImplementation(async (element) => {
    expect(element.style.backgroundImage).toContain('noise.png');
    expect(element.style.backgroundSize).toBe('256px 256px');
    return document.createElement('canvas');
  });
  await renderShareCard(quote, 'square', undefined, undefined, { pattern: 'noise' });
});

it.each(['square', 'portrait', 'landscape'] as const)(
  'keeps the Festive gradient underneath the exported pattern in %s',
  async (format) => {
    document.documentElement.dataset.theme = 'base-light';
    const original = getComputedStyle;
    const gradient = 'linear-gradient(to right top, rgb(250, 208, 196), rgb(255, 209, 255))';
    const computed = vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      if (element.classList.contains('background-pattern-surface')) {
        expect((element as HTMLElement).style.getPropertyValue('--background-image')).toBe('');
        return {
          color: 'rgb(47, 46, 44)',
          backgroundColor: 'rgb(250, 208, 196)',
          backgroundPosition: '0px 0px, 0px 0px',
          getPropertyValue: (name: string) => (name === '--background-image' ? gradient : ''),
        } as CSSStyleDeclaration;
      }
      return original(element);
    });
    // jsdom rejects combined URL/gradient values; capture what the browser renderer receives.
    const images: string[] = [];
    const repeats: string[] = [];
    const repeatSetter = vi
      .spyOn(CSSStyleDeclaration.prototype, 'backgroundRepeat', 'set')
      .mockImplementation((value) => {
        repeats.push(value);
      });
    const imageSetter = vi
      .spyOn(CSSStyleDeclaration.prototype, 'backgroundImage', 'set')
      .mockImplementation(function (value) {
        images.push(value);
      });
    vi.mocked(html2canvas).mockImplementation(async (element) => {
      expect(images.some((image) => image.includes('data:image/svg+xml,') && image.includes(gradient))).toBe(true);
      expect(element.style.backgroundSize).toBe('16px 16px, 100% 100%');
      expect(repeats).toContain('repeat, no-repeat');
      return document.createElement('canvas');
    });
    try {
      await renderShareCard(quote, format, 'light', 'festive', { pattern: 'dots' });
    } finally {
      computed.mockRestore();
      imageSetter.mockRestore();
      repeatSetter.mockRestore();
    }
  },
);
