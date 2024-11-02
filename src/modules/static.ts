import { store } from '../store';
import { onMouseMove } from '../utils';

export function initStaticMode() {
  if (store.get('static')) {
    document.querySelector('footer')?.remove();
  } else {
    document.addEventListener('mousemove', onMouseMove);
  }
}
