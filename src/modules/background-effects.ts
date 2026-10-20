import { store } from '../store';
import { supportsBackgroundPattern } from '../utils/background-patterns';
import { readingIcon } from './reading-icons';
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
    row.innerHTML = `<label id="effect-picker-label" for="effect-picker-toggle" data-text="settings_background_effect"></label>
      <select id="background-effect" hidden aria-hidden="true" tabindex="-1">${EFFECTS.map((effect) => `<option value="${effect}" data-text="settings_effect_${effect}"></option>`).join('')}</select>
      <div class="input-group"><button type="button" id="effect-picker-toggle" aria-expanded="false" aria-controls="effect-picker-menu" aria-labelledby="effect-picker-label effect-picker-name">
        <span id="effect-picker-swatch" class="animated-effect-swatch" data-effect="none" aria-hidden="true"></span><span id="effect-picker-name"></span><svg class="effect-picker-arrow" width="16" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 5l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button></div>
      <div id="effect-picker-menu" role="group" aria-labelledby="effect-picker-label" hidden>${EFFECTS.map(
        (effect) => `<button type="button" class="effect-option" data-effect="${effect}" aria-pressed="false"><span class="animated-effect-swatch" data-effect="${effect}" aria-hidden="true"><span class="effect-selected-icon">${readingIcon('check')}</span></span><span data-text="settings_effect_${effect}"></span></button>`,
      ).join('')}</div>`;
    const patternRow = dialog.querySelector('.settings-pattern-row');
    if (patternRow) patternRow.after(row);
    else dialog.querySelector('#settings-appearance')?.append(row);
    const toggle = row.querySelector<HTMLButtonElement>('#effect-picker-toggle')!;
    const menu = row.querySelector<HTMLElement>('#effect-picker-menu')!;
    const buttons = [...menu.querySelectorAll<HTMLButtonElement>('.effect-option')];
    const close = (focus = false) => {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      if (focus) toggle.focus();
    };
    toggle.addEventListener('click', () => {
      if (toggle.disabled) return;
      menu.hidden = !menu.hidden;
      toggle.setAttribute('aria-expanded', String(!menu.hidden));
      if (!menu.hidden) buttons.find((button) => button.dataset.effect === store.get('background-effect'))?.focus();
    });
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => {
        if (toggle.disabled) return;
        store.set('background-effect', button.dataset.effect as Effect);
        close(true);
      });
      button.addEventListener('keydown', (event) => {
        const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 }[event.key];
        if (step !== undefined || event.key === 'Home' || event.key === 'End') {
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + step! + buttons.length) % buttons.length;
          buttons[next].focus();
        }
      });
    });
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !menu.hidden) {
        event.preventDefault();
        event.stopPropagation();
        close(true);
      }
    });
    document.addEventListener('click', (event) => {
      if (event.target instanceof Node && !row.contains(event.target)) close();
    });
    dialog.addEventListener('close', () => close());
    dialog.querySelectorAll('[role="tab"]').forEach((tab) => tab.addEventListener('click', () => close()));
    row.querySelector<HTMLSelectElement>('#background-effect')!.addEventListener('change', (event) => {
      store.set('background-effect', (event.target as HTMLSelectElement).value as Effect);
    });
    const updateLabel = () => {
      const labels = SETTINGS[getBaseLocale(getInterfaceLocale())];
      row.querySelectorAll<HTMLElement>('[data-text]').forEach((element) => {
        const label = labels[element.dataset.text as keyof typeof labels];
        if (label) element.textContent = label;
      });
      refreshPicker();
    };
    store.subscribe((state, old) => {
      if (state['ui-locale'] !== old['ui-locale'] || state.locale !== old.locale) updateLabel();
    });
    updateLabel();
  }

  function refreshPicker() {
    const selected = store.get('background-effect');
    const caption = document.getElementById('effect-picker-name');
    if (caption) caption.textContent = SETTINGS[getBaseLocale(getInterfaceLocale())][`settings_effect_${selected}` as keyof (typeof SETTINGS)['en-GB']];
    const swatch = document.getElementById('effect-picker-swatch');
    if (swatch) swatch.dataset.effect = selected;
    document.querySelectorAll<HTMLButtonElement>('.effect-option').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.effect === selected));
    });
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
    const toggle = document.getElementById('effect-picker-toggle') as HTMLButtonElement | null;
    if (toggle) toggle.disabled = !supported;
    refreshPicker();
    if (!supported) {
      document.getElementById('effect-picker-menu')?.setAttribute('hidden', '');
      toggle?.setAttribute('aria-expanded', 'false');
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
    if (state['background-effect'] !== old['background-effect']) refreshPicker();
    if (state['background-effect'] !== old['background-effect'] || state.theme !== old.theme) refresh();
  });
  refresh();
}
