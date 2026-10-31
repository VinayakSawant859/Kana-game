import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { createEmptyCard } from "ts-fsrs";
import { srsDb, type SrsItem } from "./db";
import {
  exportBackup,
  getAllSrsItems,
  getDueCards,
  importBackup,
  importCards,
  ingestKanaSession,
  ingestKanjiMeaningSession,
  ingestVocabularySession,
  Rating,
  recordReview,
} from "./service";

describe("FSRS service & Dexie database", () => {
  beforeEach(async () => {
    await srsDb.items.clear();
  });

  it("imports cards, queries due cards by type, and schedules next review with FSRS", async () => {
    const past = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + 86_400_000 * 5);

    const items: SrsItem[] = [
      {
        id: "kana:hiragana-あ",
        type: "kana",
        prompt: "あ",
        answer: "a",
        reading: "hiragana",
        card: createEmptyCard(past),
      },
      {
        id: "kanji:65E5",
        type: "kanji",
        level: "N5",
        prompt: "日",
        answer: "day, sun",
        reading: "ニチ · ひ",
        card: { ...createEmptyCard(past), due: future },
      },
    ];

    await importCards(items);

    const dueAll = await getDueCards();
    expect(dueAll.map((item) => item.id)).toEqual(["kana:hiragana-あ"]);

    const dueKana = await getDueCards("kana");
    expect(dueKana).toHaveLength(1);
    const dueKanji = await getDueCards("kanji");
    expect(dueKanji).toHaveLength(0);

    const now = new Date();
    const updated = await recordReview("kana:hiragana-あ", Rating.Good, now);
    expect(updated).toBeDefined();
    expect(updated!.card.reps).toBe(1);
    expect(updated!.card.stability).toBeGreaterThan(0);
    expect(updated!.card.due.getTime()).toBeGreaterThan(now.getTime());
    expect(updated!.lastReviewedAt).toBe(now.getTime());
  });

  it("exports and restores backup JSON with schema validation", async () => {
    const now = new Date("2026-10-30T12:00:00.000Z");
    await importCards([
      {
        id: "vocab:会う",
        type: "vocab",
        level: "N5",
        prompt: "会う",
        answer: "to meet",
        reading: "あう",
        card: createEmptyCard(now),
      },
    ]);

    const json = await exportBackup();
    await srsDb.items.clear();
    expect(await getAllSrsItems()).toHaveLength(0);

    const result = await importBackup(json);
    expect(result.count).toBe(1);

    const restored = await getAllSrsItems();
    expect(restored).toHaveLength(1);
    expect(restored[0].id).toBe("vocab:会う");
    expect(restored[0].card.due).toBeInstanceOf(Date);

    await expect(importBackup("not-json")).rejects.toThrow(/not valid JSON/i);
    await expect(importBackup(JSON.stringify([{ id: "bad" }]))).rejects.toThrow(
      /schema validation/i
    );
  });

  it("ingests completed Kana, Kanji, and Vocabulary sessions into srsDb", async () => {
    await ingestKanaSession([
      {
        id: "hiragana-あ",
        char: "あ",
        romaji: ["a"],
        script: "hiragana",
        group: "basic",
        row: "vowel",
        status: "correct-after-retry",
        mistakes: 1,
        wrongAnswers: ["o"],
      },
    ]);

    await ingestKanjiMeaningSession([
      {
        id: "日",
        kanji: "日",
        jlpt: 5,
        grade: 1,
        correctLabel: "day, sun",
        meanings: ["day", "sun"],
        on: ["ニチ"],
        kun: ["ひ"],
        strokes: 4,
        status: "wrong",
        chosenKanji: "月",
        chosenLabel: "month, moon",
        timeMs: 1200,
      },
    ]);

    await ingestVocabularySession([
      {
        word: "会う",
        reading: "あう",
        level: "N5",
        meanings: ["to meet"],
        status: "correct",
        attempts: ["to meet"],
      },
    ]);

    const all = await getAllSrsItems();
    expect(all.map((item) => item.type).sort()).toEqual(["kana", "kanji", "vocab"]);
  });
});

