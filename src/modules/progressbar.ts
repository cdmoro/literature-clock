import { store, ProgressbarMode } from '../store';

export function initProgressbarMode() {
  const select = document.querySelector<HTMLSelectElement>('#progressbar');
  const refresh = () => {
    const mode = store.get('progressbar');
    document.documentElement.dataset.progressbar = mode;
    if (select) select.value = mode;
  };
  refresh();
  store.subscribe((state, previous) => {
    if (state.progressbar !== previous.progressbar) refresh();
  });
  select?.addEventListener('change', () => store.set('progressbar', select.value as ProgressbarMode));
}
