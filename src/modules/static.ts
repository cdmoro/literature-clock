import { store } from '../store';

let mouseTimeout: NodeJS.Timeout;

export function initStaticMode() {
  if (store.get('static')) {
    document.querySelector('footer')?.remove();
  } else {
    document.addEventListener('mousemove', onMouseMove);
  }
}

function onMouseMove() {
  const footer = document.querySelector<HTMLElement>('footer');
  footer?.classList.remove('hidden');

  clearTimeout(mouseTimeout);

  mouseTimeout = setTimeout(() => {
    if (!footer?.matches(':hover')) {
      footer?.classList.add('hidden');
    }
  }, 3000);
}
