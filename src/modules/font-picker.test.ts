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

test('previews the full automatic label with its resolved font and keeps the closed control neutral', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, text: async () => '@font-face { font-family: "Automatic Test"; }' });
  vi.stubGlobal('fetch', fetch);
  document.body.innerHTML =
    '<select id="font-select"><option value="default" data-preview-font="Automatic Test">Default (Automatic Test)</option><option>Automatic Test</option></select>';
  const select = document.querySelector('select')!;
  const dispose = initFontPicker(select);
  const trigger = document.getElementById('font-picker-trigger')!;
  expect(fetch).not.toHaveBeenCalled();
  trigger.click();
  const sample = document.querySelector<HTMLElement>('.font-picker-options button[data-value="default"] span')!;
  await vi.waitFor(() => expect(sample.style.fontFamily).toContain('ClockFontPreview'));
  const requests = fetch.mock.calls.map(([url]) => new URL(url));
  expect(
    requests.some(
      (url) =>
        url.searchParams.get('family') === 'Automatic Test' &&
        url.searchParams.get('text') === 'Default (Automatic Test)',
    ),
  ).toBe(true);
  expect(requests.some((url) => url.searchParams.get('text') === 'Automatic Test')).toBe(true);
  expect(trigger.style.fontFamily).toBe('');
  select.options[0].textContent = 'Default (New Automatic Test)';
  select.options[0].dataset.previewFont = 'New Automatic Test';
  await vi.waitFor(() =>
    expect(fetch.mock.calls.some(([url]) => new URL(url).searchParams.get('family') === 'New Automatic Test')).toBe(
      true,
    ),
  );
  expect(trigger.textContent).toBe('Default (New Automatic Test)');
  dispose();
});

test('uses the system font directly when automatic Arabic text has no theme face', () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  document.body.innerHTML =
    '<select id="font-select"><option value="default" data-preview-font="system-ui">Default (system-ui)</option></select>';
  const dispose = initFontPicker(document.querySelector('select')!);
  document.getElementById('font-picker-trigger')!.click();
  expect(document.querySelector<HTMLElement>('.font-picker-options span')!.style.fontFamily).toBe(
    'system-ui, sans-serif',
  );
  expect(fetch).not.toHaveBeenCalled();
  dispose();
});

function touchEvent(type: string, y = 10) {
  const event = new MouseEvent(type, { bubbles: true, clientX: 10, clientY: y });
  Object.defineProperties(event, { pointerType: { value: 'touch' }, pointerId: { value: 1 } });
  return event;
}

test('commits one touch selection on pointerup despite blur and an option update before click', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
  document.body.innerHTML =
    '<select id="font-select"><option value="default">Default</option><option>Mobile Choice</option></select>';
  const select = document.querySelector('select')!;
  const dispose = initFontPicker(select);
  const change = vi.fn();
  select.addEventListener('change', change);
  document.getElementById('font-picker-trigger')!.click();
  const target = document.querySelector<HTMLButtonElement>('.font-picker-options button[data-value="Mobile Choice"]')!;
  target.dispatchEvent(touchEvent('pointerdown'));
  target.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
  select.options[0].textContent = 'Default (Updated)';
  await Promise.resolve();
  expect(target.isConnected).toBe(true);
  target.dispatchEvent(touchEvent('pointerup'));
  expect(select.value).toBe('Mobile Choice');
  expect(change).toHaveBeenCalledTimes(1);
  target.click(); // The compatibility click after a touch must not select a second time.
  expect(change).toHaveBeenCalledTimes(1);
  dispose();
});

test('scrolling or cancelling a touch gesture does not choose a font', () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
  document.body.innerHTML =
    '<select id="font-select"><option value="default">Default</option><option>Scroll Choice</option></select>';
  const select = document.querySelector('select')!;
  const dispose = initFontPicker(select);
  const change = vi.fn();
  select.addEventListener('change', change);
  document.getElementById('font-picker-trigger')!.click();
  const target = document.querySelector<HTMLButtonElement>('.font-picker-options button[data-value="Scroll Choice"]')!;
  target.dispatchEvent(touchEvent('pointerdown'));
  target.dispatchEvent(touchEvent('pointerup', 60));
  expect(select.value).toBe('default');
  target.dispatchEvent(touchEvent('pointerdown'));
  target.dispatchEvent(touchEvent('pointercancel'));
  target.dispatchEvent(touchEvent('pointerup'));
  expect(change).not.toHaveBeenCalled();
  dispose();
});

test('swallows a Safari compatibility click retargeted to the theme control underneath', () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
  document.body.innerHTML =
    '<button id="theme">Theme</button><select id="font-select"><option value="default">Default</option><option>Tap Choice</option></select>';
  const select = document.querySelector('select')!;
  const dispose = initFontPicker(select);
  const theme = document.getElementById('theme')!;
  const opened = vi.fn();
  theme.addEventListener('click', opened);
  document.getElementById('font-picker-trigger')!.click();
  const target = document.querySelector<HTMLButtonElement>('.font-picker-options button[data-value="Tap Choice"]')!;
  target.dispatchEvent(touchEvent('pointerdown'));
  target.dispatchEvent(touchEvent('pointerup'));
  const compatibilityClick = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    detail: 1,
    clientX: 10,
    clientY: 10,
  });
  theme.dispatchEvent(compatibilityClick);
  expect(select.value).toBe('Tap Choice');
  expect(compatibilityClick.defaultPrevented).toBe(true);
  expect(opened).not.toHaveBeenCalled();
  // A fresh gesture at the same point still works normally.
  theme.dispatchEvent(touchEvent('pointerdown'));
  theme.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: 10, clientY: 10 }));
  expect(opened).toHaveBeenCalledTimes(1);
  dispose();
});

test('a fresh pointer gesture clears an unreceived compatibility click', () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
  document.body.innerHTML =
    '<button id="theme">Theme</button><select id="font-select"><option value="default">Default</option><option>New Tap Choice</option></select>';
  const dispose = initFontPicker(document.querySelector('select')!);
  const theme = document.getElementById('theme')!;
  const opened = vi.fn();
  theme.addEventListener('click', opened);
  document.getElementById('font-picker-trigger')!.click();
  const target = document.querySelector<HTMLButtonElement>('.font-picker-options button[data-value="New Tap Choice"]')!;
  target.dispatchEvent(touchEvent('pointerdown'));
  target.dispatchEvent(touchEvent('pointerup'));
  theme.dispatchEvent(touchEvent('pointerdown'));
  theme.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: 10, clientY: 10 }));
  expect(opened).toHaveBeenCalledTimes(1);
  dispose();
});
