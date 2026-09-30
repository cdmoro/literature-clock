import { readFileSync } from 'node:fs';
import { afterEach, expect, test } from 'vitest';

afterEach(() => {
  document.body.innerHTML = '';
  delete document.documentElement.dataset.progressbar;
  delete document.documentElement.dataset.theme;
  document.getElementById('progress-test-styles')?.remove();
});

test('explicit positions override theme backgrounds and theme mode restores their styling', () => {
  const styles = document.createElement('style');
  styles.id = 'progress-test-styles';
  const css = (name) => readFileSync(`src/styles/${name}.css`, 'utf8');
  const base = css('main');
  styles.textContent = [
    base.match(/#progress-bar \{[^}]+\}/)[0],
    base.match(/html\[data-progressbar='none'\] #progress-bar \{[^}]+\}/)[0],
    css('themes/retro'),
    css('themes/bohemian'),
    css('progressbar'),
  ].join('\n');
  document.head.append(styles);
  document.body.innerHTML = '<div id="progress-bar"></div>';
  for (const theme of ['base-light', 'retro-dark', 'bohemian-light']) {
    document.documentElement.dataset.theme = theme;
    for (const mode of ['bottom', 'top', 'background', 'none', 'theme']) {
      document.documentElement.dataset.progressbar = mode;
      document.body.innerHTML = '<div id="progress-bar"></div>';
      const computed = getComputedStyle(document.getElementById('progress-bar'));
      if (mode === 'none') expect(computed.display).toBe('none');
      if (mode === 'top') expect(computed.top).toBe('0px');
      if (mode === 'bottom' || mode === 'top') {
        expect(computed.getPropertyValue('--progress-height').trim()).toBe('4px');
        expect(computed.getPropertyValue('--progress-opacity').trim()).toBe('1');
      }
      if (mode === 'background') {
        expect(computed.getPropertyValue('--progress-height').trim()).toBe('100%');
        expect(computed.zIndex).toBe('1');
        expect(computed.pointerEvents).toBe('none');
      }
      if (mode === 'theme' && !theme.startsWith('base'))
        expect(computed.getPropertyValue('--progress-height').trim()).toBe('100vh');
    }
  }
});
