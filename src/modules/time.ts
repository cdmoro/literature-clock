import { store } from '../store';

export function initTimeMode() {
  document.getElementById('showtime')?.addEventListener('click', () => store.toggle('showtime'));
}
