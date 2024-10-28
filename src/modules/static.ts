import { store } from '../store';

export function initStatic() {
  if (store.get('static')) {
    document.querySelector('footer')?.remove();
  }
}
