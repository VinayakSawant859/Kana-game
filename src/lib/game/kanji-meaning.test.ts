import { describe, expect, it } from "vitest";
import { loadKanjiData, getKanjiPool } from "@/data/kanji";
import { createSeededRng } from "@/lib/game-core/random";
import {
  createKanjiMeaningSession,
  createKanjiMeaningState,
  kanjiMeaningReducer,
  meaningsConflict,
} from "./kanji-meaning";

describe("kanji meaning game", () => {
  it("includes only records with a non-empty label", async () => {
    const data = await loadKanjiData();
    expect(data.length).toBeGreaterThan(2000);
    for (const record of data) {
      expect(record.label.trim().length, record.c).toBeGreaterThan(0);
      expect(record.label.length, record.c).toBeLessThanOrEqual(40);
    }
  });

  it("filters pools by JLPT and grade and clamps to the available size", async () => {
    const pool = await getKanjiPool({ levels: [5], grades: [1] });
    expect(pool.length).toBeGreaterThan(10);
    expect(pool.every((record) => record.jlpt === 5 && record.grade === 1)).toBe(true);

    const smallPool = await getKanjiPool({ levels: [4], grades: [6] });
    const session = await createKanjiMeaningSession({ levels: [4], grades: [6], size: 10, sessionId: "small" });
    expect(session.questions.length).toBe(2);
    expect(session.settings.size).toBe(2);
    expect(session.questions.every((question) => smallPool.some((record) => record.c === question.kanji))).toBe(true);
  });

  it("is deterministic when its random source and session id are fixed", async () => {
    const selection = { levels: [5], grades: [1], size: 10 as const, sessionId: "fixed-session" };
    const first = await createKanjiMeaningSession(selection, createSeededRng(12345));
    const second = await createKanjiMeaningSession(selection, createSeededRng(12345));
    expect(first).toEqual(second);
  });

  it("creates unambiguous options in 200 seeded sessions", async () => {
    const data = await loadKanjiData();
    const byCharacter = new Map(data.map((record) => [record.c, record]));
    for (let seed = 0; seed < 200; seed += 1) {
      const session = await createKanjiMeaningSession(
        { levels: [5], grades: [1], size: 10, sessionId: `seed-${seed}` },
        createSeededRng(seed)
      );
      expect(session.questions).toHaveLength(10);
      expect(new Set(session.questions.map((question) => question.kanji)).size).toBe(10);
      for (const question of session.questions) {
        expect(question.optionKanji).toContain(question.kanji);
        expect(new Set(question.optionKanji).size).toBe(4);
        const correct = byCharacter.get(question.kanji)!;
        const options = question.optionKanji.map((id) => byCharacter.get(id)!);
        expect(new Set(options.map((option) => option.label)).size).toBe(4);
        for (const distractor of options.filter((option) => option.c !== question.kanji)) {
          expect(meaningsConflict(correct, distractor), `${question.kanji} vs ${distractor.c}`).toBe(false);
        }
      }
    }
  }, 30000);

  it("reduces correct, wrong, repeated answers, next and early end as a pure state transition", async () => {
    const data = await loadKanjiData();
    const session = await createKanjiMeaningSession(
      { levels: [5], grades: [1], size: 10, sessionId: "reducer-session" },
      createSeededRng(17)
    );
    const initial = createKanjiMeaningState(session, data, 1000);
    const firstQuestion = session.questions[0];
    const correctIndex = firstQuestion.optionKanji.indexOf(firstQuestion.kanji);
    const correct = kanjiMeaningReducer(initial, { type: "ANSWER", optionIndex: correctIndex, timeMs: 200, index: 0 });
    expect(correct.results[0].status).toBe("correct");
    expect(correct.results[0].timeMs).toBe(200);
    expect(kanjiMeaningReducer(correct, { type: "ANSWER", optionIndex: 0, timeMs: 10, index: 0 })).toBe(correct);
    expect(kanjiMeaningReducer(correct, { type: "ANSWER", optionIndex: 0, timeMs: 10, index: 1 })).toBe(correct);

    const second = kanjiMeaningReducer(correct, { type: "NEXT", index: 0 });
    const wrongIndex = session.questions[1].optionKanji.findIndex((option) => option !== session.questions[1].kanji);
    const wrong = kanjiMeaningReducer(second, { type: "ANSWER", optionIndex: wrongIndex, timeMs: 300, index: 1 });
    expect(wrong.results[1].status).toBe("wrong");
    expect(kanjiMeaningReducer(wrong, { type: "ANSWER", optionIndex: wrongIndex, timeMs: 1, index: 1 })).toBe(wrong);

    const ended = kanjiMeaningReducer(wrong, { type: "END" });
    expect(ended.endedEarly).toBe(true);
    expect(ended.results[0].status).toBe("correct");
    expect(ended.results.slice(2).every((record) => record.status === "unanswered")).toBe(true);
    expect(wrong.endedEarly).toBe(false);
  });
});
