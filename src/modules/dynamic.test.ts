import { afterEach, describe, expect, test, vi } from 'vitest';
import { getDayParameters, getDayProgress, getSkyParameters, setDayParameters } from './dynamic';

vi.mock('../store', () => {
  return {
    store: {
      get: () => '',
    },
  };
});

const PROGRESS = {
  '0': new Date(2024, 5, 11, 0, 0, 0),
  '16.67': new Date(2024, 5, 11, 4, 0, 0),
  '25': new Date(2024, 5, 11, 6, 0, 0),
  '32.78': new Date(2024, 5, 11, 7, 52, 6),
  '33.33': new Date(2024, 5, 11, 8, 0, 0),
  '37.5': new Date(2024, 5, 11, 9, 0, 0),
  '45.83': new Date(2024, 5, 11, 11, 0, 0),
  '50': new Date(2024, 5, 11, 12, 0, 0),
  '60.83': new Date(2024, 5, 11, 14, 36, 0),
  '75': new Date(2024, 5, 11, 18, 0, 0),
  '79.17': new Date(2024, 5, 11, 19, 0, 0),
  '100': new Date(2024, 5, 11, 23, 59, 59),
};

describe('getDayProgress', () => {
  const formatDate = (date: Date) =>
    `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  Object.entries(PROGRESS).forEach(([progress, date]) => {
    test(`should return ${progress}% for ${formatDate(date)}`, () => {
      vi.useFakeTimers();
      vi.setSystemTime(date);

      expect(getDayProgress()).toEqual(parseFloat(progress));
    });

    vi.useRealTimers();
  });
});

describe('getDayParameters', () => {
  const dayParameterResponse = (scene: string, period: string, segment: number, progress: number) => ({
    scene,
    period,
    segment,
    progress,
  });

  const PARAMETERS = {
    '0': dayParameterResponse('night', 'am', 0, 0),
    '16.67': dayParameterResponse('night', 'am', 1, 16.67),
    '25': dayParameterResponse('morning', 'am', 2, 25),
    '32.78': dayParameterResponse('morning', 'am', 3, 32.78),
    '33.33': dayParameterResponse('morning', 'am', 3, 33.33),
    '37.5': dayParameterResponse('morning', 'am', 3, 37.5),
    '45.83': dayParameterResponse('morning', 'am', 4, 45.83),
    '50': dayParameterResponse('morning', 'pm', 4, 50),
    '60.83': dayParameterResponse('afternoon', 'pm', 5, 60.83),
    '75': dayParameterResponse('evening', 'pm', 6, 75),
    '79.17': dayParameterResponse('evening', 'pm', 6, 79.17),
    '100': dayParameterResponse('night', 'pm', 8, 100),
  };

  Object.entries(PROGRESS).forEach(([progress, date]) => {
    test(`should return expected parameters for ${progress}%`, () => {
      vi.useFakeTimers();
      vi.setSystemTime(date);

      expect(getDayParameters()).toEqual(PARAMETERS[progress as keyof typeof PARAMETERS]);
    });

    vi.useRealTimers();
  });
});


afterEach(() => vi.useRealTimers());

describe('continuous sky', () => {
  test('wraps seamlessly at midnight', () => {
    expect(getSkyParameters(100)).toEqual(getSkyParameters(0));
    const before = getSkyParameters(99.999);
    const after = getSkyParameters(0.001);
    expect(before.moon.x).toBeCloseTo(after.moon.x, 1);
    expect(before.moon.y).toBeCloseTo(after.moon.y, 1);
  });

  test('the sun rises, culminates, and sets along an arc', () => {
    const rise = getSkyParameters(5.5 / 0.24).sun;
    const noon = getSkyParameters(12.5 / 0.24).sun;
    const set = getSkyParameters(19.5 / 0.24).sun;
    expect(rise.x).toBeLessThan(noon.x);
    expect(noon.x).toBeLessThan(set.x);
    expect(noon.y).toBeLessThan(rise.y);
    expect(noon.y).toBeLessThan(set.y);
    expect(rise.opacity).toBeCloseTo(0);
    expect(set.opacity).toBeCloseTo(0);
  });

  test('scene boundaries do not teleport the sun or switch palettes', () => {
    for (const hour of [5, 12, 17, 21]) {
      const before = getSkyParameters((hour - 0.001) / 0.24);
      const after = getSkyParameters((hour + 0.001) / 0.24);
      expect(before.daylight).toBeCloseTo(after.daylight, 2);
      expect(before.sun.y).toBeCloseTo(after.sun.y, 1);
    }
  });

  test('reuses one decorative layer and refreshes the lunar phase', () => {
    document.body.innerHTML = '<main></main>';
    setDayParameters();
    setDayParameters();
    expect(document.querySelectorAll('.living-sky')).toHaveLength(1);
    expect(document.querySelector('.living-sky')?.getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('.sky-moon')?.getAttribute('data-lunar-phase')).toBeTruthy();
  });
});
