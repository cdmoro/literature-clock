import { describe, expect, test } from 'vitest';
import { setTextLocale, textDirection } from './text-direction';

describe('passage direction', () => {
  test.each([['ar-AE', 'rtl'], ['ar-AE-draft', 'rtl'], ['AR', 'rtl'], ['en-GB', 'ltr'], ['eo', 'ltr']])(
    '%s uses %s', (locale, direction) => expect(textDirection(locale)).toBe(direction),
  );
  test('switches direction and isolates a bilingual passage from its parent', () => {
    const parent = document.createElement('section');
    const passage = document.createElement('p');
    parent.append(passage);
    setTextLocale(parent, 'ar-AE');
    setTextLocale(passage, 'en-GB');
    expect(parent.dir).toBe('rtl');
    expect(passage.dir).toBe('ltr');
    setTextLocale(passage, 'ar-AE-draft');
    expect(passage.lang).toBe('ar-AE');
    expect(passage.dir).toBe('rtl');
    setTextLocale(passage, 'es-ES');
    expect(passage.dir).toBe('ltr');
  });
});
