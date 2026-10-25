import { describe, expect, it } from "vitest";
import { buildDeck, checkAnswer, normalizeAnswer } from "./kana";
import { createSessionState, sessionReducer } from "./session";
import type { KanaCharacter } from "@/data/kana";

const characters: KanaCharacter[] = [
  { id: "hiragana-あ", char: "あ", script: "hiragana", group: "basic", row: "vowel", romaji: ["a"] },
  { id: "hiragana-か", char: "か", script: "hiragana", group: "basic", row: "k", romaji: ["ka"] },
];

describe("deck building", () => {
  it("builds set-only decks and rejects hiragana extended", () => {
    expect(buildDeck({ sessionId: "1", script: "hiragana", rowKeys: ["basic:g"], questionCount: null }, () => 0).length).toBe(0);
    expect(buildDeck({ sessionId: "1", script: "hiragana", rowKeys: ["basic:vowel", "basic:k"], questionCount: null }, () => 0).length).toBe(10);
  });
  it("supports katakana, both, characterIds, and custom counts", () => {
    const kata = buildDeck({ sessionId: "1", script: "katakana", rowKeys: ["basic:vowel"], questionCount: null }, () => 0.2);
    expect(kata.every((item) => item.script === "katakana")).toBe(true);
    const both = buildDeck({ sessionId: "1", script: "both", rowKeys: ["basic:vowel"], questionCount: null }, () => 0.2);
    expect(both).toHaveLength(10);
    expect(buildDeck({ sessionId: "1", script: "both", rowKeys: [], questionCount: 8, characterIds: [characters[0].id] }, () => 0.2)).toEqual([characters[0]]);
  });
});

describe("answer checking", () => {
  it("normalizes and accepts extended variants", () => {
    expect(normalizeAnswer(" SHA ")).toBe("sha");
    const fa: KanaCharacter = { id: "katakana-ファ", char: "ファ", script: "katakana", group: "extended", row: "fa", romaji: ["fa", "hwa"] };
    expect(checkAnswer(fa, "hwa")).toBe(true);
  });
});

describe("session reducer", () => {
  it("wrong keeps the card, records mistake and typed answer", () => {
    let state = createSessionState([characters[0]], 1000);
    state = sessionReducer(state, { type: "SUBMIT", answer: "wrong" });
    expect(state.currentIndex).toBe(0);
    expect(state.cards[0].mistakes).toBe(1);
    expect(state.cards[0].wrongAnswers).toEqual(["wrong"]);
  });
  it("first try, retry, skip, empty, and END", () => {
    let state = createSessionState(characters, 1000);
    state = sessionReducer(state, { type: "SUBMIT", answer: "a" });
    expect(state.cards[0].status).toBe("correct-first-try");
    state = sessionReducer(state, { type: "ADVANCE" });
    state = sessionReducer(state, { type: "SUBMIT", answer: "bad" });
    state = sessionReducer(state, { type: "SUBMIT", answer: "ka" });
    expect(state.cards[1].status).toBe("correct-after-retry");
    state = sessionReducer(state, { type: "ADVANCE" });
    state = sessionReducer(sessionReducer(state, { type: "SKIP" }), { type: "ADVANCE" });
    const ended = sessionReducer(createSessionState(characters, 1000), { type: "END" });
    expect(ended.cards[0].status).toBe("unfinished");
    expect(ended.cards[1].status).toBe("not-reached");
    expect(sessionReducer(state, { type: "SUBMIT", answer: "  " })).toEqual(state);
  });
});
