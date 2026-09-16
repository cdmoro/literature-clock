import { store } from '../store';

interface Box { left: number; top: number; width: number; height: number }
interface Viewport { left: number; top: number; width: number; height: number }

export function movementBounds(box: Box, viewport: Viewport) {
  const padding = Math.min(48, viewport.width * 0.06, viewport.height * 0.06);
  const scale = Math.min(0.94, (viewport.width - padding * 2) / Math.max(1, box.width),
    (viewport.height - padding * 2) / Math.max(1, box.height));
  const left = box.left + box.width * (1 - scale) / 2;
  const top = box.top + box.height * (1 - scale) / 2;
  return {
    scale,
    minX: viewport.left + padding - left,
    maxX: viewport.left + viewport.width - padding - left - box.width * scale,
    minY: viewport.top + padding - top,
    maxY: viewport.top + viewport.height - padding - top - box.height * scale,
  };
}

let animation: Animation | undefined;
let frame: number | undefined;
let generation = 0;
let reducedMotion: MediaQueryList | undefined;
let phase: 'idle' | 'entering' | 'drifting' | 'returning' = 'idle';
const ENTER_DURATION = 1200;
const RETURN_DURATION = 800;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function stopMovement() {
  generation++;
  phase = 'idle';
  if (frame !== undefined) cancelAnimationFrame(frame);
  frame = undefined;
  animation?.cancel();
  animation = undefined;
}

function move() {
  frame = undefined;
  const clock = document.getElementById('clock');
  if (!clock || !store.get('screensaver') || document.hidden || reducedMotion?.matches) {
    stopMovement();
    return;
  }
  const entering = phase === 'entering';
  const currentTransform = getComputedStyle(clock).transform;
  const current = new DOMMatrixReadOnly(currentTransform);
  animation?.cancel();
  const viewport = window.visualViewport;
  const bounds = movementBounds(clock.getBoundingClientRect(), {
    left: viewport?.offsetLeft ?? 0, top: viewport?.offsetTop ?? 0,
    width: viewport?.width ?? window.innerWidth, height: viewport?.height ?? window.innerHeight,
  });
  const fromX = clamp(current.m41, bounds.minX, bounds.maxX);
  const fromY = clamp(current.m42, bounds.minY, bounds.maxY);
  const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
  const y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
  const transform = (x: number, y: number) => `translate(${x}px, ${y}px) scale(${bounds.scale})`;
  const token = ++generation;
  // Motion belongs to the clock container; quote transitions can animate its children independently.
  animation = clock.animate([
    { transform: entering ? currentTransform : transform(fromX, fromY) },
    { transform: transform(x, y) },
  ], {
    duration: entering ? ENTER_DURATION : 18000 + Math.random() * 6000,
    easing: 'ease-in-out',
    fill: 'forwards',
  });
  void animation.finished.then(() => {
    if (token === generation) {
      phase = 'drifting';
      move();
    }
  }, () => { /* Cancellation is expected on resize, exit, and backgrounding. */ });
}

export function startScreensaver() {
  if (!store.get('screensaver')) return;
  document.querySelector('footer')?.classList.add('hidden');
  if (phase === 'idle' || phase === 'returning') {
    // Keep the current visual pose until the next frame captures it, including
    // when the user reactivates the screensaver halfway through its return.
    generation++;
    phase = 'entering';
  }
  if (frame === undefined) frame = requestAnimationFrame(move);
}

export function initScreensaverMode() {
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const refresh = () => {
    if (document.hidden || reducedMotion?.matches) stopMovement();
    else if (store.get('screensaver')) startScreensaver();
    else if (phase !== 'returning') stopMovement();
  };
  reducedMotion.addEventListener('change', refresh);
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('resize', refresh);
  window.visualViewport?.addEventListener('resize', refresh);
  window.visualViewport?.addEventListener('scroll', refresh);
  if (typeof ResizeObserver !== 'undefined') {
    const quote = document.getElementById('quote');
    if (quote) new ResizeObserver(refresh).observe(quote);
  }
  document.getElementById('screensaver')?.addEventListener('click', () => {
    if (store.toggle('screensaver')) startScreensaver();
    else exitScreensaverMode();
  });
  refresh();
}

export function exitScreensaverMode() {
  store.set('screensaver', false);
  document.querySelector('footer')?.classList.remove('hidden');
  if (phase === 'returning' && !document.hidden && !reducedMotion?.matches) return;

  const clock = document.getElementById('clock');
  const currentTransform = clock ? getComputedStyle(clock).transform : 'none';
  stopMovement();
  if (!clock || currentTransform === 'none' || document.hidden || reducedMotion?.matches) return;

  phase = 'returning';
  const token = generation;
  const returning = clock.animate([
    { transform: currentTransform }, { transform: 'none' },
  ], { duration: RETURN_DURATION, easing: 'ease-in-out', fill: 'forwards' });
  animation = returning;
  void returning.finished.then(() => {
    if (token === generation) stopMovement();
  }, () => { /* Reactivation can interrupt the return without resetting the pose. */ });
}
