import { describe, expect, it } from "vitest";
import { groupRows, type KanaGroup, type ScriptSelection } from "@/data/kana";
import {
  createKanaSession,
  createSessionState,
  finalize,
  sessionReducer,
} from "./session";

describe("Issue 1 & 3: createKanaSession pure function and deck construction", () => {
  it("shuffles once using injectable rng and returns { sessionId, settings, deckIds }", () => {
    let callCount = 0;
    const rng = () => {
      callCount++;
      return 0.5;
    };
    const session = createKanaSession(
      {
        script: "hiragana",
        rowKeys: ["basic:vowel"],
        questionCount: null,
      },
      rng,
    );
    expect(session.sessionId).toBeDefined();
    expect(session.settings.script).toBe("hiragana");
    expect(session.deckIds).toHaveLength(5);
    expect(callCount).toBeGreaterThan(0);
    expect(session.deckIds.every((id) => id.startsWith("hiragana-"))).toBe(true);
  });

  it("handles hiragana, katakana, both x basic, dakuten, yoon, extended", () => {
    const scripts: ScriptSelection[] = ["hiragana", "katakana", "both"];
    const groups: KanaGroup[] = ["basic", "dakuten", "yoon", "extended"];

    for (const script of scripts) {
      for (const group of groups) {
        if (script === "hiragana" && group === "extended") continue;
        const rowKeys = groupRows[group].map((r) => r.key);
        const session = createKanaSession({ script, rowKeys, questionCount: null }, () => 0.42);

        if (script === "hiragana") {
          expect(session.deckIds.every((id) => id.startsWith("hiragana-"))).toBe(true);
        } else if (script === "katakana") {
          expect(session.deckIds.every((id) => id.startsWith("katakana-"))).toBe(true);
        } else {
          // both
          if (group === "extended") {
            expect(session.deckIds.every((id) => id.startsWith("katakana-"))).toBe(true);
          } else {
            const hasHira = session.deckIds.some((id) => id.startsWith("hiragana-"));
            const hasKata = session.deckIds.some((id) => id.startsWith("katakana-"));
            expect(hasHira).toBe(true);
            expect(hasKata).toBe(true);
          }
        }
        expect(session.deckIds.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("Issue 1: Reducer state shape and tag matching", () => {
  it("initializes with { cards, index, phase, startedAt }", () => {
    const session = createKanaSession({ script: "hiragana", rowKeys: ["basic:vowel"], questionCount: null }, () => 0);
    const state = createSessionState(session.deckIds, 5000);
    expect(state.index).toBe(0);
    expect(state.phase).toBe("idle");
    expect(state.startedAt).toBe(5000);
    expect(state.cards).toHaveLength(5);
  });

  it("stale timer ADVANCE actions are ignored", () => {
    const session = createKanaSession({ script: "hiragana", rowKeys: ["basic:vowel"], questionCount: null }, () => 0);
    const state = createSessionState(session.deckIds, 5000);

    // Current index is 0
    // A stale advance with index: 99 should be ignored
    const unchanged = sessionReducer(state, { type: "ADVANCE", index: 99 });
    expect(unchanged.index).toBe(0);

    // Matching index advances
    const advanced = sessionReducer(state, { type: "ADVANCE", index: 0 });
    expect(advanced.index).toBe(1);
  });
});

describe("Issue 2: Result statuses, finalize, and scripted playthrough", () => {
  it("first try correct -> correct-first-try, mistakes 0", () => {
    const session = createKanaSession({ script: "hiragana", rowKeys: ["basic:vowel"], questionCount: 1 }, () => 0);
    let state = createSessionState(session.deckIds, 1000);
    const card = state.cards[state.index];
    state = sessionReducer(state, { type: "SUBMIT", answer: card.romaji[0] });
    expect(state.cards[0].status).toBe("correct-first-try");
    expect(state.cards[0].mistakes).toBe(0);

    const finalCards = finalize(state);
    expect(finalCards[0].status).toBe("correct-first-try");
    expect(finalCards[0].mistakes).toBe(0);
  });

  it("wrong then correct -> correct-after-retry, mistakes = wrong count, wrongAnswers typed", () => {
    const session = createKanaSession({ script: "hiragana", rowKeys: ["basic:vowel"], questionCount: 1 }, () => 0);
    let state = createSessionState(session.deckIds, 1000);
    const card = state.cards[state.index];
    state = sessionReducer(state, { type: "SUBMIT", answer: "bad1" });
    state = sessionReducer(state, { type: "SUBMIT", answer: "bad2" });
    state = sessionReducer(state, { type: "SUBMIT", answer: card.romaji[0] });

    expect(state.cards[0].status).toBe("correct-after-retry");
    expect(state.cards[0].mistakes).toBe(2);
    expect(state.cards[0].wrongAnswers).toEqual(["bad1", "bad2"]);

    const finalCards = finalize(state);
    expect(finalCards[0].status).toBe("correct-after-retry");
    expect(finalCards[0].mistakes).toBe(2);
    expect(finalCards[0].wrongAnswers).toEqual(["bad1", "bad2"]);
  });

  it("skip -> skipped, mistakes unchanged, survives finalize", () => {
    const session = createKanaSession({ script: "hiragana", rowKeys: ["basic:vowel"], questionCount: 2 }, () => 0);
    let state = createSessionState(session.deckIds, 1000);
    state = sessionReducer(state, { type: "SKIP" });
    expect(state.cards[0].status).toBe("skipped");
    expect(state.cards[0].mistakes).toBe(0);

    state = sessionReducer(state, { type: "ADVANCE", index: 0 });
    const finalCards = finalize(state);
    expect(finalCards[0].status).toBe("skipped");
    expect(finalCards[0].mistakes).toBe(0);
  });

  it("END pressed on current card -> that ONE is unfinished, never shown is not-reached", () => {
    const session = createKanaSession({ script: "hiragana", rowKeys: ["basic:vowel"], questionCount: 3 }, () => 0);
    let state = createSessionState(session.deckIds, 1000);
    // On card 0, answer wrong once, then END
    state = sessionReducer(state, { type: "SUBMIT", answer: "wrong" });
    state = sessionReducer(state, { type: "END" });

    const finalCards = finalize(state);
    expect(finalCards[0].status).toBe("unfinished");
    expect(finalCards[0].mistakes).toBe(1);
    expect(finalCards[1].status).toBe("not-reached");
    expect(finalCards[2].status).toBe("not-reached");
  });

  it("natural finish -> unfinished = 0, not-reached = 0", () => {
    const session = createKanaSession({ script: "hiragana", rowKeys: ["basic:vowel"], questionCount: 2 }, () => 0);
    let state = createSessionState(session.deckIds, 1000);

    // Card 0 correct
    state = sessionReducer(state, { type: "SUBMIT", answer: state.cards[0].romaji[0] });
    state = sessionReducer(state, { type: "ADVANCE", index: 0 });

    // Card 1 skipped
    state = sessionReducer(state, { type: "SKIP" });
    state = sessionReducer(state, { type: "ADVANCE", index: 1 });

    const finalCards = finalize(state);
    const unfinished = finalCards.filter((c) => c.status === "unfinished").length;
    const notReached = finalCards.filter((c) => c.status === "not-reached").length;
    expect(unfinished).toBe(0);
    expect(notReached).toBe(0);
  });

  it("scripted full-playthrough test over 25 cards", () => {
    // 25 dakuten cards
    const rowKeys = groupRows.dakuten.map((r) => r.key);
    const session = createKanaSession({ script: "hiragana", rowKeys, questionCount: 25 }, () => 0.1);
    expect(session.deckIds).toHaveLength(25);

    let state = createSessionState(session.deckIds, 1000);

    // Cards 1-10 (indices 0..9): correct first try
    for (let i = 0; i < 10; i++) {
      expect(state.index).toBe(i);
      const card = state.cards[state.index];
      state = sessionReducer(state, { type: "SUBMIT", answer: card.romaji[0] });
      state = sessionReducer(state, { type: "ADVANCE", index: i });
    }

    // Cards 11-15 (indices 10..14): wrong once then right
    for (let i = 10; i < 15; i++) {
      expect(state.index).toBe(i);
      const card = state.cards[state.index];
      state = sessionReducer(state, { type: "SUBMIT", answer: "bad_guess" });
      state = sessionReducer(state, { type: "SUBMIT", answer: card.romaji[0] });
      state = sessionReducer(state, { type: "ADVANCE", index: i });
    }

    // Cards 16-20 (indices 15..19): skipped
    for (let i = 15; i < 20; i++) {
      expect(state.index).toBe(i);
      state = sessionReducer(state, { type: "SKIP" });
      state = sessionReducer(state, { type: "ADVANCE", index: i });
    }

    // Card 21 (index 20): answered wrong twice then END
    expect(state.index).toBe(20);
    state = sessionReducer(state, { type: "SUBMIT", answer: "wrong1" });
    state = sessionReducer(state, { type: "SUBMIT", answer: "wrong2" });
    state = sessionReducer(state, { type: "END" });

    const finalCards = finalize(state);

    const firstTry = finalCards.filter((c) => c.status === "correct-first-try").length;
    const afterRetries = finalCards.filter((c) => c.status === "correct-after-retry").length;
    const skipped = finalCards.filter((c) => c.status === "skipped").length;
    const unfinished = finalCards.filter((c) => c.status === "unfinished").length;
    const notReached = finalCards.filter((c) => c.status === "not-reached").length;
    const totalMistakes = finalCards.reduce((sum, c) => sum + c.mistakes, 0);

    expect(firstTry).toBe(10);
    expect(afterRetries).toBe(5);
    expect(skipped).toBe(5);
    expect(unfinished).toBe(1);
    expect(notReached).toBe(4);
    expect(totalMistakes).toBe(7); // 5 from cards 11-15 + 2 from card 21

    // Invariants check
    expect(unfinished).toBeLessThanOrEqual(1);
    expect(firstTry + afterRetries + skipped + unfinished + notReached).toBe(25);
    expect(finalCards.some((c) => c.mistakes > 0 && c.status === "not-reached")).toBe(false);
  });
});
