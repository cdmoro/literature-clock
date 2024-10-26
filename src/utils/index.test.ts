import { describe, expect, test } from 'vitest';
import { getFaviconFileName } from '.';

describe('getFaviconFileName', () => {
  const TIMES = {
    '02:03': '02_00',
    '14:03': '02_00',
    '02:00': '02_00',
    '02:30': '02_30',
    '00:00': '00_00',
    '12:00': '00_00',
    '02:49': '02_30',
    '14:49': '02_30',
    '10:49': '10_30',
    '22:49': '10_30',
  };

  Object.entries(TIMES).forEach(([time, fileName]) => {
    test(`should return ${fileName} file name with ${time}`, () => {
      expect(getFaviconFileName(time)).toEqual(fileName);
    });
  });
});
