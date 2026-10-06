import { normalizeFontName } from '../utils/google-font';

const previews = new Map<string, Promise<string>>();

/** Keep name-only subsets separate from the fonts used to render passages. */
export function loadFontPreview(name: string): Promise<string> {
  if (normalizeFontName(name) !== name) return Promise.reject(new Error('Invalid font name'));
  const existing = previews.get(name);
  if (existing) return existing;
  const family = `ClockFontPreview${previews.size}`;
  const request = (async () => {
    const response = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}&text=${encodeURIComponent(name)}&display=swap`,
    );
    if (!response.ok) throw new Error('Font preview unavailable');
    const css = await response.text();
    const style = document.createElement('style');
    style.textContent = css.replace(/font-family:\s*[^;]+;/g, `font-family: '${family}';`);
    document.head.append(style);
    return family;
  })();
  previews.set(name, request);
  return request;
}

export function initFontPicker(select: HTMLSelectElement) {
  const picker = document.createElement('div');
  picker.className = 'font-picker';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = 'font-picker-trigger';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  const panel = document.createElement('div');
  panel.id = 'font-picker-options';
  panel.className = 'font-picker-options';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  trigger.setAttribute('aria-controls', panel.id);
  picker.append(trigger, panel);
  select.after(picker);
  select.hidden = true;
  const label = document.querySelector<HTMLLabelElement>('label[for="font-select"]');
  if (label) label.htmlFor = trigger.id;

  const close = () => {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  };
  const buttons = () => [...panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
  const render = () => {
    trigger.textContent = select.selectedOptions[0]?.textContent || '';
    panel.setAttribute('aria-label', label?.textContent || trigger.textContent);
    panel.replaceChildren();
    for (const option of select.options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.disabled = option.disabled;
      button.dataset.value = option.value;
      button.setAttribute('aria-pressed', String(option.selected));
      const sample = document.createElement('span');
      sample.textContent = option.value === 'default' ? option.textContent : option.value;
      button.append(sample);
      if (option.dataset.customFont !== undefined) {
        const annotation = document.createElement('small');
        annotation.textContent = option.textContent?.slice(option.value.length) || '';
        button.append(annotation);
      }
      button.addEventListener('click', () => {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        render();
        close();
        trigger.focus();
      });
      panel.append(button);
      if (!panel.hidden && option.value !== 'default' && !option.disabled) {
        void loadFontPreview(option.value)
          .then((family) => {
            sample.style.fontFamily = `"${family}", sans-serif`;
          })
          .catch(() => {
            /* Names remain usable when previews cannot load. */
          });
      }
    }
  };
  const open = () => {
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    render();
    (panel.querySelector<HTMLButtonElement>('button[aria-pressed="true"]:not(:disabled)') || buttons()[0])?.focus();
  };
  trigger.addEventListener('click', () => (panel.hidden ? open() : close()));
  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open();
    }
  });
  picker.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      event.preventDefault();
      event.stopPropagation();
      close();
      trigger.focus();
    }
    if (panel.hidden || !panel.contains(document.activeElement)) return;
    const choices = buttons();
    const index = choices.indexOf(document.activeElement as HTMLButtonElement);
    let next: number | undefined;
    if (event.key === 'ArrowDown') next = (index + 1) % choices.length;
    if (event.key === 'ArrowUp') next = (index - 1 + choices.length) % choices.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = choices.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      choices[next]?.focus();
    }
  });
  picker.addEventListener('focusout', (event) => {
    if (!picker.contains(event.relatedTarget as Node | null)) close();
  });
  document.addEventListener('click', (event) => {
    if (!picker.contains(event.target as Node)) close();
  });
  new MutationObserver(render).observe(select, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
  });
  select.addEventListener('change', render);
  render();
}
