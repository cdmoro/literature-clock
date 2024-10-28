import { exitScreensaverMode } from './screensaver';
import { store } from '../store';

export function initZenMode() {
  if (store.get('zen')) {
    exitScreensaverMode();
  }

  document.getElementById('zen')?.addEventListener('click', () => {
    if (store.toggle('zen')) {
      exitScreensaverMode();
    }
  });
  document.getElementById('exit-zen')?.addEventListener('click', () => store.set('zen', false));
}
