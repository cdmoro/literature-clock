import { store } from '../store';

export function initShowtimeMode() {
  document.getElementById('showtime')?.addEventListener('click', () => store.toggle('showtime'));
}
