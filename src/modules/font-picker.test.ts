import { afterEach, expect, test, vi } from 'vitest';
import { initFontPicker, loadFontPreview } from './font-picker';

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

test('loads a name-only subset once under an isolated family', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: async () => '@font-face { font-family: "Preview Test"; src: url(https://fonts.gstatic.com/test.woff2); }',
  });
  vi.stubGlobal('fetch', fetch);
  const family = await loadFontPreview('Preview Test');
  await loadFontPreview('Preview Test');
  expect(fetch).toHaveBeenCalledTimes(1);
  const url = new URL(fetch.mock.calls[0][0]);
  expect(url.searchParams.get('text')).toBe('Preview Test');
  expect(url.searchParams.get('family')).toBe('Preview Test');
  expect(family).not.toBe('Preview Test');
  expect(document.head.lastElementChild?.textContent).toContain(`font-family: '${family}'`);
});

test('does not fetch before opening, preserves disabled choices and dispatches selection', async () => {
  const fetch = vi.fn().mockRejectedValue(new Error('Offline'));
  vi.stubGlobal('fetch', fetch);
  document.body.innerHTML =
    '<label for="font-select">Font</label><select id="font-select"><option value="default">Default</option><option>Picker Test</option><option disabled>Unavailable</option></select>';
  const select = document.querySelector('select')!;
  const change = vi.fn();
  select.addEventListener('change', change);
  initFontPicker(select);
  expect(fetch).not.toHaveBeenCalled();
  const trigger = document.getElementById('font-picker-trigger')!;
  trigger.click();
  expect(fetch).toHaveBeenCalledTimes(1);
  const choices = document.querySelectorAll<HTMLButtonElement>('.font-picker-options button');
  expect(choices[2].disabled).toBe(true);
  choices[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  expect(document.activeElement).toBe(choices[1]);
  choices[1].click();
  expect(select.value).toBe('Picker Test');
  expect(change).toHaveBeenCalledTimes(1);
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(trigger);
});

test('rejects invalid font names before requesting a preview', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await expect(loadFontPreview('Lora&family=Roboto')).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
});

test('keeps touch targets alive across blur and equivalent option refreshes', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
  document.body.innerHTML =
    '<select id="font-select"><option value="default">Default</option><option>Touch Test</option></select>';
  const select = document.querySelector('select')!;
  const dispose = initFontPicker(select);
  const trigger = document.getElementById('font-picker-trigger')!;
  trigger.click();
  const target = document.querySelector<HTMLButtonElement>('.font-picker-options button[data-value="Touch Test"]')!;
  // A clock/locale refresh recreates the same source options during a touch gesture.
  select.replaceChildren(...[...select.options].map((option) => option.cloneNode(true)));
  await Promise.resolve();
  expect(document.querySelector('.font-picker-options button[data-value="Touch Test"]')).toBe(target);
  target.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  target.click();
  expect(select.value).toBe('Touch Test');
  expect(trigger.textContent).toBe('Touch Test');
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  dispose();
});

test('uses separate controls per instance and cleans up when a dialog closes', () => {
  document.body.innerHTML =
    '<select id="font-select"><option>Default</option></select><label for="share-preview-font">Image font</label><select id="share-preview-font"><option>Default</option></select>';
  const disposeSettings = initFontPicker(document.getElementById('font-select') as HTMLSelectElement);
  const shareSelect = document.getElementById('share-preview-font') as HTMLSelectElement;
  const disposeShare = initFontPicker(shareSelect);
  expect(document.querySelector('label')?.htmlFor).toBe('share-preview-font-trigger');
  expect(document.querySelectorAll('.font-picker-trigger')).toHaveLength(2);
  const trigger = document.getElementById('share-preview-font-trigger')!;
  trigger.click();
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  document.getElementById('font-picker-trigger')!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  disposeShare();
  expect(document.getElementById('share-preview-font-trigger')).toBeNull();
  expect(shareSelect.hidden).toBe(false);
  expect(document.querySelector('label')?.htmlFor).toBe('share-preview-font');
  disposeSettings();
});
