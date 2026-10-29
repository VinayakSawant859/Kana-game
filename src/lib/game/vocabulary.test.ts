import { describe, expect, it } from "vitest";
import {
  filterVocabulary,
  type VocabularyData,
  type VocabularyRecord,
} from "@/data/vocabulary";
import { createSeededRng } from "@/lib/game-core/random";
import {
  BASE_QUESTION_SCORE,
  FURIGANA_HINT_COST,
  KANJI_HINT_COST,
  buildVocabularyResult,
  calculateVocabularyReport,
  createVocabularySession,
  createVocabularyState,
  getPotentialScore,
  isCorrectVocabularyAnswer,
  normalizeMeaningAnswer,
  parseExampleFurigana,
  vocabularyReducer,
} from "./vocabulary";

const words: VocabularyRecord[] = [
  {
    id: "taberu",
    word: "食べる",
    reading: "たべる",
    romaji: "taberu",
    meanings: ["to eat", "eat"],
    level: "N5",
    pos: ["v1"],
    examples: [{ ja: "りんごを食べる。", en: "Eat an apple." }],
  },
  {
    id: "kana-only",
    word: "ありがとう",
    reading: "ありがとう",
    romaji: "arigatou",
    meanings: ["thank you"],
    level: "N5",
    pos: ["int"],
    examples: [],
  },
  {
    id: "gakkou",
    word: "学校",
    reading: "がっこう",
    romaji: "gakkou",
    meanings: ["school"],
    level: "N4",
    pos: ["n"],
    examples: [],
  },
];

const data: VocabularyData = {
  records: words,
  kanjiByCharacter: new Map([
    ["食", { character: "食", level: "N5", grade: 2, meanings: ["eat", "food"] }],
    ["学", { character: "学", level: "N5", grade: 1, meanings: ["study", "learning"] }],
    ["校", { character: "校", level: "N5", grade: 1, meanings: ["school"] }],
  ]),
};

function makeSession(size: 10 | 20 | 30 | "all" = "all") {
  return createVocabularySession(
    { levels: ["N5", "N4"], grades: [], size, sessionId: "test-session" },
    data,
    createSeededRng(7)
  );
}

function questionIndex(state: ReturnType<typeof createVocabularyState>, id: string): number {
  return state.questions.findIndex((question) => question.id === id);
}

