import { store } from '../store';

export function initProgressbarMode() {
  document.getElementById('progressbar')?.addEventListener('click', () => store.toggle('progressbar'));
}
