import { describe, expect, it } from "vitest";
import { groupRows, rowMetadata } from "@/data/kana";

const hira=/[\u3040-\u309f]/;
const kata=/[\u30a0-\u30ff]/;

describe("row metadata samples and order", () => {
  it("uses script-specific hiragana and katakana samples", () => {
    for (const row of rowMetadata) {
      if (row.group === "extended") {
        expect(kata.test(row.sample.katakana)).toBe(true);
        expect(row.sample.hiragana).toBe(row.sample.katakana);
      } else {
        expect(hira.test(row.sample.hiragana)).toBe(true);
        expect(kata.test(row.sample.katakana)).toBe(true);
      }
    }
  });
  it("exposes groups in fixed metadata order", () => {
    expect(Object.keys(groupRows)).toEqual(["basic","dakuten","yoon","extended"]);
  });
});
