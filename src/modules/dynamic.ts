import { Moon } from 'lunarphase-js';
import { store } from '../store';

const lunarPhase = Moon.lunarPhase();

export function getDayProgress() {
  const now = new Date();
  const seconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const progress = (seconds * 100) / 86400;

  return parseFloat(store.get('progress') || progress.toFixed(2));
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

export function setDayParameters() {
  const { progress, scene, segment, period } = getDayParameters();

  if (!document.querySelector('.sphere')) {
    const sphere = document.createElement('div');
    sphere.classList.add('sphere');
    sphere.setAttribute('data-lunar-phase', lunarPhase);
    document.querySelector('main')?.appendChild(sphere);
  }

  const root = document.querySelector<HTMLElement>(':root');
  root?.style.setProperty('--day-progress', progress.toString());
  root?.setAttribute('data-progress', progress.toString());
  root?.setAttribute('data-scene', scene);
  root?.setAttribute('data-period', period);
  root?.setAttribute('data-segment', segment.toString());
}
