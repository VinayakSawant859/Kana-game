import { getCharacters, type KanaCharacter, type ScriptSelection } from "@/data/kana";
import type { CardRecord } from "./kana-session";

export interface KanaSettings {
  sessionId: string;
  script: ScriptSelection;
  rowKeys: string[];
  questionCount: number | null;
  characterIds?: string[];
}

export interface KanaSessionResult {
  sessionId: string;
  startedAt: number;
  endedAt: number;
  endedEarly: boolean;
  cards: CardRecord[];
}

export function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, "");
}

export function checkAnswer(character: KanaCharacter, answer: string): boolean {
  const normalized = normalizeAnswer(answer);
  return character.romaji.some((accepted) => normalizeAnswer(accepted) === normalized);
}

export function buildDeck(settings: KanaSettings, random: () => number = Math.random): KanaCharacter[] {
  const selected = getCharacters({
    script: settings.script,
    rowKeys: settings.rowKeys,
    characterIds: settings.characterIds,
  });
  const shuffled = [...selected];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return settings.questionCount === null
    ? shuffled
    : shuffled.slice(0, Math.min(settings.questionCount, shuffled.length));
}

export function computeResult(
  sessionId: string,
  cards: CardRecord[],
  startedAt: number,
  endedAt: number,
  endedEarly: boolean
): KanaSessionResult {
  return { sessionId, cards, startedAt, endedAt, endedEarly };
}

