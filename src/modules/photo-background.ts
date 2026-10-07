import QUERIES from '../photo-providers.json';
import { store } from '../store';
import SETTINGS from '../strings/settings.json';
import { getBaseLocale, getInterfaceLocale } from './locales';

export const PHOTO_CATEGORIES = ['all', 'galaxies', 'nebulae', 'earth', 'moon'] as const;
interface Photo {
  url: string;
  title: string;
  credit: string;
  source: string;
}
const catalogues = new Map<string, { expires: number; photos: Photo[] }>();
export async function nasaPhoto(category: string, minute: number): Promise<Photo> {
  const topics = Object.keys(QUERIES).sort() as (keyof typeof QUERIES)[];
  const topic = category in QUERIES ? (category as keyof typeof QUERIES) : topics[Math.abs(minute % topics.length)];
  let cached = catalogues.get(topic);
  if (!cached || cached.expires <= Date.now()) {
    const params = new URLSearchParams({ q: QUERIES[topic], media_type: 'image', page_size: '100' });
    const response = await fetch(`https://images-api.nasa.gov/search?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('NASA unavailable');
    const body = await response.json();
    const photos: Photo[] = [];
    for (const item of body.collection?.items || []) {
      const data = item.data?.[0];
      if (!data?.nasa_id || /copyright/i.test(data.description || '')) continue;
      const links = (item.links || []).filter(
        (link: { href?: string; render?: string }) =>
          link.render === 'image' &&
          typeof link.href === 'string' &&
          link.href.startsWith('https://images-assets.nasa.gov/'),
      );
      const link =
        links.find((link: { href: string }) => link.href.includes('~medium.')) ||
        links.find((link: { rel?: string }) => link.rel === 'preview');
      if (!link) continue;
      const credit = data.secondary_creator || data.photographer || 'NASA';
      photos.push({
        url: link.href,
        title: data.title || data.nasa_id,
        credit: credit.includes('NASA') ? credit : `NASA / ${credit}`,
        source: `https://images.nasa.gov/details/${encodeURIComponent(data.nasa_id)}`,
      });
    }
    if (!photos.length) throw new Error('NASA returned no images');
    cached = { expires: Date.now() + 3600000, photos };
    catalogues.set(topic, cached);
  }
  const position = category in QUERIES ? minute : Math.floor(minute / topics.length);
  return cached.photos[((position % cached.photos.length) + cached.photos.length) % cached.photos.length];
}
let request = 0;
let requestedKey = '';
let pending: HTMLImageElement | undefined;
let timeout: ReturnType<typeof setTimeout> | undefined;

export function clearPhotoBackground() {
  request++;
  requestedKey = '';
  if (timeout) clearTimeout(timeout);
  if (pending) {
    pending.onload = null;
    pending.onerror = null;
    pending.src = '';
    pending = undefined;
  }
  document.documentElement.style.removeProperty('--background-image');
  document.getElementById('photo-credit')?.remove();
}

export async function updatePhotoBackground() {
  if (store.get('theme').split('-')[0] !== 'photo') return;
  const minute = Math.floor(Date.now() / 60000);
  const provider = store.get('photo-provider') || 'picsum';
  const category = store.get('photo-category') || 'all';
  const key = `${provider}/${category}/${minute}`;
  if (requestedKey === key) return;
  requestedKey = key;
  const token = ++request;
  if (timeout) clearTimeout(timeout);
  if (pending) {
    pending.onload = null;
    pending.onerror = null;
    pending.src = '';
  }
  let photo: Photo | undefined;
  try {
    if (provider === 'nasa') photo = await nasaPhoto(category, minute);
  } catch {
    return;
  }
  if (token !== request || store.get('theme').split('-')[0] !== 'photo') return;
  const width = Math.max(320, Math.min(2560, window.innerWidth));
  const height = Math.max(240, Math.min(1440, window.innerHeight));
  const url = photo?.url || `https://picsum.photos/seed/literature-clock-${minute}/${width}/${height}?blur=1`;
  const image = new Image();
  pending = image;
  const finish = () => {
    if (token !== request) return;
    if (timeout) clearTimeout(timeout);
    pending = undefined;
    image.onload = null;
    image.onerror = null;
  };
  image.onload = () => {
    if (token !== request || store.get('theme').split('-')[0] !== 'photo') return;
    finish();
    document.documentElement.style.setProperty('--background-image', `url("${url}")`);
    document.getElementById('photo-credit')?.remove();
    if (photo) {
      const credit = document.createElement('a');
      credit.id = 'photo-credit';
      credit.textContent = photo.credit;
      credit.href = photo.source;
      credit.title = photo.title;
      credit.target = '_blank';
      credit.rel = 'noopener noreferrer';
      document.body.append(credit);
    }
  };
  image.onerror = finish; // Retain the last successful photo and its credit.
  timeout = setTimeout(() => {
    finish();
    image.src = '';
  }, 15000);
  image.src = url;
}

export function initPhotoSettings(dialog: HTMLDialogElement) {
  const rows = document.createElement('div');
  rows.id = 'photo-settings';
  rows.innerHTML = `<div class="settings-row"><label for="photo-provider" data-text="settings_photo_provider"></label><select id="photo-provider"><option value="picsum">Picsum</option><option value="nasa">NASA</option></select></div>
    <div class="settings-row"><label for="photo-category" data-text="settings_photo_category"></label><select id="photo-category">${PHOTO_CATEGORIES.map((category) => `<option value="${category}" data-text="settings_photo_${category}"></option>`).join('')}</select></div>`;
  dialog.querySelector('.settings-theme-picker')!.after(rows);
  const provider = rows.querySelector<HTMLSelectElement>('#photo-provider')!;
  const category = rows.querySelector<HTMLSelectElement>('#photo-category')!;
  provider.addEventListener('change', () => store.set('photo-provider', provider.value as 'picsum' | 'nasa'));
  category.addEventListener('change', () =>
    store.set('photo-category', category.value as (typeof PHOTO_CATEGORIES)[number]),
  );
  const refresh = () => {
    const labels = SETTINGS[getBaseLocale(getInterfaceLocale())];
    rows.querySelectorAll<HTMLElement>('[data-text]').forEach((element) => {
      element.textContent = labels[element.dataset.text as keyof typeof labels];
    });
    rows.hidden = store.get('theme').split('-')[0] !== 'photo';
    provider.value = store.get('photo-provider');
    category.value = store.get('photo-category');
    category.closest<HTMLElement>('.settings-row')!.hidden = provider.value !== 'nasa';
  };
  store.subscribe((state, old) => {
    refresh();
    if (
      state.theme !== old.theme ||
      state['photo-provider'] !== old['photo-provider'] ||
      state['photo-category'] !== old['photo-category']
    ) {
      if (state.theme.split('-')[0] !== 'photo') clearPhotoBackground();
      else updatePhotoBackground();
    }
  });
  refresh();
}
