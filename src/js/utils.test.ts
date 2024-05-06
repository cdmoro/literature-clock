import { expect, test, describe } from "vitest";
import { fallbackQuote } from "./utils";

describe("utils", () => {
  describe("fallbackQuote", () => {
    test("should return a complete Quote object", () => {
      const quote = fallbackQuote({
        quote_first: "Error ",
        quote_last: ": quote not found.",
        title: "Internet Explorer",
        author: "1995-2022",
      });

      expect(quote).toEqual({
        quote_first: "Error ",
        quote_last: ": quote not found.",
        title: "Internet Explorer",
        author: "1995-2022",
        id: "",
        time: "",
        quote_time_case: "",
        sfw: "sfw",
      });
    });

    test("should overwrite default fields", () => {
      const quote = fallbackQuote({
        quote_first: "Error ",
        quote_last: ": quote not found.",
        title: "Internet Explorer",
        author: "1995-2022",
        sfw: "nsfw",
      });

      expect(quote).toEqual({
        quote_first: "Error ",
        quote_last: ": quote not found.",
        title: "Internet Explorer",
        author: "1995-2022",
        id: "",
        time: "",
        quote_time_case: "",
        sfw: "nsfw",
      });
    });
  });
});
