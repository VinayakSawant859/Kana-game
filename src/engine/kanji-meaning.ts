import { getKanjiPool, loadKanjiData, type KanjiRecord } from "@/data/kanji";
import { shuffle } from "./random";

export type KanjiMeaningStatus = "correct" | "wrong" | "unanswered";

export interface KanjiMeaningSettings {
  mode: "meaning";
  levels: number[];
  grades: number[];
  size: number;
  kanjiIds?: string[];
}

export interface KanjiMeaningQuestion {
  id: string;
  kanji: string;
  optionKanji: [string, string, string, string];
}

export interface StoredKanjiMeaningSession {
  sessionId: string;
  settings: KanjiMeaningSettings;
  questions: KanjiMeaningQuestion[];
}

export interface KanjiMeaningQuestionResult {
  id: string;
  kanji: string;
  jlpt: number;
  grade: number;
  correctLabel: string;
  meanings: string[];
  on: string[];
  kun: string[];
  strokes: number;
  status: KanjiMeaningStatus;
  chosenKanji?: string;
  chosenLabel?: string;
  timeMs: number;
}

export interface KanjiMeaningState {
  sessionId: string;
  settings: KanjiMeaningSettings;
  questions: KanjiMeaningQuestion[];
  results: KanjiMeaningQuestionResult[];
  labelByKanji: Record<string, string>;
  index: number;
  startedAt: number;
  endedEarly: boolean;
}

export type KanjiMeaningAction =
  | { type: "ANSWER"; optionIndex: number; index?: number; timeMs: number }
  | { type: "NEXT"; index?: number }
  | { type: "END" };

export interface KanjiMeaningResult {
  sessionId: string;
  settings: KanjiMeaningSettings;
  startedAt: number;
  endedAt: number;
  endedEarly: boolean;
  questions: KanjiMeaningQuestionResult[];
}

const stopWords = new Set([
  "about", "above", "after", "again", "against", "also", "among", "and", "any",
  "are", "been", "before", "being", "below", "between", "both", "but", "can",
  "could", "did", "does", "down", "during", "each", "few", "for", "from",
  "further", "had", "has", "have", "having", "here", "into", "its", "more",
  "most", "much", "must", "not", "off", "one", "only", "other", "our", "out",
  "over", "own", "same", "should", "some", "such", "than", "that", "their",
  "theirs", "them", "then", "there", "these", "they", "this", "those", "through",
  "under", "until", "upon", "very", "was", "were", "what", "when", "where",
  "which", "while", "who", "whom", "with", "would", "your",
]);

function stem(word: string): string {
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ing") && word.length > 5) {
    const base = word.slice(0, -3);
    return /([b-df-hj-np-tv-z])\1$/.test(base) ? base.slice(0, -1) : base;
  }
  if (word.endsWith("ed") && word.length > 4) {
    const base = word.slice(0, -2);
    return /([b-df-hj-np-tv-z])\1$/.test(base) ? base.slice(0, -1) : base;
  }
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
}

function normalizedMeaning(meaning: string): string {
  return meaning.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).map(stem).join(" ");
}

function meaningfulWords(label: string): Set<string> {
  return new Set(
    label.toLowerCase().match(/\p{L}+/gu)?.map(stem).filter((word) => word.length >= 4 && !stopWords.has(word)) ?? []
  );
}

export function meaningsConflict(question: KanjiRecord, candidate: KanjiRecord): boolean {
  const meanings = new Set(question.meanings.map(normalizedMeaning));
  if (candidate.meanings.some((meaning) => meanings.has(normalizedMeaning(meaning)))) return true;
  const questionWords = meaningfulWords(question.label);
  return [...meaningfulWords(candidate.label)].some((word) => questionWords.has(word));
}

function distractorsFor(
  question: KanjiRecord,
  dataset: KanjiRecord[],
  rng: () => number
): KanjiRecord[] {
  const eligible = dataset.filter(
    (candidate) =>
      candidate.c !== question.c &&
      candidate.label !== question.label &&
      !meaningsConflict(question, candidate)
  );
  const preferred = uniqueLabels(shuffle(eligible.filter((candidate) => candidate.jlpt === question.jlpt), rng), new Set([question.label]));
  if (preferred.length >= 3) return preferred;
  return [
    ...preferred,
    ...uniqueLabels(shuffle(eligible, rng), new Set([question.label, ...preferred.map((candidate) => candidate.label)])),
  ];
}

