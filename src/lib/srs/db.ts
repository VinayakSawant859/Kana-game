import Dexie, { type Table } from "dexie";
import type { Card } from "ts-fsrs";

export type SrsItemType = "kana" | "kanji" | "vocab";

export interface SrsItem {
  id: string;           // e.g. "kana:hiragana-あ", "kanji:4F53", "vocab:違う"
  type: SrsItemType;
  level?: string;       // "N5", "N4", etc.
  prompt: string;       // glyph / word
  answer: string;       // romaji, primary meaning
  reading?: string;     // furigana/kun/on
  card: Card;           // ts-fsrs Card object (state, due, stability, difficulty, reps)
  lastReviewedAt?: number;
}

export class SrsDatabase extends Dexie {
  items!: Table<SrsItem, string>;

  constructor() {
    super("NihongoSrsDB");
    this.version(1).stores({
      items: "id, type, level, [card.due+type]",
    });
  }
}

export const srsDb = new SrsDatabase();