describe("vocabulary game logic", () => {
  it("normalizes case, whitespace, and punctuation without accepting substrings", () => {
    expect(normalizeMeaningAnswer("  TO   EAT! ")).toBe("to eat");
    expect(isCorrectVocabularyAnswer("EAT.", ["to eat", "eat"])).toBe(true);
    expect(isCorrectVocabularyAnswer("eating", ["eat"])).toBe(false);
    expect(isCorrectVocabularyAnswer("school teacher", ["school"])).toBe(false);
    expect(isCorrectVocabularyAnswer("  ", ["school"])).toBe(false);
  });

  it("generates unique eligible question IDs, supports all, and rejects empty or insufficient pools", () => {
    const session = makeSession();
    expect(session.questionIds).toHaveLength(3);
    expect(new Set(session.questionIds).size).toBe(3);
    expect(filterVocabulary(data.records, { levels: ["N5"] }, data.kanjiByCharacter))
      .toHaveLength(2);
    expect(() => createVocabularySession(
      { levels: ["N5"], grades: [8], size: 10 },
      data,
      createSeededRng(1)
    )).toThrow(/No vocabulary matches/);
    expect(() => createVocabularySession(
      { levels: ["N5"], grades: [], size: 10 },
      data,
      createSeededRng(1)
    )).toThrow(/Not enough vocabulary/);
  });

  it("deducts stacked hints only from the current question and awards points only on correct submission", () => {
    expect(getPotentialScore({ furiganaHintUsed: true, kanjiHints: ["食"] }))
      .toBe(BASE_QUESTION_SCORE - FURIGANA_HINT_COST - KANJI_HINT_COST);
    expect(getPotentialScore({ furiganaHintUsed: true, kanjiHints: ["食", "学", "校", "他", "字", "語"] }))
      .toBe(0);

    let state = createVocabularyState({
      sessionId: "points-session",
      settings: { levels: ["N5"], grades: [], size: "all" },
      questionIds: ["kana-only", "taberu"],
    }, data, 1000);
    state = vocabularyReducer(state, { type: "SUBMIT", answer: "thank you", index: 0 });
    expect(state.results[0].pointsEarned).toBe(BASE_QUESTION_SCORE);
    state = vocabularyReducer(state, { type: "NEXT", index: 0 });
    const taberuIndex = state.index;
    state = vocabularyReducer(state, { type: "HINT_FURIGANA", index: taberuIndex });
    state = vocabularyReducer(state, { type: "HINT_KANJI", character: "食", index: taberuIndex });
    expect(state.results[taberuIndex].pointsEarned).toBe(0);
    expect(vocabularyReducer(state, { type: "HINT_KANJI", character: "食", index: taberuIndex }))
      .toBe(state);
    state = vocabularyReducer(state, { type: "SUBMIT", answer: "something unrelated", index: taberuIndex });
    expect(state.results[taberuIndex].pointsEarned).toBe(0);
    expect(state.results[taberuIndex].attempts).toEqual(["something unrelated"]);
    state = vocabularyReducer(state, { type: "SUBMIT", answer: "TO EAT!", index: taberuIndex });
    expect(state.results[taberuIndex].status).toBe("correct");
    expect(state.results[taberuIndex].pointsEarned).toBe(65);
    expect(state.results[0].pointsEarned).toBe(BASE_QUESTION_SCORE);
  });

  it("handles kana-only words and missing kanji hint metadata", () => {
    let state = createVocabularyState(makeSession(), data, 1000);
    const kanaIndex = questionIndex(state, "kana-only");
    expect(state.questions[kanaIndex].kanji).toEqual([]);
    const before = state;
    state = vocabularyReducer(state, { type: "HINT_KANJI", character: "あ", index: kanaIndex });
    expect(state).toBe(before);
    state = vocabularyReducer(state, { type: "HINT_FURIGANA", index: kanaIndex });
    expect(state.results[kanaIndex].furiganaHintUsed).toBe(true);
  });

  it("reveals one selected kanji at a time for compounds and never repeats a revealed hint", () => {
    let state = createVocabularyState({
      sessionId: "compound-session",
      settings: { levels: ["N4"], grades: [], size: "all" },
      questionIds: ["gakkou"],
    }, data, 1000);
    expect(state.questions[0].kanji.map((kanji) => kanji.character)).toEqual(["学", "校"]);

    state = vocabularyReducer(state, { type: "HINT_KANJI", character: "校", index: 0 });
    expect(state.results[0].kanjiHints).toEqual(["校"]);
    expect(getPotentialScore(state.results[0])).toBe(85);
    const revealedOnce = state;
    state = vocabularyReducer(state, { type: "HINT_KANJI", character: "校", index: 0 });
    expect(state).toBe(revealedOnce);
    state = vocabularyReducer(state, { type: "HINT_KANJI", character: "学", index: 0 });
    expect(state.results[0].kanjiHints).toEqual(["校", "学"]);
    expect(getPotentialScore(state.results[0])).toBe(70);
  });

  it("records retries, skips, early unanswered questions, hints, and report totals", () => {
    const session = makeSession();
    let state = createVocabularyState(session, data, 1000);
    const first = state.questions[state.index];
    state = vocabularyReducer(state, { type: "SUBMIT", answer: "wrong answer", index: state.index });
    state = vocabularyReducer(state, {
      type: "SUBMIT",
      answer: first.meanings[0],
      index: state.index,
    });
    state = vocabularyReducer(state, { type: "NEXT", index: state.index });

    const second = state.questions[state.index];
    state = vocabularyReducer(state, { type: "HINT_FURIGANA", index: state.index });
    state = vocabularyReducer(state, { type: "SUBMIT", answer: "incorrect", index: state.index });
    state = vocabularyReducer(state, { type: "SKIP", index: state.index });
    state = vocabularyReducer(state, { type: "NEXT", index: state.index });
    state = vocabularyReducer(state, { type: "END" });

    const result = buildVocabularyResult(state, 61000);
    const report = calculateVocabularyReport(result);
    expect(result.questions.find((item) => item.id === first.id)?.status).toBe("correct");
    expect(result.questions.find((item) => item.id === second.id)?.status).toBe("skipped");
    expect(report).toMatchObject({
      total: 3,
      attempted: 2,
      firstTryCorrect: 0,
      correctAfterRetries: 1,
      incorrect: 2,
      incorrectAttempts: 2,
      skipped: 1,
      unanswered: 1,
      hintsUsed: 1,
      pointsDeducted: 20,
      accuracy: 50,
      completionTime: 60000,
    });
    expect(report.score).toBe(100);
    expect(report.maximumScore).toBe(300);
    expect(JSON.stringify(result)).not.toContain('"word"');
  });

  it("reports all skipped and unanswered questions correctly after an early end", () => {
    const session = makeSession();
    let state = createVocabularyState(session, data, 500);
    state = vocabularyReducer(state, { type: "SKIP", index: 0 });
    state = vocabularyReducer(state, { type: "END" });
    const result = buildVocabularyResult(state, 1500);
    expect(calculateVocabularyReport(result)).toMatchObject({
      skipped: 1,
      unanswered: 2,
      attempted: 0,
      score: 0,
      accuracy: 0,
    });
    expect(result.endedEarly).toBe(true);
  });

  it("parses example furigana as plain text segments and preserves malformed markers safely", () => {
    expect(parseExampleFurigana("もう{会|あ}いましょう。")).toEqual([
      { text: "もう" },
      { text: "会", reading: "あ" },
      { text: "いましょう。" },
    ]);
    expect(parseExampleFurigana("<img src=x onerror=alert(1)> {bad marker}")).toEqual([
      { text: "<img src=x onerror=alert(1)> {bad marker}" },
    ]);
  });
});
