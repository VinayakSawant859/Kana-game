export const vocabularyLevels = ["N5", "N4", "N3", "N2", "N1"] as const;

export type VocabularyLevel = (typeof vocabularyLevels)[number];

export interface VocabularyExample {
  ja: string;
  furigana?: string;
  en: string;
  tatoebaId?: number;
}

export interface VocabularyRecord {
  id: string;
  word: string;
  reading: string;
  romaji: string;
  meanings: string[];
  level: VocabularyLevel;
  pos: string[];
  examples: VocabularyExample[];
}

export interface VocabularyKanjiRecord {
  character: string;
  level: VocabularyLevel;
  grade: number | null;
  meanings: string[];
}

export interface VocabularyData {
  records: VocabularyRecord[];
  kanjiByCharacter: Map<string, VocabularyKanjiRecord>;
}

type JsonModule = { default: unknown };

const vocabularyLoaders: Record<VocabularyLevel, () => Promise<JsonModule>> = {
  N5: () => import("./openjlpt/vocab/n5.json"),
  N4: () => import("./openjlpt/vocab/n4.json"),
  N3: () => import("./openjlpt/vocab/n3.json"),
  N2: () => import("./openjlpt/vocab/n2.json"),
  N1: () => import("./openjlpt/vocab/n1.json"),
};

const kanjiLoaders: Record<VocabularyLevel, () => Promise<JsonModule>> = {
  N5: () => import("./openjlpt/kanji/n5.json"),
  N4: () => import("./openjlpt/kanji/n4.json"),
  N3: () => import("./openjlpt/kanji/n3.json"),
  N2: () => import("./openjlpt/kanji/n2.json"),
  N1: () => import("./openjlpt/kanji/n1.json"),
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeVocabularyRecord(
  value: unknown,
  expectedLevel: VocabularyLevel
): VocabularyRecord | null {
  if (!isObject(value)) return null;

  const { id, word, reading, romaji, meanings, level, pos, examples } = value;
  if (
    typeof id !== "string" ||
    !id.trim() ||
    typeof word !== "string" ||
    !word.trim() ||
    typeof reading !== "string" ||
    !reading.trim() ||
    typeof romaji !== "string" ||
    !romaji.trim() ||
    level !== expectedLevel ||
    !Array.isArray(meanings) ||
    (pos !== undefined && !Array.isArray(pos))
  ) {
    return null;
  }

  const normalizedMeanings = cleanStringArray(meanings);
  if (!normalizedMeanings.length) return null;

  const normalizedExamples = Array.isArray(examples)
    ? examples.flatMap((example): VocabularyExample[] => {
        if (!isObject(example)) return [];
        const ja = typeof example.ja === "string" ? example.ja.trim() : "";
        const en = typeof example.en === "string" ? example.en.trim() : "";
        if (!ja || !en) return [];
        const furigana =
          typeof example.furigana === "string" && example.furigana.trim()
            ? example.furigana.trim()
            : undefined;
        const tatoebaId =
          typeof example.tatoeba_id === "number" && Number.isInteger(example.tatoeba_id)
            ? example.tatoeba_id
            : undefined;
        return [{ ja, en, ...(furigana ? { furigana } : {}), ...(tatoebaId ? { tatoebaId } : {}) }];
      })
    : [];

  return {
    id: id.trim(),
    word: word.trim(),
    reading: reading.trim(),
    romaji: romaji.trim(),
    meanings: normalizedMeanings,
    level: expectedLevel,
    pos: cleanStringArray(pos),
    examples: normalizedExamples,
  };
}

function normalizeKanjiRecord(
  value: unknown,
  expectedLevel: VocabularyLevel
): VocabularyKanjiRecord | null {
  if (!isObject(value)) return null;
  const { character, level, grade, meanings } = value;
  if (
    typeof character !== "string" ||
    [...character].length !== 1 ||
    !/\p{Script=Han}/u.test(character) ||
    level !== expectedLevel ||
    !Array.isArray(meanings)
  ) {
    return null;
  }

  const normalizedMeanings = cleanStringArray(meanings);
  if (!normalizedMeanings.length) return null;

  return {
    character,
    level: expectedLevel,
    grade: typeof grade === "number" && Number.isInteger(grade) && grade > 0 ? grade : null,
    meanings: normalizedMeanings,
  };
}

function jsonArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("OpenJLPT data file is not a JSON array.");
  return value;
}

