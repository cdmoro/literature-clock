import { initSettingsDialog } from './settings-dialog';
import { initStaticMode } from './static';
import { initClock } from './clock';
import { initQuoteLibrary } from './quote-library';
import { initReadingControls } from './reading-controls';
import { initCopy } from './copy';
import { initTransitions } from './transitions';
import { initFont } from './font';
import { initFullscreenMode } from './fullscreen';
import { initLocale } from './locales';
import { initScreensaverMode } from './screensaver';
import { initShare } from './share';
import { initTheme } from './themes';
import { initShowTimeMode } from './show-time';
import { initWorkMode } from './work';
import { initZenMode } from './zen';
import { initProgressbarMode } from './progressbar';

const MODULES = [
  initSettingsDialog,
  initStaticMode,
  initReadingControls,
  initQuoteLibrary,
  initClock,
  initCopy,
  initTransitions,
  initFont,
  initFullscreenMode,
  initLocale,
  initProgressbarMode,
  initScreensaverMode,
  initShare,
  initShowTimeMode,
  initTheme,
  initWorkMode,
  initZenMode,
];

export function initModules() {
  MODULES.forEach((module) => module());
}
