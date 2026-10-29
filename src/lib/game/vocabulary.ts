import {
  filterVocabulary,
  getVocabularyKanji,
  type VocabularyData,
  type VocabularyKanjiRecord,
  type VocabularyLevel,
  type VocabularyRecord,
} from "@/data/vocabulary";
import { shuffle } from "@/lib/game-core/random";

export const BASE_QUESTION_SCORE = 100;
export const FURIGANA_HINT_COST = 20;
export const KANJI_HINT_COST = 15;

export type VocabularySessionSize = 10 | 20 | 30 | "all";
export type VocabularyStatus = "correct" | "skipped" | "unanswered";

export interface VocabularySettings {
  levels: VocabularyLevel[];
  grades: number[];
  size: VocabularySessionSize;
}

export interface StoredVocabularySession {
  sessionId: string;
  settings: VocabularySettings;
  questionIds: string[];
}

export interface VocabularyQuestion extends VocabularyRecord {
  kanji: VocabularyKanjiRecord[];
}

export interface VocabularyQuestionResult {
  id: string;
  status: VocabularyStatus;
  attempts: string[];
  furiganaHintUsed: boolean;
  kanjiHints: string[];
  pointsEarned: number;
}

export interface VocabularyState {
  sessionId: string;
  settings: VocabularySettings;
  questions: VocabularyQuestion[];
  results: VocabularyQuestionResult[];
  index: number;
  startedAt: number;
  endedEarly: boolean;
}

export interface VocabularyResultQuestion {
  id: string;
  status: VocabularyStatus;
  attempts: string[];
  furiganaHintUsed: boolean;
  kanjiHints: string[];
  pointsEarned: number;
  pointsDeducted: number;
}

export interface VocabularyReviewQuestion extends VocabularyQuestion, VocabularyResultQuestion {}

export interface VocabularyResult {
  sessionId: string;
  settings: VocabularySettings;
  startedAt: number;
  endedAt: number;
  endedEarly: boolean;
  questions: VocabularyResultQuestion[];
}

export type VocabularyAction =
  | { type: "HINT_FURIGANA"; index?: number }
  | { type: "HINT_KANJI"; character: string; index?: number }
  | { type: "SUBMIT"; answer: string; index?: number }
  | { type: "SKIP"; index?: number }
  | { type: "NEXT"; index?: number }
  | { type: "END" };

export interface VocabularyReport {
  total: number;
  score: number;
  maximumScore: number;
  attempted: number;
  firstTryCorrect: number;
  correctAfterRetries: number;
  incorrect: number;
  incorrectAttempts: number;
  skipped: number;
  unanswered: number;
  hintsUsed: number;
  pointsDeducted: number;
  accuracy: number;
  completionTime: number;
}

export interface FuriganaSegment {
  text: string;
  reading?: string;
}

function normalizedAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeMeaningAnswer(value: string): string {
  return normalizedAnswer(value);
}

export function isCorrectVocabularyAnswer(answer: string, meanings: string[]): boolean {
  const normalized = normalizeMeaningAnswer(answer);
  return Boolean(normalized) && meanings.some((meaning) => normalizeMeaningAnswer(meaning) === normalized);
}

export function parseExampleFurigana(source: string): FuriganaSegment[] {
  const segments: FuriganaSegment[] = [];
  const marker = /\{([^{}|]+)\|([^{}|]+)\}/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = marker.exec(source)) !== null) {
    if (match.index > cursor) segments.push({ text: source.slice(cursor, match.index) });
    segments.push({ text: match[1], reading: match[2] });
    cursor = marker.lastIndex;
  }
  if (cursor < source.length || segments.length === 0) {
    segments.push({ text: source.slice(cursor) });
  }
  return segments;
}

export function getPotentialScore(hints: {
  furiganaHintUsed: boolean;
  kanjiHints: string[];
}): number {
  const deduction =
    (hints.furiganaHintUsed ? FURIGANA_HINT_COST : 0) +
    hints.kanjiHints.length * KANJI_HINT_COST;
  return Math.max(0, BASE_QUESTION_SCORE - deduction);
}

export function createVocabularySession(
  selection: {
    levels: VocabularyLevel[];
    grades: number[];
    size: VocabularySessionSize;
    ids?: string[];
    sessionId?: string;
  },
  data: VocabularyData,
  rng: () => number = Math.random
): StoredVocabularySession {
  const eligible = filterVocabulary(
    data.records,
    { levels: selection.levels, grades: selection.grades, ids: selection.ids },
    data.kanjiByCharacter
  );
  const requestedSize = selection.size === "all" ? eligible.length : selection.size;
  if (!eligible.length) throw new Error("No vocabulary matches the selected levels and grades.");
  if (requestedSize > eligible.length) {
    throw new Error(`Not enough vocabulary: ${requestedSize} questions requested, ${eligible.length} available.`);
  }

  const questions = shuffle(eligible, rng).slice(0, requestedSize);
  return {
    sessionId: selection.sessionId ?? crypto.randomUUID(),
    settings: {
      levels: [...selection.levels],
      grades: [...selection.grades],
      size: selection.size,
    },
    questionIds: questions.map((question) => question.id),
  };
}

