import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore, store } from '../store';
import { clearPhotoBackground, nasaPhoto, updatePhotoBackground } from './photo-background';

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
    const next = await nasaPhoto('all', 4);
    expect(first.url).not.toBe(next.url);
    expect(fetch).toHaveBeenCalledTimes(1);
    const later = Date.now() + 3600001;
    vi.spyOn(Date, 'now').mockReturnValue(later);
    await nasaPhoto('all', 8);
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
