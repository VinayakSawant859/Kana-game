import { describe, expect, it } from "vitest";
import raw from "../../../data-raw/kanji_jlpt_only.json";
import { cleanMeanings } from "./clean-meanings";

describe("cleanMeanings", () => {
  it("cleans real KANJIDIC records and prioritizes Heisig meanings", () => {
    const records = raw as Record<string, { meanings: string[]; heisig_en: string | null }>;
    const clean = (character: string) => cleanMeanings(records[character].meanings, records[character].heisig_en);

    expect(clean("万")[0]).toBe("ten thousand");
    expect(clean("乳")[0]).toBe("milk");
    expect(clean("京")).not.toContain("10**16");
    expect(clean("一")).not.toContain("one radical (no.1)");
    expect(clean("匁")).toEqual(["monme"]);
    expect(clean("乙").join(" ").toLowerCase()).not.toContain("radical");
  });

  it("deduplicates case-insensitively and removes listed noise", () => {
    expect(cleanMeanings([
      " Meaning ", "meaning", "counter for days", "fishhook radical (no. 5)",
      "4th calendar sign", "(kokuji)", "10**16", "un-", "Esq.", "",
    ], null)).toEqual(["Meaning"]);
  });
});
