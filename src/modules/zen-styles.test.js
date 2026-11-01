import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('Zen hides decorative layers across themes without changing background configuration', () => {
  const style = document.createElement('style');
  style.textContent = readFileSync('src/styles/zen.css', 'utf8');
  document.head.append(style);
  document.body.innerHTML = '<a id="photo-credit">NASA</a><div id="photo-overlay"></div><div class="living-sky"></div><canvas id="background-effect-canvas"></canvas>';
  try {
    for (const theme of ['book-dark', 'photo-light', 'horizon-dark', 'terminal-light', 'festive-dark']) {
      document.documentElement.dataset.theme = theme;
      for (const background of ['default', 'photo', 'tinted', 'plain']) {
        document.documentElement.dataset.background = background;
        document.body.classList.add('zen');
        for (const selector of ['#photo-credit', '#photo-overlay', '.living-sky', '#background-effect-canvas'])
          expect(getComputedStyle(document.querySelector(selector)).display).toBe('none');
        document.body.classList.remove('zen');
        expect(document.documentElement.dataset.background).toBe(background);
        expect(document.documentElement.dataset.theme).toBe(theme);
        expect(getComputedStyle(document.querySelector('#photo-overlay')).display).not.toBe('none');
      }
    }
  } finally {
    style.remove();
    document.body.className = '';
    document.body.innerHTML = '';
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.background;
  }
});

test('mobile menu and Zen share clearance for visible quote attribution and photo credits', () => {
  const css = readFileSync('src/styles/main.css', 'utf8');
  const mobile = css.match(/@media only screen and \(max-width: 900px\) \{([\s\S]*?)\n\}/)[1];
  const style = document.createElement('style');
  // jsdom does not evaluate viewport media queries; apply the mobile rules directly.
  style.textContent = mobile;
  document.head.append(style);
  try {
    for (const zen of [false, true]) {
      for (const attribution of ['below', 'bottom-left', 'hidden']) {
        document.body.className = zen ? 'zen' : '';
        document.body.dataset.quoteAttribution = attribution;
        expect(getComputedStyle(document.body).getPropertyValue('--clock-controls-offset').trim())
          .toBe(attribution === 'bottom-left' ? '3.5rem' : '');
      }
      document.documentElement.setAttribute('data-photo-credit', '');
      expect(getComputedStyle(document.body).getPropertyValue('--clock-controls-offset').trim())
        .toBe(zen ? '' : '3.5rem');
      document.documentElement.removeAttribute('data-photo-credit');
      document.body.classList.add('fuzzy-clock');
      document.body.dataset.quoteAttribution = 'below';
      expect(getComputedStyle(document.body).getPropertyValue('--clock-controls-offset').trim()).toBe('3.5rem');
    }
  } finally {
    style.remove();
    document.body.className = '';
    delete document.body.dataset.quoteAttribution;
    document.documentElement.removeAttribute('data-photo-credit');
  }
});

test('Zen stones keep a fixed flex layout across the narrow-screen breakpoint', () => {
  const main = readFileSync('src/styles/main.css', 'utf8');
  const narrow = main.match(/@media only screen and \(max-width: 750px\) \{([\s\S]*?)\n\}/)[1];
  const zen = readFileSync('src/styles/zen.css', 'utf8');
  const style = document.createElement('style');
  document.head.append(style);
  document.body.className = 'zen';
  document.body.innerHTML = '<button id="exit-zen"><svg></svg></button>';
  try {
    for (const mobileRules of ['', narrow]) {
      style.textContent = `${main}\n${mobileRules}\n${zen}`;
      const button = getComputedStyle(document.getElementById('exit-zen'));
      expect(button.display).toBe('inline-flex');
      expect(button.alignItems).toBe('center');
      expect(button.height).toBe('48px');
      expect(button.boxSizing).toBe('border-box');
      expect(button.lineHeight).toBe('1');
    }
  } finally {
    style.remove();
    document.body.className = '';
    document.body.innerHTML = '';
  }
});
