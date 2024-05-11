import { describe, expect, test } from "vitest";
import { getFaviconFileName } from "./utils";

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

describe("getFaviconFileName", () => {
  test("should return expected favicon file name", () => {
    Object.entries(TIMES).forEach(([time, fileName]) => {
      expect(getFaviconFileName(time)).toEqual(fileName);
    });
  });
});