export function createVocabularyState(
  session: StoredVocabularySession,
  data: VocabularyData,
  startedAt = Date.now()
): VocabularyState {
  const byId = new Map(data.records.map((record) => [record.id, record]));
  const questions = session.questionIds.map((id) => {
    const record = byId.get(id);
    if (!record) throw new Error(`Missing OpenJLPT vocabulary record ${id}.`);
    return {
      ...record,
      kanji: getVocabularyKanji(record.word, data.kanjiByCharacter),
    };
  });

  if (!questions.length || new Set(questions.map((question) => question.id)).size !== questions.length) {
    throw new Error("The vocabulary session has no questions or contains duplicate question IDs.");
  }

  return {
    sessionId: session.sessionId,
    settings: session.settings,
    questions,
    results: questions.map((question) => ({
      id: question.id,
      status: "unanswered",
      attempts: [],
      furiganaHintUsed: false,
      kanjiHints: [],
      pointsEarned: 0,
    })),
    index: 0,
    startedAt,
    endedEarly: false,
  };
}

export function vocabularyReducer(
  state: VocabularyState,
  action: VocabularyAction
): VocabularyState {
  if (action.type === "END") {
    return state.endedEarly ? state : { ...state, endedEarly: true };
  }
  if (state.endedEarly || state.index >= state.questions.length) return state;
  if (action.index !== undefined && action.index !== state.index) return state;

  const question = state.questions[state.index];
  const current = state.results[state.index];
  if (!question || !current) return state;
  const updateCurrent = (result: VocabularyQuestionResult) => {
    const results = [...state.results];
    results[state.index] = result;
    return { ...state, results };
  };

  if (action.type === "HINT_FURIGANA") {
    if (current.status !== "unanswered" || current.furiganaHintUsed) return state;
    return updateCurrent({ ...current, furiganaHintUsed: true });
  }

  if (action.type === "HINT_KANJI") {
    const eligibleKanji = question.kanji.some(
      (kanji) => kanji.character === action.character && kanji.meanings.length > 0
    );
    if (
      current.status !== "unanswered" ||
      !eligibleKanji ||
      current.kanjiHints.includes(action.character)
    ) {
      return state;
    }
    return updateCurrent({ ...current, kanjiHints: [...current.kanjiHints, action.character] });
  }

  if (action.type === "SUBMIT") {
    if (current.status !== "unanswered" || !normalizeMeaningAnswer(action.answer)) return state;
    const attempts = [...current.attempts, action.answer.trim()];
    const correct = isCorrectVocabularyAnswer(action.answer, question.meanings);
    return updateCurrent({
      ...current,
      status: correct ? "correct" : "unanswered",
      attempts,
      pointsEarned: correct ? getPotentialScore(current) : 0,
    });
  }

  if (action.type === "SKIP") {
    if (current.status !== "unanswered") return state;
    return updateCurrent({ ...current, status: "skipped", pointsEarned: 0 });
  }

  if (current.status === "unanswered") return state;
  return { ...state, index: Math.min(state.index + 1, state.questions.length) };
}

export function buildVocabularyResult(
  state: VocabularyState,
  endedAt = Date.now()
): VocabularyResult {
  return {
    sessionId: state.sessionId,
    settings: state.settings,
    startedAt: state.startedAt,
    endedAt,
    endedEarly: state.endedEarly,
    questions: state.results.map((result) => {
      return {
        id: result.id,
        status: result.status,
        attempts: [...result.attempts],
        furiganaHintUsed: result.furiganaHintUsed,
        kanjiHints: [...result.kanjiHints],
        pointsEarned: result.pointsEarned,
        pointsDeducted: BASE_QUESTION_SCORE - getPotentialScore(result),
      };
    }),
  };
}

export function buildVocabularyReviewQuestions(
  result: VocabularyResult,
  data: VocabularyData
): VocabularyReviewQuestion[] {
  const recordsById = new Map(data.records.map((record) => [record.id, record]));
  return result.questions.map((resultQuestion) => {
    const record = recordsById.get(resultQuestion.id);
    if (!record) throw new Error(`Missing OpenJLPT vocabulary record ${resultQuestion.id}.`);
    return {
      ...record,
      kanji: getVocabularyKanji(record.word, data.kanjiByCharacter),
      ...resultQuestion,
    };
  });
}

export function calculateVocabularyReport(result: VocabularyResult): VocabularyReport {
  const attempted = result.questions.filter((question) => question.attempts.length > 0).length;
  const correct = result.questions.filter((question) => question.status === "correct");
  const incorrectQuestions = result.questions.filter((question) =>
    question.attempts.length > (question.status === "correct" ? 1 : 0)
  );
  const incorrectAttempts = result.questions.reduce(
    (sum, question) => sum + question.attempts.length - Number(question.status === "correct"),
    0
  );
  return {
    total: result.questions.length,
    score: result.questions.reduce((sum, question) => sum + question.pointsEarned, 0),
    maximumScore: result.questions.length * BASE_QUESTION_SCORE,
    attempted,
    firstTryCorrect: correct.filter((question) => question.attempts.length === 1).length,
    correctAfterRetries: correct.filter((question) => question.attempts.length > 1).length,
    incorrect: incorrectQuestions.length,
    incorrectAttempts,
    skipped: result.questions.filter((question) => question.status === "skipped").length,
    unanswered: result.questions.filter((question) => question.status === "unanswered").length,
    hintsUsed: result.questions.reduce(
      (sum, question) => sum + Number(question.furiganaHintUsed) + question.kanjiHints.length,
      0
    ),
    pointsDeducted: result.questions.reduce((sum, question) => sum + question.pointsDeducted, 0),
    accuracy: attempted ? Math.round((correct.length / attempted) * 100) : 0,
    completionTime: Math.max(0, result.endedAt - result.startedAt),
  };
}