export async function loadVocabularyData(levels: VocabularyLevel[]): Promise<VocabularyData> {
  const selectedLevels = vocabularyLevels.filter((level) => levels.includes(level));
  if (!selectedLevels.length) {
    throw new Error("Select at least one JLPT level before loading vocabulary.");
  }

  const [vocabularyDatasets, kanjiDatasets] = await Promise.all([
    Promise.all(
      selectedLevels.map(async (level) => {
        const dataModule = await vocabularyLoaders[level]();
        return { level, rows: jsonArray(dataModule.default) };
      })
    ),
    Promise.all(
      vocabularyLevels.map(async (level) => {
        const dataModule = await kanjiLoaders[level]();
        return { level, rows: jsonArray(dataModule.default) };
      })
    ),
  ]);

  const records: VocabularyRecord[] = [];
  const kanjiByCharacter = new Map<string, VocabularyKanjiRecord>();
  let invalidVocabularyCount = 0;
  let invalidKanjiCount = 0;

  for (const { level, rows } of vocabularyDatasets) {
    for (const row of rows) {
      const record = normalizeVocabularyRecord(row, level);
      if (record) records.push(record);
      else invalidVocabularyCount += 1;
    }
  }

  for (const { level, rows } of kanjiDatasets) {
    for (const row of rows) {
      const record = normalizeKanjiRecord(row, level);
      if (!record) {
        invalidKanjiCount += 1;
        continue;
      }
      const existing = kanjiByCharacter.get(record.character);
      if (!existing || (existing.grade === null && record.grade !== null)) {
        kanjiByCharacter.set(record.character, record);
      }
    }
  }

  if (invalidVocabularyCount || invalidKanjiCount) {
    console.warn("Some OpenJLPT records were rejected during validation.", {
      invalidVocabularyCount,
      invalidKanjiCount,
    });
  }
  if (!records.length) throw new Error("No valid OpenJLPT vocabulary records were found.");

  return { records, kanjiByCharacter };
}

export function kanjiCharacters(word: string): string[] {
  return [...new Set([...word].filter((character) => /\p{Script=Han}/u.test(character)))];
}

export function getVocabularyKanji(
  word: string,
  kanjiByCharacter: Map<string, VocabularyKanjiRecord>
): VocabularyKanjiRecord[] {
  return kanjiCharacters(word).flatMap((character) => {
    const record = kanjiByCharacter.get(character);
    return record ? [record] : [];
  });
}

export function filterVocabulary(
  records: VocabularyRecord[],
  selection: { levels: VocabularyLevel[]; grades?: number[]; ids?: string[] },
  kanjiByCharacter: Map<string, VocabularyKanjiRecord>
): VocabularyRecord[] {
  const levels = new Set(selection.levels);
  const grades = new Set(selection.grades ?? []);
  const ids = selection.ids ? new Set(selection.ids) : null;
  const seenWords = new Set<string>();

  return records.filter((record) => {
    if (!levels.has(record.level) || (ids && !ids.has(record.id))) return false;
    if (grades.size) {
      const matchesGrade = getVocabularyKanji(record.word, kanjiByCharacter)
        .some((kanji) => kanji.grade !== null && grades.has(kanji.grade));
      if (!matchesGrade) return false;
    }
    const identity = `${record.word.normalize("NFKC")}\u0000${record.reading.normalize("NFKC")}`;
    if (seenWords.has(identity)) return false;
    seenWords.add(identity);
    return true;
  });
}

export function availableVocabularyGrades(
  kanjiByCharacter: Map<string, VocabularyKanjiRecord>
): number[] {
  return [...new Set(
    [...kanjiByCharacter.values()]
      .map((record) => record.grade)
      .filter((grade): grade is number => grade !== null)
  )].sort((a, b) => a - b);
}
