import { readFileSync } from 'node:fs';
import { afterEach, expect, test } from 'vitest';

afterEach(() => {
  document.body.innerHTML = '';
  document.body.className = '';
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

test('Zen hides progress and the separate time even when screensaver mode is also active', () => {
  const base = readFileSync('src/styles/main.css', 'utf8');
  const styles = document.createElement('style');
  styles.id = 'progress-test-styles';
  styles.textContent = [
    base.match(/#progress-bar \{[^}]+\}/)[0],
    base.match(/body\.zen #progress-bar,[\s\S]*?\n\}/)[0],
    base.match(/body\.paused:not\(\.zen\) #time-clock \{[^}]+\}/)[0],
    readFileSync('src/styles/themes/retro.css', 'utf8'),
    readFileSync('src/styles/progressbar.css', 'utf8'),
  ].join('\n');
  document.head.append(styles);
  document.documentElement.dataset.theme = 'retro-dark';
  for (const mode of ['theme', 'top', 'bottom', 'background']) {
    document.documentElement.dataset.progressbar = mode;
    for (const screensaver of [false, true]) {
      document.body.className = `show-time zen paused${screensaver ? ' screensaver' : ''}`;
      document.body.innerHTML = '<div id="progress-bar"></div><div id="time-clock"></div>';
      for (const id of ['progress-bar', 'time-clock'])
        expect(getComputedStyle(document.getElementById(id)).display).toBe('none');
      document.body.classList.remove('zen');
      document.body.innerHTML = '<div id="progress-bar"></div><div id="time-clock"></div>';
      for (const id of ['progress-bar', 'time-clock'])
        expect(getComputedStyle(document.getElementById(id)).display).not.toBe('none');
      expect(document.documentElement.dataset.progressbar).toBe(mode);
    }
  }
});