function uniqueLabels(records: KanjiRecord[], used: Set<string>): KanjiRecord[] {
  const unique: KanjiRecord[] = [];
  for (const record of records) {
    if (used.has(record.label)) continue;
    used.add(record.label);
    unique.push(record);
  }
  return unique;
}

export async function createKanjiMeaningSession(
  selection: {
    levels: number[];
    grades: number[];
    size: number;
    kanjiIds?: string[];
    sessionId?: string;
  },
  rng: () => number = Math.random
): Promise<StoredKanjiMeaningSession> {
  const [pool, levelDataset] = await Promise.all([
    getKanjiPool(selection),
    loadKanjiData(selection.levels),
  ]);
  if (!pool.length) throw new Error("Cannot create a kanji meaning session with an empty pool.");

  const settings: KanjiMeaningSettings = {
    mode: "meaning",
    levels: [...selection.levels],
    grades: [...selection.grades],
    size: Math.min(selection.size, pool.length),
    ...(selection.kanjiIds ? { kanjiIds: [...selection.kanjiIds] } : {}),
  };
  const selectedQuestions = shuffle(pool, rng).slice(0, settings.size);
  const questions = selectedQuestions.map((question) => {
    const distractors = distractorsFor(question, levelDataset, rng);
    if (distractors.length < 3) {
      throw new Error(`Not enough unambiguous options for kanji ${question.c}.`);
    }
    const options = shuffle(
      [question, ...distractors.slice(0, 3)].map((record) => record.c),
      rng
    );
    return {
      id: question.c,
      kanji: question.c,
      optionKanji: options as [string, string, string, string],
    };
  });

  return {
    sessionId: selection.sessionId ?? crypto.randomUUID(),
    settings,
    questions,
  };
}

export function createKanjiMeaningState(
  session: StoredKanjiMeaningSession,
  records: KanjiRecord[],
  startedAt = Date.now()
): KanjiMeaningState {
  const recordByCharacter = new Map(records.map((record) => [record.c, record]));
  const results = session.questions.map((question): KanjiMeaningQuestionResult => {
    const record = recordByCharacter.get(question.kanji);
    if (!record) throw new Error(`Missing kanji data for ${question.kanji}.`);
    return {
      id: question.id,
      kanji: question.kanji,
      jlpt: record.jlpt,
      grade: record.grade,
      correctLabel: record.label,
      meanings: [...record.meanings],
      on: [...record.on],
      kun: [...record.kun],
      strokes: record.strokes,
      status: "unanswered",
      timeMs: 0,
    };
  });
  const labelByKanji: Record<string, string> = {};
  for (const question of session.questions) {
    for (const option of question.optionKanji) {
      const record = recordByCharacter.get(option);
      if (!record) throw new Error(`Missing option data for ${option}.`);
      labelByKanji[option] = record.label;
    }
  }
  return {
    sessionId: session.sessionId,
    settings: session.settings,
    questions: session.questions,
    results,
    labelByKanji,
    index: 0,
    startedAt,
    endedEarly: false,
  };
}

export function kanjiMeaningReducer(
  state: KanjiMeaningState,
  action: KanjiMeaningAction
): KanjiMeaningState {
  if (action.type === "END") return state.endedEarly ? state : { ...state, endedEarly: true };
  if (state.endedEarly || state.index >= state.questions.length) return state;
  if (action.index !== undefined && action.index !== state.index) return state;

  if (action.type === "ANSWER") {
    const question = state.questions[state.index];
    const current = state.results[state.index];
    const chosenKanji = question?.optionKanji[action.optionIndex];
    if (!question || !current || current.status !== "unanswered" || !chosenKanji) return state;
    const updated = [...state.results];
    updated[state.index] = {
      ...current,
      status: chosenKanji === question.kanji ? "correct" : "wrong",
      chosenKanji,
      chosenLabel: state.labelByKanji[chosenKanji],
      timeMs: Math.max(0, action.timeMs),
    };
    return { ...state, results: updated };
  }

  if (state.results[state.index]?.status === "unanswered") return state;
  return { ...state, index: Math.min(state.index + 1, state.questions.length) };
}

export function buildKanjiMeaningResult(
  state: KanjiMeaningState,
  endedAt = Date.now()
): KanjiMeaningResult {
  return {
    sessionId: state.sessionId,
    settings: state.settings,
    startedAt: state.startedAt,
    endedAt,
    endedEarly: state.endedEarly,
    questions: state.results.map((result) => ({ ...result })),
  };
}

