import {
  kanaCharacters,
  getCharacters,
  type KanaCharacter,
  type KanaGroup,
  type KanaRow,
  type KanaScript,
  type ScriptSelection,
} from "@/data/kana";
import { shuffle } from "@/lib/game-core/random";
import type { KanaSettings } from "./kana";
import { normalizeAnswer, checkAnswer } from "./kana";

export type CardStatus =
  | "pending"
  | "correct-first-try"
  | "correct-after-retry"
  | "skipped"
  | "unfinished"
  | "not-reached";

export interface CardRecord {
  id: string;
  char: string;
  romaji: string[];
  script: KanaScript;
  group: KanaGroup;
  row: KanaRow;
  status: CardStatus;
  mistakes: number;
  wrongAnswers: string[];
}

export type SessionPhase = "idle" | "correct" | "wrong" | "skipped" | "leaving";

export interface SessionState {
  cards: CardRecord[];
  index: number;
  phase: SessionPhase;
  startedAt: number;
  endedEarly: boolean;
  readonly currentIndex: number;
}

export type SessionAction =
  | { type: "SUBMIT"; answer: string; index?: number }
  | { type: "SKIP"; index?: number }
  | { type: "SLIDE_OUT" | "LEAVE"; index?: number }
  | { type: "ADVANCE"; index?: number }
  | { type: "END" };

export interface SessionSelection {
  script: ScriptSelection;
  rowKeys: string[];
  questionCount?: number | null;
  characterIds?: string[];
  sessionId?: string;
}

export interface StoredKanaSession {
  sessionId: string;
  settings: KanaSettings;
  deckIds: string[];
}

function makeState(
  cards: CardRecord[],
  index: number,
  phase: SessionPhase,
  startedAt: number,
  endedEarly = false
): SessionState {
  const state = {
    cards,
    index,
    phase,
    startedAt,
    endedEarly,
  };
  Object.defineProperty(state, "currentIndex", {
    get() {
      return this.index;
    },
    enumerable: true,
  });
  return state as SessionState;
}

export function createKanaSession(
  selection: SessionSelection,
  rng: () => number = Math.random
): StoredKanaSession {
  const sessionId = selection.sessionId ?? crypto.randomUUID();
  const settings: KanaSettings = {
    sessionId,
    script: selection.script,
    rowKeys: selection.script === "hiragana"
      ? selection.rowKeys.filter((k) => !k.startsWith("extended:"))
      : selection.rowKeys,
    questionCount: selection.questionCount ?? null,
    characterIds: selection.characterIds,
  };

  const characters = getCharacters({
    script: settings.script,
    rowKeys: settings.rowKeys,
    characterIds: settings.characterIds,
  });

  const shuffled = shuffle(characters, rng);

  const deck =
    settings.questionCount === null
      ? shuffled
      : shuffled.slice(0, Math.min(settings.questionCount, shuffled.length));

  const deckIds = deck.map((c) => c.id);
  return { sessionId, settings, deckIds };
}

export function createSessionState(
  deckOrIds: Array<KanaCharacter | string>,
  startedAt = Date.now()
): SessionState {
  const cards: CardRecord[] = deckOrIds.map((item) => {
    const charObj =
      typeof item === "string"
        ? kanaCharacters.find((c) => c.id === item) ?? {
            id: item,
            char: "",
            romaji: [],
            script: "hiragana" as KanaScript,
            group: "basic" as KanaGroup,
            row: "vowel" as KanaRow,
          }
        : item;

    return {
      id: charObj.id,
      char: charObj.char,
      romaji: [...charObj.romaji],
      script: charObj.script,
      group: charObj.group,
      row: charObj.row,
      status: "pending",
      mistakes: 0,
      wrongAnswers: [],
    };
  });

  return makeState(cards, 0, "idle", startedAt, false);
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  if (action.type === "END") {
    const finalCards = finalize({ ...state, endedEarly: true });
    return makeState(finalCards, state.index, state.phase, state.startedAt, true);
  }

  if (action.type === "ADVANCE") {
    if (action.index !== undefined && action.index !== state.index) {
      return state;
    }
    const nextIndex = Math.min(state.index + 1, state.cards.length);
    return makeState(state.cards, nextIndex, "idle", state.startedAt, state.endedEarly);
  }

  if (action.type === "SLIDE_OUT" || action.type === "LEAVE") {
    if (action.index !== undefined && action.index !== state.index) {
      return state;
    }
    return makeState(state.cards, state.index, "leaving", state.startedAt, state.endedEarly);
  }

  const card = state.cards[state.index];
  if (!card || state.index >= state.cards.length) {
    return state;
  }

  if (action.type === "SKIP") {
    if (action.index !== undefined && action.index !== state.index) {
      return state;
    }
    const updatedCards = state.cards.map((item, index) =>
      index === state.index ? { ...item, status: "skipped" as const } : item
    );
    return makeState(updatedCards, state.index, "skipped", state.startedAt, state.endedEarly);
  }

  if (action.type === "SUBMIT") {
    if (action.index !== undefined && action.index !== state.index) {
      return state;
    }
    const normalized = normalizeAnswer(action.answer);
    if (!normalized) return state;

    const correct = checkAnswer(card, action.answer);
    if (!correct) {
      const updatedCards = state.cards.map((item, index) =>
        index === state.index
          ? {
              ...item,
              mistakes: item.mistakes + 1,
              wrongAnswers: [...item.wrongAnswers, action.answer.trim()],
            }
          : item
      );
      return makeState(updatedCards, state.index, "wrong", state.startedAt, state.endedEarly);
    }

    const status: CardStatus = card.mistakes > 0 ? "correct-after-retry" : "correct-first-try";
    const updatedCards = state.cards.map((item, index) =>
      index === state.index ? { ...item, status } : item
    );
    return makeState(updatedCards, state.index, "correct", state.startedAt, state.endedEarly);
  }

  return state;
}

export function finalize(state: SessionState): CardRecord[] {
  return state.cards.map((card, i) => {
    if (["correct-first-try", "correct-after-retry", "skipped"].includes(card.status)) {
      return card;
    }
    if (state.endedEarly || i <= state.index) {
      if (i === state.index) {
        return { ...card, status: "unfinished" as const };
      }
      if (i < state.index) {
        return card.status === "pending" ? { ...card, status: "unfinished" as const } : card;
      }
    }
    return { ...card, status: "not-reached" as const };
  });
}
