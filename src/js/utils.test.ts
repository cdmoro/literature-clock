import { expect, test, describe } from "vitest";
import { fallbackQuote } from "./utils";
import { Quote } from "./types";

const partialQuote: Partial<Quote> = {
  quote_first: "Error ",
  quote_last: ": quote not found.",
  title: "Internet Explorer",
  author: "1995-2022",
};

describe("utils", () => {
  describe("fallbackQuote", () => {
    test("should return a complete Quote object", () => {
      const quote = fallbackQuote(partialQuote);

      expect(quote).toEqual({
        ...partialQuote,
        id: "",
        time: "",
        quote_time_case: "",
        sfw: "sfw",
      });
    });

    test("should overwrite default fields", () => {
      const quote = fallbackQuote({
        ...partialQuote,
        sfw: "nsfw",
      });

      expect(quote).toEqual({
        ...partialQuote,
        id: "",
        time: "",
        quote_time_case: "",
        sfw: "nsfw",
      });
    });
  });
});
