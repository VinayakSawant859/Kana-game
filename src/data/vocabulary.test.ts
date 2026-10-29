import { describe, expect, it } from "vitest";
import {
  availableVocabularyGrades,
  filterVocabulary,
  getVocabularyKanji,
  loadVocabularyData,
  normalizeVocabularyRecord,
  type VocabularyKanjiRecord,
  type VocabularyLevel,
  type VocabularyRecord,
} from "./vocabulary";

function record(
  id: string,
  word: string,
  reading: string,
  level: VocabularyLevel = "N5"
): VocabularyRecord {
  return {
    id,
    word,
    reading,
    romaji: "test",
    meanings: ["test meaning"],
    level,
    pos: [],
    examples: [],
  };
}

describe("OpenJLPT vocabulary data", () => {
  it("loads and normalizes level-specific vocabulary and kanji records", async () => {
    const data = await loadVocabularyData(["N5"]);
    expect(data.records).toHaveLength(674);
    expect(data.records.every((item) => item.level === "N5" && item.meanings.length > 0)).toBe(true);
    expect(data.records.find((item) => item.word === "会う")?.examples[0]).toMatchObject({
      ja: "もうスミスさんに会われましたね。",
      en: "You've met Mr. Smith already, haven't you?",
      furigana: "もうスミスさんに{会|あ}われましたね。",
    });
    expect(data.kanjiByCharacter.get("日")?.grade).toBe(1);
    expect(data.kanjiByCharacter.get("亜")?.grade).toBe(8);
    expect(availableVocabularyGrades(data.kanjiByCharacter)).toContain(8);
  });

  it("rejects empty level selections", async () => {
    await expect(loadVocabularyData([])).rejects.toThrow(/at least one JLPT level/);
  });

  it("rejects malformed or mismatched vocabulary records", () => {
    expect(normalizeVocabularyRecord(null, "N5")).toBeNull();
    expect(normalizeVocabularyRecord({ word: "会う" }, "N5")).toBeNull();
    expect(normalizeVocabularyRecord({
      id: "wrong-level",
      word: "会う",
      reading: "あう",
      romaji: "au",
      meanings: ["meet"],
      level: "N4",
      pos: [],
    }, "N5")).toBeNull();

    expect(normalizeVocabularyRecord({
      id: "valid",
      word: "会う",
      reading: "あう",
      romaji: "au",
      meanings: [" meet ", 42, ""],
      level: "N5",
      pos: [" v5u ", null],
      examples: [{ ja: "<img>", en: "plain text" }, { ja: "", en: "missing Japanese" }],
    }, "N5")).toMatchObject({
      meanings: ["meet"],
      pos: ["v5u"],
      examples: [{ ja: "<img>", en: "plain text" }],
    });
  });

  it("filters words using any known kanji in a selected grade and deduplicates word-reading pairs", () => {
    const kanjiByCharacter = new Map<string, VocabularyKanjiRecord>([
      ["食", { character: "食", level: "N5", grade: 2, meanings: ["eat"] }],
      ["学", { character: "学", level: "N5", grade: 1, meanings: ["study"] }],
    ]);
    const records = [
      record("a", "食べる", "たべる"),
      record("b", "食学", "しょくがく", "N4"),
      record("c", "かな", "かな"),
      record("d", "食べる", "たべる", "N4"),
      record("e", "食べる", "くう", "N4"),
    ];

    expect(filterVocabulary(records, { levels: ["N5", "N4"], grades: [1] }, kanjiByCharacter)
      .map((item) => item.id)).toEqual(["b"]);
    expect(filterVocabulary(records, { levels: ["N5", "N4"], grades: [2] }, kanjiByCharacter)
      .map((item) => item.id)).toEqual(["a", "b", "e"]);
    expect(filterVocabulary(records, { levels: ["N5", "N4"] }, kanjiByCharacter)
      .map((item) => item.id)).toEqual(["a", "b", "c", "e"]);
    expect(getVocabularyKanji("かな", kanjiByCharacter)).toEqual([]);
    expect(getVocabularyKanji("語", kanjiByCharacter)).toEqual([]);
  });

  it("loads all five JLPT levels without requiring a network request", async () => {
    const data = await loadVocabularyData(["N5", "N4", "N3", "N2", "N1"]);
    expect(new Set(data.records.map((item) => item.level))).toEqual(new Set(["N1", "N2", "N3", "N4", "N5"]));
    expect(data.records).toHaveLength(7811);
    expect(data.kanjiByCharacter.size).toBeGreaterThan(2000);
  });
});
