// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { appendQuotePassage } from './quote-markup';

function render(before: string, time: string, after: string, locale = 'en-US', fuzzy = false) {
  const passage = document.createElement('p');
  appendQuotePassage(
    passage,
    { quote_first: before, quote_time_case: time, quote_last: after },
    locale,
    fuzzy,
    (span) => {
      span.className = 'time';
    },
  );
  const group = passage.querySelector('.compact-quote-time');
  const highlight = passage.querySelector('.time');
  return { passage, group, highlight };
}

describe('compact quote times', () => {
  it.each([
    ['en-US', 'At (', '6:55 PM', '), she arrived.', '(6:55 PM),'],
    ['en-GB', 'At (', '6:55 p.m.', '), she arrived.', '(6:55 p.m.),'],
    ['fr-FR', 'Il a écrit « ', '6 h 55', ' ».', '« 6 h 55 ».'],
    ['fr-FR', 'Il a écrit «\u202f(', '6 h 55', ')\u00a0» !', '«\u202f(6 h 55)\u00a0» !'],
    ['es-ES', 'Eran las «', '6:55 p. m.', '».', '«6:55 p. m.».'],
    ['de-DE', 'Um (', '6:55 Uhr', ').', '(6:55 Uhr).'],
    ['it-IT', 'Alle ', '6.55', ', poi', '6.55,'],
    ['pt-PT', 'Às ', '6h55', ', depois', '6h55,'],
    ['el-GR', 'Στις (', '6:55 π.μ.', '), τότε', '(6:55 π.μ.),'],
    ['ar-AE', 'عند (', '٦:٥٥ مساءً', ')، ثم', '(٦:٥٥ مساءً)،'],
    ['ru-RU', 'В «', '6:55 утра', '».', '«6:55 утра».'],
    ['eo', 'Je ', '18:55', ', poste', '18:55,'],
    ['ja-JP', '彼は「', '午後6時55分', '」と言った。', '「午後6時55分」'],
    ['zh-CN', '他在（', '下午6点55分', '）到达。', '（下午6点55分）'],
  ])('preserves the wording and highlights just the time in %s', (locale, before, time, after, expected) => {
    const { passage, group, highlight } = render(before, time, after, locale);
    expect(passage.textContent).toBe(before + time + after);
    expect(group?.textContent).toBe(expected);
    expect(group?.contains(highlight)).toBe(true);
    expect(highlight?.textContent).toBe(time);
  });

  it('keeps sentence punctuation outside the highlight even when stored inside the time', () => {
    const { group, highlight } = render('At ', '“6:55 PM.”', ' She paused.');
    expect(group?.textContent).toBe('“6:55 PM.”');
    expect(highlight?.textContent).toBe('6:55 PM');
  });

  it('groups adjacent seconds and punctuation with a compact highlighted time', () => {
    const { passage, group, highlight } = render(
      'Bien, dijiste. Tu voz fue tranquilizadora. ',
      '19:11',
      ':00, decía el reloj. Colgué el teléfono.',
      'es-ES',
    );
    expect(passage.textContent).toBe('Bien, dijiste. Tu voz fue tranquilizadora. 19:11:00, decía el reloj. Colgué el teléfono.');
    expect(group?.textContent).toBe('19:11:00,');
    expect(group?.contains(highlight)).toBe(true);
    expect(highlight?.textContent).toBe('19:11');
  });

  it('preserves inline markup and keeps forced line breaks outside the group', () => {
    const { passage, group, highlight } = render(
      'She said:<br><em>« </em>',
      '6 <strong>h 55</strong>',
      '<i> ».</i><br>Then she left.',
      'fr-FR',
    );
    expect(group?.textContent).toBe('« 6 h 55 ».');
    expect(group?.querySelector('br')).toBeNull();
    expect(group?.querySelector('em')?.textContent).toBe('« ');
    expect(highlight?.querySelector('strong')?.textContent).toBe('h 55');
    expect(group?.querySelector('i')?.textContent).toBe(' ».');
    expect(passage.querySelectorAll('br')).toHaveLength(2);
  });

  it.each(['five minutes before seven', '6:55 in the evening', '6:55<br>PM', '6:55\nPM'])(
    'allows a longer phrase or an explicit break to wrap normally (%s)',
    (time) => expect(render('At (', time, '), she arrived.').group).toBeNull(),
  );

  it('keeps adjacent words and punctuation across an ordinary English space out of the group', () => {
    const { group } = render('Before ', '6:55 PM', ' ! After.');
    expect(group?.textContent).toBe('6:55 PM');
  });

  it('groups the time by itself in fuzzy mode', () => {
    const { passage, group } = render('At (', '6:55 PM', '), she arrived.', 'en-US', true);
    expect(passage.textContent).toBe('6:55 PM');
    expect(group?.textContent).toBe('6:55 PM');
  });
});
