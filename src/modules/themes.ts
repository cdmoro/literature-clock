import { THEME_FONTS, resetFont } from './font';
import { doFitQuote, fitQuote, loadFontIfNotExists } from '../utils';
import { setDayParameters } from './dynamic';
import { store } from '../store';

function getRandomThemeColor() {
  let colors = Array.from(document.querySelectorAll<HTMLOptionElement>('#colors option')).map((op) => op.value);
  const [themePrefix] = (document.documentElement.dataset.theme || '').split('-');

  colors.pop();
  colors = colors.filter((color) => color !== themePrefix);

  return colors[Math.floor(Math.random() * colors.length)];
}

export function initTheme() {
  let [theme, variant = 'system'] = store.get('theme').split('-');
  const themeSelect = document.querySelector<HTMLSelectElement>('#theme-select');
  const variantSelect = document.querySelector<HTMLSelectElement>('#variant-select');
  const preferDarkThemes = window.matchMedia('(prefers-color-scheme: dark)');

  if (theme && THEME_FONTS[theme]) {
    THEME_FONTS[theme].forEach((font) => loadFontIfNotExists(font));
  }
  if (themeSelect) {
    themeSelect.value = theme;
  }
  if (variantSelect) {
    variantSelect.value = variant;
  }

  if (theme === 'color') {
    theme = getRandomThemeColor();
  }
  if (variant === 'system') {
    variant = preferDarkThemes.matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = `${theme}-${variant}`;

  window.addEventListener('resize', doFitQuote);
  themeSelect?.addEventListener('change', () => setTheme());
  variantSelect?.addEventListener('change', () => setTheme({ isVariantChange: true }));
  preferDarkThemes.addEventListener('change', (e) => {
    const [_, variant] = store.get('theme').split('-');

    if (variant === 'system') {
      const [theme] = store.get('theme').split('-');

      store.set('theme', `${theme}-system`);
      document.documentElement.dataset.theme = `${theme}-${e.matches ? 'dark' : 'light'}`;
    }
  });
}

export function setTheme({ isVariantChange = false } = {}) {
  const p = document.querySelector<HTMLParagraphElement>('blockquote p');

  if (p) {
    p.style.visibility = 'hidden';
  }

  let theme = document.querySelector<HTMLSelectElement>('#theme-select')?.value;
  let variant = document.querySelector<HTMLSelectElement>('#variant-select')?.value;

  if (theme && THEME_FONTS[theme]) {
    THEME_FONTS[theme].forEach((font) => {
      loadFontIfNotExists(font);
    });
    resetFont();
  }
  store.set('theme', `${theme}-${variant}`);

  if (theme === 'color') {
    theme = getRandomThemeColor();
  }

  if (variant === 'system') {
    variant = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  if (theme === 'dynamic') {
    setDayParameters();
  }

  if (theme === 'photo' && !isVariantChange) {
    setDynamicBackgroundPicture();
  }

  if (theme !== 'photo') {
    removeBackgroundImage();
  }

  document.documentElement.dataset.theme = `${theme}-${variant}`;
  fitQuote();

  if (p) {
    setTimeout(() => (p.style.visibility = 'visible'), 50);
  }
}

export function setDynamicBackgroundPicture() {
  const photoOverlay = document.getElementById('photo-overlay');
  const now = new Date();
  const quote = store.get('resolved-quote');
  const seed = `${now.getFullYear()}${now.getMonth() + 1}${now.getDay()}${quote?.id}${quote?.locale}`;
  let innerHeight = window.innerHeight;
  let innerWidth = window.innerWidth;

  if (innerHeight > 5000) {
    innerHeight = 5000;
  }

  if (innerWidth > 5000) {
    innerWidth = 5000;
  }

  if (photoOverlay && !document.body.style.backgroundImage.includes(seed)) {
    photoOverlay.style.opacity = '1';

    setTimeout(() => {
      if (store.get('theme').includes('photo-')) {
        photoOverlay.style.removeProperty('opacity');
        document.documentElement.style.setProperty(
          '--background-image',
          `url(https://picsum.photos/seed/${seed}/${innerWidth}/${innerHeight}?blur=1)`,
        );
      }
    }, 1000);
  }
}

export function removeBackgroundImage() {
  document.documentElement.style.removeProperty('--background-image');
}
