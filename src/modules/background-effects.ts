import { store } from '../store';
import { supportsBackgroundPattern } from '../utils/background-patterns';
import { getBaseLocale, getInterfaceLocale } from './locales';
import SETTINGS from '../strings/settings.json';

const EFFECTS = ['none', 'rain', 'snow', 'dust', 'dust-v2'] as const;
type Effect = (typeof EFFECTS)[number];
interface Particle { x: number; y: number; size: number; speed: number; drift: number; opacity: number; phase: number }

export function initBackgroundEffects() {
  const canvas = document.getElementById('background-effect-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  const dialog = document.getElementById('settings-dialog');
  if (dialog) {
    const row = document.createElement('div');
    row.className = 'settings-row settings-effect-row';
    row.innerHTML = `<label for="background-effect" data-text="settings_background_effect"></label>
      <div class="input-group"><select id="background-effect">${EFFECTS.map((effect) => `<option value="${effect}" data-text="settings_effect_${effect}"></option>`).join('')}</select></div>`;
    const patternRow = dialog.querySelector('.settings-pattern-row');
    if (patternRow) patternRow.after(row);
    else dialog.querySelector('#settings-appearance')?.append(row);
    row.querySelector('select')!.addEventListener('change', (event) => {
      store.set('background-effect', (event.target as HTMLSelectElement).value as Effect);
    });
    const updateLabel = () => {
      const labels = SETTINGS[getBaseLocale(getInterfaceLocale())];
      row.querySelectorAll<HTMLElement>('[data-text]').forEach((element) => {
        element.textContent = labels[element.dataset.text as keyof typeof labels];
      });
    };
    store.subscribe((state, old) => {
      if (state['ui-locale'] !== old['ui-locale'] || state.locale !== old.locale) updateLabel();
    });
    updateLabel();
  }

  const context = canvas.getContext('2d');
  if (!context) return;
  let particles: Particle[] = [];
  let frame = 0;
  let previous = 0;
  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const effect = store.get('background-effect');
    const count = effect === 'dust-v2'
      ? Math.min(260, Math.round((width * height) / 6500))
      : effect === 'dust'
        ? Math.min(180, Math.round((width * height) / 9000))
        : Math.min(190, Math.round((width * height) / 8500));
    particles = Array.from({ length: count }, () => makeParticle(width, height, true, effect));
  };
  function makeParticle(width: number, height: number, scattered = false, effect: Effect = 'rain'): Particle {
    return {
      x: Math.random() * width,
      y: scattered ? Math.random() * height : -20,
      size: effect === 'snow' ? 1.1 + Math.random() * 1.9
        : effect === 'dust' ? 0.9 + Math.random() * 2
          : effect === 'dust-v2' ? 0.6 + Math.random() ** 2 * 7
            : 0.7 + Math.random() * 0.8,
      speed: effect === 'snow' ? 18 + Math.random() * 38
        : effect === 'dust' ? Math.random() * 22 - 11
          : effect === 'dust-v2' ? Math.random() * 28 - 14
            : 260 + Math.random() * 360,
      drift: effect === 'snow' ? Math.random() * 36 - 18
        : effect === 'dust' ? Math.random() * 70 - 35
          : effect === 'dust-v2' ? Math.random() * 40 - 20
            : (260 + Math.random() * 360) * 0.12,
      opacity: effect === 'snow' ? 0.08 + Math.random() * 0.12
        : effect === 'dust' ? 0.1 + Math.random() * 0.18
          : effect === 'dust-v2' ? 0.06 + Math.random() * 0.2
            : 0.12 + Math.random() * 0.24,
      phase: Math.random() * Math.PI * 2,
    };
  }
  const draw = (now: number) => {
    frame = 0;
    const effect = document.documentElement.dataset.backgroundEffect || 'none';
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!['rain', 'snow', 'dust', 'dust-v2'].includes(effect) || document.hidden || isReduced) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      previous = 0;
      return;
    }
    const width = window.innerWidth;
    const height = window.innerHeight;
    const delta = Math.min((now - (previous || now)) / 1000, 0.05);
    previous = now;
    context.clearRect(0, 0, width, height);
    context.lineCap = 'round';
    const particleColor = effect === 'snow'
      ? getComputedStyle(document.documentElement).getPropertyValue('--font-color').trim() || '#fff'
      : '';
    for (const particle of particles) {
      particle.y += particle.speed * delta + (effect === 'dust-v2' ? Math.sin(now / 1100 + particle.phase) * 7 * delta : 0);
      particle.x += particle.drift * delta + (effect === 'dust' ? Math.sin(now / 1300 + particle.phase) * 12 * delta : effect === 'dust-v2' ? Math.sin(now / 1700 + particle.phase) * 20 * delta : 0);
      if (effect === 'rain') {
        context.strokeStyle = `rgba(150, 190, 220, ${particle.opacity})`;
        context.lineWidth = particle.size * 0.65;
        context.beginPath();
        context.moveTo(particle.x, particle.y);
        context.lineTo(particle.x - particle.size * 2, particle.y - particle.size * 12);
        context.stroke();
      } else {
        context.fillStyle = effect === 'snow' ? particleColor : 'rgb(255, 211, 145)';
        context.globalAlpha = effect === 'snow'
          ? particle.opacity + 0.08
          : particle.opacity * (effect === 'dust-v2'
            ? 0.45 + 0.55 * (Math.sin(now / 1100 + particle.phase) + 1) / 2
            : 0.65 + 0.35 * (Math.sin(now / 850 + particle.phase) + 1) / 2);
        context.shadowColor = 'rgb(255, 211, 145)';
        context.shadowBlur = effect === 'dust-v2' ? Math.max(0, particle.size - 1.5) * 1.8 : 0;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;
        context.shadowBlur = 0;
      }
      if (effect === 'dust' || effect === 'dust-v2') {
        particle.x = (particle.x + width) % width;
        particle.y = (particle.y + height) % height;
      } else if (particle.y > height + 20 || particle.x < -30 || particle.x > width + 30) {
        Object.assign(particle, makeParticle(width, height, false, effect as Effect));
      }
    }
    frame = requestAnimationFrame(draw);
  };
  const refresh = () => {
    const selected = store.get('background-effect');
    const supported = supportsBackgroundPattern(store.get('theme'));
    const effect = supported ? selected : 'none';
    document.documentElement.dataset.backgroundEffect = effect;
    const select = document.getElementById('background-effect') as HTMLSelectElement | null;
    if (select) {
      select.value = selected;
      select.disabled = !supported;
    }
    if (effect !== 'none' && !document.hidden && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (!canvas.width) resize();
      if (!frame) frame = requestAnimationFrame(draw);
    } else {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      context.clearRect(0, 0, canvas.width, canvas.height);
      previous = 0;
    }
  };
  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', refresh);
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', refresh);
  store.subscribe((state, old) => {
    if (state['background-effect'] !== old['background-effect']) resize();
    if (state['background-effect'] !== old['background-effect'] || state.theme !== old.theme) refresh();
  });
  refresh();
}
