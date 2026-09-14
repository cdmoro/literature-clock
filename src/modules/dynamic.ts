import { Moon } from 'lunarphase-js';
import { store } from '../store';


export function getDayProgress() {
  const now = new Date();
  const seconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const progress = (seconds * 100) / 86400;

  const override = parseFloat(store.get('progress') || '');
  return Number.isFinite(override) ? Math.max(0, Math.min(100, override)) : parseFloat(progress.toFixed(2));
}

export function getDayParameters() {
  const progress = getDayProgress();
  /**
   * Scenes
   * @example
   * 09pm-05am: night
   * 05am-12pm: morning
   * 12pm-05pm: afternoon
   * 05pm-09pm: evening
   */
  let scene = 'night';
  if (progress >= 20.83 && progress <= 50) {
    scene = 'morning';
  } else if (progress > 50 && progress <= 70.83) {
    scene = 'afternoon';
  } else if (progress > 70.83 && progress <= 87.5) {
    scene = 'evening';
  }

  /**
   * Segments of the day
   * @example
   * 00am-03am: 1
   * 03am-06am: 2
   * 06am-09am: 3
   * 09am-12pm: 4
   * 12pm-15pm: 5
   * 15pm-18pm: 6
   * 18pm-21pm: 7
   * 21pm-00am: 8
   */
  const segment = Math.round((progress * 8) / 100);

  const period = progress < 50 ? 'am' : 'pm';

  return {
    scene: store.get('scene') || scene,
    progress,
    period,
    segment,
  };
}

// Fixed local solar hours keep the experience private and predictable without geolocation.
const SKY = [
  [0, '#0b1429', '#18243e', '#29334b'],
  [4, '#111c35', '#303951', '#665064'],
  [5.5, '#68768e', '#bd9b9b', '#f1c5a0'],
  [7.5, '#86abc6', '#c3d6dc', '#f3dfbb'],
  [12, '#699dbf', '#b2d1df', '#e4e9da'],
  [16, '#839fba', '#c7cbd0', '#efd4b0'],
  [18, '#696d91', '#bd8f98', '#efb18c'],
  [19.5, '#303c60', '#726080', '#ba7e82'],
  [21, '#111c35', '#283452', '#53415d'],
  [24, '#0b1429', '#18243e', '#29334b'],
] as const;

const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

export function getSkyParameters(progress: number) {
  const hour = (((progress % 100) + 100) % 100) * 0.24;
  const index = SKY.findIndex((stop) => stop[0] > hour);
  const from = SKY[index - 1];
  const to = SKY[index];
  const blend = smooth((hour - from[0]) / (to[0] - from[0]));
  const colors = [1, 2, 3].map((channel) => {
    const a = from[channel] as string;
    const b = to[channel] as string;
    return `rgb(${[1, 3, 5].map((offset) => {
      const start = parseInt(a.slice(offset, offset + 2), 16);
      const end = parseInt(b.slice(offset, offset + 2), 16);
      return (start + (end - start) * blend).toFixed(2);
    }).join(', ')})`;
  });
  const daylight = smooth((hour - 5) / 2) * (1 - smooth((hour - 18) / 3));
  const orbit = (elapsed: number, duration: number) => ({
    x: 8 + (elapsed / duration) * 84,
    y: 88 - Math.sin((elapsed / duration) * Math.PI) * 74,
    opacity: smooth(elapsed) * (1 - smooth(elapsed - duration + 1)),
  });
  return {
    colors,
    daylight,
    sun: orbit(hour - 5.5, 14),
    // Unwrap the night across midnight so the moon never jumps at 00:00.
    moon: orbit((hour < 12 ? hour + 24 : hour) - 19, 11),
  };
}

export function setDayParameters() {
  const { progress, scene, segment, period } = getDayParameters();
  const root = document.documentElement;
  let sky = document.querySelector<HTMLElement>('.living-sky');
  if (!sky) {
    sky = document.createElement('div');
    sky.className = 'living-sky';
    sky.setAttribute('aria-hidden', 'true');
    sky.innerHTML = '<div class="sky-stars"></div><div class="sky-haze"></div><div class="sky-sun"></div><div class="sky-moon"></div>';
    document.body.prepend(sky);
  }
  // Scene-only links remain useful as previews; explicit progress takes precedence.
  const previewHours: Record<string, number> = { morning: 8, afternoon: 14, evening: 18.5, night: 0 };
  const visualProgress = !store.get('progress') && store.get('scene') && scene in previewHours
    ? previewHours[scene] / 0.24 : progress;
  const { colors, daylight, sun, moon } = getSkyParameters(visualProgress);
  colors.forEach((color, index) => root.style.setProperty(`--sky-${index}`, color));
  root.style.setProperty('--sky-daylight', daylight.toString());
  root.style.setProperty('--sky-starlight', (1 - daylight).toString());
  root.style.setProperty('--sky-ink', daylight > 0.55 ? '#243344' : '#fff4e6');
  root.style.setProperty('--sky-panel', daylight > 0.55 ? '#e3e5df' : '#18243e');
  Object.entries({ sun, moon }).forEach(([name, orbit]) => {
    const element = sky.querySelector<HTMLElement>(`.sky-${name}`)!;
    element.style.left = `${orbit.x}%`;
    element.style.top = `${orbit.y}%`;
    element.style.opacity = orbit.opacity.toString();
  });
  sky.querySelector('.sky-moon')?.setAttribute('data-lunar-phase', Moon.lunarPhase());
  root.style.setProperty('--day-progress', progress.toString());
  root.setAttribute('data-progress', progress.toString());
  root.setAttribute('data-scene', scene);
  root.setAttribute('data-period', period);
  root.setAttribute('data-segment', segment.toString());
}
