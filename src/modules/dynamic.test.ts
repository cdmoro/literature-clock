import { describe, expect, test, vi } from "vitest";
import { getDayParameters, getDayProgress } from "./dynamic";

const PROGRESS = {
  "0": new Date(2024, 5, 11, 0, 0, 0),
  "16.67": new Date(2024, 5, 11, 4, 0, 0),
  "25": new Date(2024, 5, 11, 6, 0, 0),
  "32.78": new Date(2024, 5, 11, 7, 52, 6),
  "33.33": new Date(2024, 5, 11, 8, 0, 0),
  "37.5": new Date(2024, 5, 11, 9, 0, 0),
  "45.83": new Date(2024, 5, 11, 11, 0, 0),
  "50": new Date(2024, 5, 11, 12, 0, 0),
  "60.83": new Date(2024, 5, 11, 14, 36, 0),
  "75": new Date(2024, 5, 11, 18, 0, 0),
  "79.17": new Date(2024, 5, 11, 19, 0, 0),
  "100": new Date(2024, 5, 11, 23, 59, 59),
};

describe("getDayProgress", () => {
  const formatDate = (date: Date) =>
    `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

  Object.entries(PROGRESS).forEach(([progress, date]) => {
    test(`should return ${progress}% for ${formatDate(date)}`, () => {
      vi.useFakeTimers();
      vi.setSystemTime(date);

      expect(getDayProgress()).toEqual(parseFloat(progress));
    });

    vi.useRealTimers();
  });
});

describe("getDayParameters", () => {
  const dayParameterResponse = (
    scene: string,
    actor: string,
    opacity: number,
    progress: number
  ) => ({ scene, actor, opacity, progress });

  const PARAMETERS = {
    "0": dayParameterResponse("dawn", "moon", 0, 0),
    "16.67": dayParameterResponse("dawn", "moon", 0.33, 16.67),
    "25": dayParameterResponse("sunrise", "sun", 0.5, 25),
    "32.78": dayParameterResponse("sunrise", "sun", 0.66, 32.78),
    "33.33": dayParameterResponse("sunrise", "sun", 0.67, 33.33),
    "37.5": dayParameterResponse("sunrise", "sun", 0.75, 37.5),
    "45.83": dayParameterResponse("sunrise", "sun", 0.92, 45.83),
    "50": dayParameterResponse("sunset", "sun", 1, 50),
    "60.83": dayParameterResponse("sunset", "sun", 0.78, 60.83),
    "75": dayParameterResponse("dusk", "moon", 0.5, 75),
    "79.17": dayParameterResponse("dusk", "moon", 0.42, 79.17),
    "100": dayParameterResponse("dusk", "moon", 0, 100),
  };

  Object.entries(PROGRESS).forEach(([progress, date]) => {
    test(`should return expected parameters for ${progress}%`, () => {
      vi.useFakeTimers();
      vi.setSystemTime(date);

      expect(getDayParameters()).toEqual(
        PARAMETERS[progress as keyof typeof PARAMETERS]
      );
    });

    vi.useRealTimers();
  });
});
