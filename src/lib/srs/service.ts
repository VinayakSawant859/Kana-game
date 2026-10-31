import { createEmptyCard, fsrs, Rating, type Card, type Grade } from "ts-fsrs";
import type { CardRecord } from "@/engine/kana-session";
import type { KanjiMeaningQuestionResult } from "@/engine/kanji-meaning";
import { srsDb, type SrsItem, type SrsItemType } from "./db";

export { Rating };

const scheduler = fsrs();

function hasIndexedDb(): boolean {
  return typeof globalThis !== "undefined" && "indexedDB" in globalThis && globalThis.indexedDB !== undefined;
}

export function normalizeCardDates(card: Card): Card {
  return {
    ...card,
    due: card.due instanceof Date ? card.due : new Date(card.due),
    ...(card.last_review
      ? {
          last_review:
            card.last_review instanceof Date ? card.last_review : new Date(card.last_review),
        }
      : {}),
  };
}

function isValidSrsItem(value: unknown): value is SrsItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== "string" ||
    !item.id.trim() ||
    (item.type !== "kana" && item.type !== "kanji" && item.type !== "vocab") ||
    typeof item.prompt !== "string" ||
    !item.prompt.trim() ||
    typeof item.answer !== "string" ||
    !item.answer.trim() ||
    typeof item.card !== "object" ||
    item.card === null
  ) {
    return false;
  }

  const card = item.card as Record<string, unknown>;
  if (
    !(card.due instanceof Date) &&
    typeof card.due !== "string" &&
    typeof card.due !== "number"
  ) {
    return false;
  }
  const dueDate = card.due instanceof Date ? card.due : new Date(card.due);
  return (
    !Number.isNaN(dueDate.getTime()) &&
    typeof card.stability === "number" &&
    typeof card.difficulty === "number" &&
    typeof card.reps === "number" &&
    typeof card.state === "number"
  );
}

export async function getDueCards(
  type?: SrsItemType,
  now: Date = new Date()
): Promise<SrsItem[]> {
  if (!hasIndexedDb()) return [];
  const all = type
    ? await srsDb.items.where("type").equals(type).toArray()
    : await srsDb.items.toArray();

  const cutoff = now.getTime();
  return all
    .map((item) => ({ ...item, card: normalizeCardDates(item.card) }))
    .filter((item) => item.card.due.getTime() <= cutoff)
    .sort((a, b) => a.card.due.getTime() - b.card.due.getTime());
}

export async function getAllSrsItems(): Promise<SrsItem[]> {
  if (!hasIndexedDb()) return [];
  const all = await srsDb.items.toArray();
  return all.map((item) => ({ ...item, card: normalizeCardDates(item.card) }));
}

export async function recordReview(
  id: string,
  rating: Rating.Again | Rating.Hard | Rating.Good | Rating.Easy,
  now: Date = new Date()
): Promise<SrsItem | undefined> {
  if (!hasIndexedDb()) return undefined;
  const existing = await srsDb.items.get(id);
  if (!existing) return undefined;

  const normalizedCard = normalizeCardDates(existing.card);
  const outcome = scheduler.next(normalizedCard, now, rating as Grade);
  const updated: SrsItem = {
    ...existing,
    card: normalizeCardDates(outcome.card),
    lastReviewedAt: now.getTime(),
  };
  await srsDb.items.put(updated);
  return updated;
}

export async function importCards(items: SrsItem[]): Promise<void> {
  if (!hasIndexedDb() || items.length === 0) return;
  const normalized = items.map((item) => ({
    ...item,
    card: normalizeCardDates(item.card),
  }));
  await srsDb.items.bulkPut(normalized);
}

export async function exportBackup(): Promise<string> {
  const items = await getAllSrsItems();
  return JSON.stringify(items, null, 2);
}

