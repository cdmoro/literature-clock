import QUERIES from '../photo-providers.json';
import { store } from '../store';
import SETTINGS from '../strings/settings.json';
import { getBaseLocale, getInterfaceLocale } from './locales';

export function photoCategories(provider: string) {
  const queries = provider === 'commons' ? QUERIES.commons : provider === 'nasa' ? QUERIES.nasa : {};
  return ['all', ...Object.keys(queries)];
}
interface Photo {
  url: string;
  title: string;
  credit: string;
  source: string;
}
const catalogues = new Map<string, { expires: number; photos: Photo[] }>();
export async function nasaPhoto(category: string, minute: number): Promise<Photo> {
  const queries = QUERIES.nasa;
  const topics = Object.keys(queries).sort() as (keyof typeof queries)[];
  const topic = category in queries ? (category as keyof typeof queries) : topics[Math.abs(minute % topics.length)];
  let cached = catalogues.get(`nasa/${topic}`);
  if (!cached || cached.expires <= Date.now()) {
    const params = new URLSearchParams({ q: queries[topic], media_type: 'image', page_size: '100' });
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
    catalogues.set(`nasa/${topic}`, cached);
  }
  const position = category in queries ? minute : Math.floor(minute / topics.length);
  return cached.photos[((position % cached.photos.length) + cached.photos.length) % cached.photos.length];
}
export async function commonsPhoto(category: string, minute: number): Promise<Photo> {
  const queries = QUERIES.commons;
  const topics = Object.keys(queries).sort() as (keyof typeof queries)[];
  const topic = category in queries ? (category as keyof typeof queries) : topics[Math.abs(minute % topics.length)];
  const key = `commons/${topic}`;
  let cached = catalogues.get(key);
  if (!cached || cached.expires <= Date.now()) {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      origin: '*',
      generator: 'search',
      gsrsearch: queries[topic],
      gsrnamespace: '6',
      gsrlimit: '50',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata|mime',
      iiurlwidth: '1280',
    });
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Commons unavailable');
    const body = await response.json();
    const photos: Photo[] = [];
    for (const page of body.query?.pages || []) {
      const info = page.imageinfo?.[0];
      const metadata = info?.extmetadata;
      const license = metadata?.LicenseShortName?.value;
      if (!/^CC0(?: 1\.0(?: Universal)?)?$/i.test(license || '') || metadata?.AttributionRequired?.value === 'true')
        continue;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(info.mime)) continue;
      const url = info.thumburl;
      const source = info.descriptionurl;
      if (
        typeof url !== 'string' ||
        !/^https:\/\/(?:upload|thumb)\.wikimedia\.org\//.test(url) ||
        typeof source !== 'string' ||
        !source.startsWith('https://commons.wikimedia.org/')
      )
        continue;
      const document = new DOMParser().parseFromString(metadata.Artist?.value || '', 'text/html');
      const author = document.body.textContent?.trim() || 'Wikimedia Commons';
      photos.push({
        url,
        source,
        title: page.title.replace(/^File:/, ''),
        credit: `${author} / Wikimedia Commons / ${license}`,
      });
    }
    if (!photos.length) throw new Error('Commons returned no CC0 images');
    cached = { expires: Date.now() + 3600000, photos };
    catalogues.set(key, cached);
  }
  const position = category in queries ? minute : Math.floor(minute / topics.length);
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
    else if (provider === 'commons') photo = await commonsPhoto(category, minute);
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
  rows.className = 'settings-row';
  rows.innerHTML = `<label for="photo-provider" data-text="settings_photo_provider"></label>
    <div class="input-group photo-selectors"><select id="photo-provider"><option value="picsum">Picsum</option><option value="nasa">NASA</option><option value="commons">Wikimedia Commons</option></select><select id="photo-category"></select></div>`;
  dialog.querySelector('.settings-theme-picker')!.after(rows);
  const provider = rows.querySelector<HTMLSelectElement>('#photo-provider')!;
  const category = rows.querySelector<HTMLSelectElement>('#photo-category')!;
  provider.addEventListener('change', () =>
    store.set('photo-provider', provider.value as 'picsum' | 'nasa' | 'commons'),
  );
  category.addEventListener('change', () =>
    store.set('photo-category', category.value as ReturnType<typeof store.get<'photo-category'>>),
  );
  const refresh = () => {
    const labels = SETTINGS[getBaseLocale(getInterfaceLocale())];
    rows.querySelectorAll<HTMLElement>('[data-text]').forEach((element) => {
      element.textContent = labels[element.dataset.text as keyof typeof labels];
    });
    rows.hidden = store.get('theme').split('-')[0] !== 'photo';
    provider.value = store.get('photo-provider');
    const categories = photoCategories(provider.value);
    if (category.dataset.provider !== provider.value) {
      category.replaceChildren(
        ...categories.map((value) => {
          const option = document.createElement('option');
          option.value = value;
          option.dataset.text = `settings_photo_${value}`;
          return option;
        }),
      );
      category.dataset.provider = provider.value;
    }
    for (const option of category.options) option.textContent = labels[option.dataset.text as keyof typeof labels];
    category.setAttribute('aria-label', labels.settings_photo_category);
    category.value = categories.includes(store.get('photo-category')) ? store.get('photo-category') : 'all';
    category.hidden = provider.value === 'picsum';
    rows.querySelector('.photo-selectors')!.classList.toggle('has-category', !category.hidden);
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
