const STORAGE_KEY = 'literature-clock-admin-appearance';
type Appearance = 'system' | 'light' | 'dark';

function readAppearance(): Appearance {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Appearance remains usable when browser storage is unavailable.
  }
  return 'system';
}

export function initAppearance(select: HTMLSelectElement) {
  const system = matchMedia('(prefers-color-scheme: dark)');
  let appearance = readAppearance();
  const apply = () => {
    select.value = appearance;
    document.documentElement.dataset.theme = appearance === 'system' ? (system.matches ? 'dark' : 'light') : appearance;
  };
  select.addEventListener('change', () => {
    appearance = select.value as Appearance;
    try {
      localStorage.setItem(STORAGE_KEY, appearance);
    } catch {
      // Keep the selection for this session even if it cannot be persisted.
    }
    apply();
  });
  system.addEventListener('change', apply);
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      appearance = readAppearance();
      apply();
    }
  });
  apply();
}