export async function importBackup(jsonString: string): Promise<{ count: number }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error("Backup file is not valid JSON.");
  }

  const rawItems = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { items?: unknown }).items)
      ? (parsed as { items: unknown[] }).items
      : null;

  if (!rawItems) {
    throw new Error("Backup JSON must contain an array of SRS items.");
  }

  const validItems: SrsItem[] = [];
  for (const entry of rawItems) {
    if (!isValidSrsItem(entry)) {
      throw new Error("One or more items in the backup failed schema validation.");
    }
    validItems.push({
      ...entry,
      card: normalizeCardDates(entry.card),
    });
  }

  if (hasIndexedDb() && validItems.length > 0) {
    await srsDb.items.bulkPut(validItems);
  }

  return { count: validItems.length };
}

async function upsertPracticeItems(
  incoming: Array<{
    id: string;
    type: SrsItemType;
    level?: string;
    prompt: string;
    answer: string;
    reading?: string;
    missed: boolean;
  }>
): Promise<void> {
  if (!hasIndexedDb() || incoming.length === 0) return;
  try {
    const now = new Date();
    const existingList = await srsDb.items.bulkGet(incoming.map((item) => item.id));
    const toSave: SrsItem[] = incoming.map((entry, idx) => {
      const existing = existingList[idx];
      if (existing) {
        const card = normalizeCardDates(existing.card);
        return {
          ...existing,
          level: entry.level ?? existing.level,
          prompt: entry.prompt,
          answer: entry.answer,
          reading: entry.reading ?? existing.reading,
          card: entry.missed ? { ...card, due: now } : card,
        };
      }
      return {
        id: entry.id,
        type: entry.type,
        ...(entry.level ? { level: entry.level } : {}),
        prompt: entry.prompt,
        answer: entry.answer,
        ...(entry.reading ? { reading: entry.reading } : {}),
        card: createEmptyCard(now),
      };
    });
    await srsDb.items.bulkPut(toSave);
  } catch {
    // Ignore IndexedDB errors in restricted/private environments
  }
}

export async function ingestKanaSession(cards: CardRecord[]): Promise<void> {
  const practiced = cards.filter((card) => card.status !== "not-reached" && card.status !== "pending");
  await upsertPracticeItems(
    practiced.map((card) => ({
      id: `kana:${card.id}`,
      type: "kana",
      prompt: card.char,
      answer: card.romaji[0] ?? "",
      reading: card.script,
      missed: card.status !== "correct-first-try" || card.mistakes > 0,
    }))
  );
}

export async function ingestKanjiMeaningSession(
  questions: KanjiMeaningQuestionResult[]
): Promise<void> {
  const practiced = questions.filter((q) => q.status !== "unanswered");
  await upsertPracticeItems(
    practiced.map((q) => {
      const codePoint = q.kanji.codePointAt(0)?.toString(16).toUpperCase() ?? q.kanji;
      const readings = [...q.on, ...q.kun].filter(Boolean).join(" · ");
      return {
        id: `kanji:${codePoint}`,
        type: "kanji",
        level: `N${q.jlpt}`,
        prompt: q.kanji,
        answer: q.correctLabel,
        ...(readings ? { reading: readings } : {}),
        missed: q.status !== "correct",
      };
    })
  );
}

export async function ingestVocabularySession(
  questions: Array<{
    word: string;
    reading?: string;
    level?: string;
    meanings: string[];
    status: string;
    attempts: string[];
  }>
): Promise<void> {
  const practiced = questions.filter(
    (q) => q.status !== "unanswered" && Array.isArray(q.meanings) && q.meanings.length > 0
  );
  await upsertPracticeItems(
    practiced.map((q) => ({
      id: `vocab:${q.word}`,
      type: "vocab",
      level: q.level,
      prompt: q.word,
      answer: q.meanings.slice(0, 3).join(", "),
      reading: q.reading,
      missed: q.status !== "correct" || q.attempts.length > 1,
    }))
  );
}
