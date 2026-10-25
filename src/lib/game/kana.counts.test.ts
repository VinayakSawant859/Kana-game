import { describe, expect, it } from "vitest";
import { countCharacters, getCharacters, groupRows, type KanaGroup, type ScriptSelection } from "@/data/kana";
import { buildDeck } from "./kana";

describe("metadata-driven deck counts", () => {
  for (const script of ["hiragana", "katakana", "both"] as ScriptSelection[]) {
    for (const group of ["basic", "dakuten", "yoon", "extended"] as KanaGroup[]) {
      it(`${script} ${group} has unique valid cards`, () => {
        if (script === "hiragana" && group === "extended") {
          expect(countCharacters({ script, rowKeys: groupRows.extended.map((row) => row.key) })).toBe(0);
          return;
        }
        const rowKeys = groupRows[group].map((row) => row.key);
        const deck = buildDeck({ sessionId: "count", script, rowKeys, questionCount: null }, () => 0.5);
        const expected = group === "basic" ? (script === "both" ? 92 : 46) : group === "dakuten" ? (script === "both" ? 50 : 25) : group === "yoon" ? (script === "both" ? 66 : 33) : 29;
        expect(deck).toHaveLength(expected);
        expect(new Set(deck.map((card) => card.id)).size).toBe(deck.length);
        expect(deck.every((card) => script === "both" || card.script === script)).toBe(true);
        expect(deck.every((card) => card.group === group)).toBe(true);
      });
    }
  }
  it("uses characterIds mode and custom clamping", () => {
    const ids = getCharacters({ script: "both", rowKeys: [], characterIds: ["hiragana-か", "hiragana-し"] }).map((card) => card.id);
    expect(ids).toEqual(["hiragana-か", "hiragana-し"]);
    expect(buildDeck({ sessionId: "custom", script: "hiragana", rowKeys: ["basic:vowel"], questionCount: 3 }, () => 0.5)).toHaveLength(3);
  });
});
