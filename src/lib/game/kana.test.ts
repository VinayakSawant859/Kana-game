import { describe, expect, it } from "vitest";
import { checkAnswer, buildDeck, computeResult, normalizeAnswer } from "./kana";
import type { KanaCharacter } from "@/data/kana";

const shi: KanaCharacter = { id: "hi-shi", char: "し", script: "hiragana", group: "basic", row: "s", romaji: ["shi", "si"] };

describe("kana game engine", () => {
  it("normalizes case and whitespace", () => {
    expect(normalizeAnswer("  SHI  ")).toBe("shi");
    expect(checkAnswer(shi, " SI ")).toBe(true);
  });

  it("accepts romanization variants", () => {
    expect(checkAnswer(shi, "shi")).toBe(true);
    expect(checkAnswer(shi, "si")).toBe(true);
    expect(checkAnswer(shi, "sha")).toBe(false);
  });

  it("builds a shuffled deck without duplicates", () => {
    const deck = buildDeck({ sessionId: "test", script: "hiragana", rowKeys: ["basic:vowel", "basic:k"], questionCount: null }, () => 0.25);
    expect(deck.length).toBe(10);
    expect(new Set(deck.map((item) => item.id)).size).toBe(deck.length);
  });

  it("computes detailed session time data", () => {
    const result = computeResult("test", [], 1000, 61000, false);
    expect(result.cards).toEqual([]);
    expect(result.sessionId).toBe("test");
    expect(result.endedAt - result.startedAt).toBe(60000);
  });
});
