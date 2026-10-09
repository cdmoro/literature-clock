import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QUERIES from '../photo-providers.json';
import { createStore, store } from '../store';
import {
  clearPhotoBackground,
  nasaPhoto,
  commonsPhoto,
  initPhotoSettings,
  updatePhotoBackground,
} from './photo-background';

const body = (id = 'test') => ({
  collection: {
    items: [
      {
        data: [{ nasa_id: id, title: 'Nebula', secondary_creator: 'NASA/ESA' }],
        links: [
          { href: `https://images-assets.nasa.gov/image/${id}/${id}~medium.jpg`, render: 'image', rel: 'alternate' },
        ],
      },
      {
        data: [{ nasa_id: 'copyright', description: 'Copyright protected' }],
        links: [{ href: 'https://images-assets.nasa.gov/image/blocked.jpg', render: 'image', rel: 'preview' }],
      },
    ],
  },
});
const images: HTMLImageElement[] = [];
beforeEach(() => {
  localStorage.clear();
  history.replaceState({}, '', '/');
  createStore();
  store.set('theme', 'photo-dark');
  vi.stubGlobal(
    'Image',
    class {
      src = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {
        images.push(this as unknown as HTMLImageElement);
      }
    },
  );
  images.length = 0;
});
afterEach(() => {
  clearPhotoBackground();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('NASA backgrounds', () => {
  it('queries the selected category without keys, reuses results, and excludes copyrighted entries', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => body() });
    vi.stubGlobal('fetch', fetch);
    const first = await nasaPhoto('nebulae', 1);
    const second = await nasaPhoto('nebulae', 2);
    expect(first).toEqual(second);
    expect(first.credit).toBe('NASA/ESA');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toContain('q=nebula');
    expect(fetch.mock.calls[0][0]).not.toContain('api_key');
  });
  it('advances within each category in All and refreshes an expired catalogue', async () => {
    const catalogue = body('first');
    catalogue.collection.items.push(body('second').collection.items[0]);
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => catalogue });
    vi.stubGlobal('fetch', fetch);
    const first = await nasaPhoto('all', 0);
    const next = await nasaPhoto('all', Object.keys(QUERIES.nasa).length);
    expect(first.url).not.toBe(next.url);
    expect(fetch).toHaveBeenCalledTimes(1);
    const later = Date.now() + 3600001;
    vi.spyOn(Date, 'now').mockReturnValue(later);
    await nasaPhoto('all', Object.keys(QUERIES.nasa).length * 2);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('retains the last successful image and credit on download failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => body() }));
    store.set('photo-provider', 'nasa');
    store.set('photo-category', 'galaxies');
    await updatePhotoBackground();
    images[0].onload!(new Event('load'));
    const background = document.documentElement.style.getPropertyValue('--background-image');
    expect(document.getElementById('photo-credit')?.textContent).toBe('NASA/ESA');
    store.set('photo-provider', 'picsum');
    await updatePhotoBackground();
    images[1].onerror!(new Event('error'));
    expect(document.documentElement.style.getPropertyValue('--background-image')).toBe(background);
    expect(document.getElementById('photo-credit')?.textContent).toBe('NASA/ESA');
  });
  it('ignores an older NASA response after leaving Photo', async () => {
    let resolve!: (value: unknown) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise((done) => {
          resolve = done;
        }),
      ),
    );
    store.set('photo-provider', 'nasa');
    store.set('photo-category', 'moon');
    const loading = updatePhotoBackground();
    store.set('theme', 'base-dark');
    clearPhotoBackground();
    resolve({ ok: true, json: async () => body() });
    await loading;
    expect(images).toHaveLength(0);
    expect(document.getElementById('photo-credit')).toBeNull();
  });
});

const commonsBody = () => ({
  query: {
    pages: [
      {
        title: 'File:Landscape.jpg',
        imageinfo: [
          {
            mime: 'image/jpeg',
            thumburl: 'https://thumb.wikimedia.org/landscape.jpg',
            descriptionurl: 'https://commons.wikimedia.org/wiki/File:Landscape.jpg',
            extmetadata: {
              LicenseShortName: { value: 'CC0' },
              AttributionRequired: { value: 'false' },
              Artist: { value: '<a href="https://example.org">A &amp; B</a>' },
            },
          },
        ],
      },
      {
        title: 'File:Restricted.jpg',
        imageinfo: [
          {
            mime: 'image/jpeg',
            thumburl: 'https://thumb.wikimedia.org/restricted.jpg',
            descriptionurl: 'https://commons.wikimedia.org/wiki/File:Restricted.jpg',
            extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: 'Someone' } },
          },
        ],
      },
    ],
  },
});
describe('Commons backgrounds and joined selectors', () => {
  it('searches automatically, retains plain credits and accepts only CC0 images', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => commonsBody() });
    vi.stubGlobal('fetch', fetch);
    const first = await commonsPhoto('landscapes', 1);
    const second = await commonsPhoto('landscapes', 2);
    expect(first.url).toBe('https://thumb.wikimedia.org/landscape.jpg');
    expect(first.credit).toBe('A & B / Wikimedia Commons / CC0');
    expect(second).toEqual(first);
    expect(fetch).toHaveBeenCalledTimes(1);
    const params = new URL(fetch.mock.calls[0][0]).searchParams;
    expect(params.get('gsrsearch')).toContain('landscape');
    expect(params.get('origin')).toBe('*');
  });
  it('joins provider/category and shows only the active provider categories', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const dialog = document.createElement('dialog');
    dialog.innerHTML = '<div class="settings-theme-picker"></div>';
    document.body.append(dialog);
    initPhotoSettings(dialog);
    const provider = dialog.querySelector<HTMLSelectElement>('#photo-provider')!;
    const category = dialog.querySelector<HTMLSelectElement>('#photo-category')!;
    expect(category.parentElement).toBe(provider.parentElement);
    expect(category.hidden).toBe(true);
    provider.value = 'commons';
    provider.dispatchEvent(new Event('change'));
    expect(category.hidden).toBe(false);
    expect([...category.options].map((option) => option.value)).toEqual(['all', ...Object.keys(QUERIES.commons)]);
    category.value = 'animals';
    category.dispatchEvent(new Event('change'));
    expect(store.get('photo-category')).toBe('animals');
    provider.value = 'nasa';
    provider.dispatchEvent(new Event('change'));
    expect(category.value).toBe('all');
    expect([...category.options].some((option) => option.value === 'moon')).toBe(true);
    expect(category.getAttribute('aria-label')).toBe('Photo category');
    dialog.remove();
  });
});
