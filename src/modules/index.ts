import { initStatic } from './static';
import { initClock } from './clock';
import { initCopy } from './copy';
import { initFadeMode } from './fade';
import { initFont } from './font';
import { initFullscreen } from './fullscreen';
import { initLocale } from './locales';
import { initScreensaver } from './screensaver';
import { initShare } from './share';
import { initTheme } from './themes';
import { initTimeMode } from './time';
import { initWorkMode } from './work';
import { initZenMode } from './zen';

const MODULES = [
  initStatic,
  initClock,
  initCopy,
  initFadeMode,
  initFont,
  initFullscreen,
  initLocale,
  initScreensaver,
  initShare,
  initTheme,
  initTimeMode,
  initWorkMode,
  initZenMode,
];

export function initModules() {
  MODULES.forEach((module) => module());
}
