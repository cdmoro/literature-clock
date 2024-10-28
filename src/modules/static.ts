import { store } from '../store';

export function initStaticMode() {
  if (store.get('static')) {
    document.querySelector('footer')?.remove();
  }
}
