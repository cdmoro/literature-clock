import { describe, expect, test, vi } from "vitest";
import { getFaviconFileName, getDayProgress } from "./utils";

describe("getFaviconFileName", () => {
  test("should return expected favicon file name", () => {
    const TIMES = {
      "02:03": "02_00",
      "14:03": "02_00",
      "02:00": "02_00",
      "02:30": "02_30",
      "00:00": "00_00",
      "12:00": "00_00",
      "02:49": "02_30",
      "14:49": "02_30",
      "10:49": "10_30",
      "22:49": "10_30",
    };

    Object.entries(TIMES).forEach(([time, fileName]) => {
      expect(getFaviconFileName(time)).toEqual(fileName);
    });
  });
});

describe("getDayProgress", () => {
  test("should return expected progress of the day", () => {
    vi.useFakeTimers();

    const PROGRESS = {
      "0": new Date(2024, 5, 11, 0, 0, 0),
      "25": new Date(2024, 5, 11, 6, 0, 0),
      "32.78": new Date(2024, 5, 11, 7, 52, 6),
      "50": new Date(2024, 5, 11, 12, 0, 0),
      "60.83": new Date(2024, 5, 11, 14, 36, 0),
      "75": new Date(2024, 5, 11, 18, 0, 0),
      "100": new Date(2024, 5, 11, 23, 59, 59),
    };

    Object.entries(PROGRESS).forEach(([progress, date]) => {
      vi.setSystemTime(date);

      expect(getDayProgress()).toEqual(parseFloat(progress));
    });

    vi.useRealTimers();
  });
});
