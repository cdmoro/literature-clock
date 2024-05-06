import { expect, test, describe } from "vitest";
import { getTime } from "./utils";

describe("utils", () => {
  describe("getTime", () => {
    test("should return the time in the expected format", () => {
      const time = getTime();
      expect(time).match(/2/);
    });
  });
});
