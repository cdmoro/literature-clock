import { normalizeFontName } from '../utils/google-font';

const previews = new Map<string, Promise<string>>();

/** Keep name-only subsets separate from the fonts used to render passages. */
export function loadFontPreview(name: string, text = name): Promise<string> {
  if (normalizeFontName(name) !== name) return Promise.reject(new Error('Invalid font name'));
  const key = JSON.stringify([name, text]);
  const existing = previews.get(key);
  if (existing) return existing;
  const family = `ClockFontPreview${previews.size}`;
  const request = (async () => {
    const response = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}&text=${encodeURIComponent(text)}&display=swap`,
    );
    if (!response.ok) throw new Error('Font preview unavailable');
    const css = await response.text();
    const style = document.createElement('style');
    style.textContent = css.replace(/font-family:\s*[^;]+;/g, `font-family: '${family}';`);
    document.head.append(style);
    return family;
  })();
  previews.set(key, request);
  return request;
}

export function initFontPicker(select: HTMLSelectElement, caption?: HTMLLabelElement) {
  const picker = document.createElement('div');
  picker.className = 'font-picker';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = select.id === 'font-select' ? 'font-picker-trigger' : `${select.id}-trigger`;
  trigger.className = 'font-picker-trigger';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  const panel = document.createElement('div');
  panel.id = `${trigger.id}-options`;
  panel.className = 'font-picker-options';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  trigger.setAttribute('aria-controls', panel.id);
  picker.append(trigger, panel);
  select.after(picker);
  select.hidden = true;
  const label =
    caption || [...document.querySelectorAll<HTMLLabelElement>('label')].find((item) => item.htmlFor === select.id);
  if (label) label.htmlFor = trigger.id;

  const close = () => {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  };
  const buttons = () => [...panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
  let signature = '';
  let previewSamples: (() => void)[] = [];
  const render = () => {
    trigger.textContent = select.selectedOptions[0]?.textContent || '';
    panel.setAttribute('aria-label', label?.textContent || trigger.textContent);
    const nextSignature = JSON.stringify(
      [...select.options].map((option) => [
        option.value,
        option.textContent,
        option.disabled,
        option.dataset.customFont,
        option.dataset.previewFont,
      ]),
    );
    if (signature === nextSignature && panel.childElementCount) {
      panel.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.value === select.value));
      });
      return;
    }
    signature = nextSignature;
    panel.replaceChildren();
    previewSamples = [];
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
      const previewFont = option.value === 'default' ? option.dataset.previewFont : option.value;
      if (previewFont === 'system-ui') sample.style.fontFamily = 'system-ui, sans-serif';
      else if (previewFont && !option.disabled) {
        previewSamples.push(() => {
          void loadFontPreview(previewFont, sample.textContent || previewFont)
            .then((family) => {
              sample.style.fontFamily = `"${family}", sans-serif`;
            })
            .catch(() => {
              /* Names remain usable when previews cannot load. */
            });
        });
      }
    }
    if (!panel.hidden) previewSamples.forEach((load) => load());
  };
  const open = () => {
    const bounds = picker.getBoundingClientRect();
    const dialog = picker.closest('dialog')?.getBoundingClientRect();
    const above = bounds.top - Math.max(0, dialog?.top || 0) - 16;
    const below = Math.min(window.innerHeight, dialog?.bottom || window.innerHeight) - bounds.bottom - 16;
    const upwards = above >= below;
    panel.style.top = upwards ? 'auto' : '100%';
    panel.style.bottom = upwards ? '100%' : 'auto';
    panel.style.maxHeight = `${Math.max(0, Math.min(240, (upwards ? above : below) - 8))}px`;
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    render();
    previewSamples.forEach((load) => load());
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
    // Mobile browsers can blur with no next focus target before delivering the tap's click.
    if (event.relatedTarget && !picker.contains(event.relatedTarget as Node)) close();
  });
  const closeOutside = (event: Event) => {
    if (!picker.contains(event.target as Node)) close();
  };
  document.addEventListener('pointerdown', closeOutside);
  const observer = new MutationObserver(render);
  observer.observe(select, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
  });
  select.addEventListener('change', render);
  render();
  return () => {
    observer.disconnect();
    document.removeEventListener('pointerdown', closeOutside);
    select.removeEventListener('change', render);
    select.hidden = false;
    if (label) label.htmlFor = select.id;
    picker.remove();
  };
}
