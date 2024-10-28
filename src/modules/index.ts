import { initStaticMode } from './static';
import { initClock } from './clock';
import { initCopy } from './copy';
import { initFadeMode } from './fade';
import { initFont } from './font';
import { initFullscreenMode } from './fullscreen';
import { initLocale } from './locales';
import { initScreensaverMode } from './screensaver';
import { initShare } from './share';
import { initTheme } from './themes';
import { initShowtimeMode } from './time';
import { initWorkMode } from './work';
import { initZenMode } from './zen';
import { initProgressbarMode } from './progressbar';

const MODULES = [
  initStaticMode,
  initClock,
  initCopy,
  initFadeMode,
  initFont,
  initFullscreenMode,
  initLocale,
  initProgressbarMode,
  initScreensaverMode,
  initShare,
  initShowtimeMode,
  initTheme,
  initWorkMode,
  initZenMode,
];

export function initModules() {
  MODULES.forEach((module) => module());
}
