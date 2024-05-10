import { describe, expect, test } from "vitest";
import { getFaviconFileName } from "./utils";

describe("getFaviconFileName", () => {
  test("should return favicon name with AM times", () => {
    const faviconHref = getFaviconFileName("02:03");
    expect(faviconHref).toEqual("02_00");
  });

  test("should return favicon name with PM times", () => {
    const faviconHref = getFaviconFileName("14:03");
    expect(faviconHref).toEqual("02_00");
  });

  test("should return favicon name with sharp AM times", () => {
    const faviconHref = getFaviconFileName("02:00");
    expect(faviconHref).toEqual("02_00");
  });

  test("should return favicon name with sharp half AM times", () => {
    const faviconHref = getFaviconFileName("02:30");
    expect(faviconHref).toEqual("02_30");
  });

  test("should return favicon name at midnight", () => {
    const faviconHref = getFaviconFileName("00:00");
    expect(faviconHref).toEqual("00_00");
  });

  test("should return favicon name at midday", () => {
    const faviconHref = getFaviconFileName("12:00");
    expect(faviconHref).toEqual("00_00");
  });
});
