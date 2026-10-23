import { store } from '../store';

let mouseTimeout: ReturnType<typeof setTimeout>;
let hideTimeout: ReturnType<typeof setTimeout>;

export function initStaticMode() {
  if (store.get('static')) {
    document.querySelector('footer')?.remove();
  } else {
    document.addEventListener('mousemove', onMouseMove);
  }
}

function onMouseMove() {
  const footer = document.querySelector<HTMLElement>('footer');
  if (!footer) return;

  clearTimeout(hideTimeout);

  if (footer.classList.contains('hidden')) {
    footer.style.removeProperty('display');
    // Force the visible display state to be applied before starting the fade-in.
    footer.getBoundingClientRect();
    footer.classList.remove('hidden');
  }

  clearTimeout(mouseTimeout);

  mouseTimeout = setTimeout(() => {
    if (!footer.matches(':hover') && !footer.contains(document.activeElement)) {
      footer.classList.add('hidden');
      hideTimeout = setTimeout(() => {
        if (footer.classList.contains('hidden')) footer.style.display = 'none';
      }, 500);
    }
  }, 3000);
}
