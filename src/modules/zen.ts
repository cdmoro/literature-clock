import { exitScreensaverMode } from './screensaver';
import { store } from '../store';

export function initZenMode() {
  if (store.getState('zen')) {
    exitScreensaverMode();
  }

  document.getElementById('zen')?.addEventListener('click', () => {
    if (store.toggleState('zen')) {
      exitScreensaverMode();
    }
  });
  document.getElementById('exit-zen')?.addEventListener('click', () => store.setState('zen', false));
}
