import { store } from '../store';

export function initShowTimeMode() {
  document.getElementById('show-time')?.addEventListener('click', () => store.toggle('show-time'));
}
