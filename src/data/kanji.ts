export type KanjiLevel = "N1" | "N2" | "N3" | "N4" | "N5";

export const kanjiLevels: readonly KanjiLevel[] = ["N5", "N4", "N3", "N2", "N1"];

export interface KanjiRecord {
  c: string;
  jlpt: number;
  grade: number;
  meanings: string[];
  label: string;
  on: string[];
  kun: string[];
  strokes: number;
  freq: number | null;
}

export interface KanjiIndexMetadata {
  version: "v1";
  total: number;
  levels: Record<KanjiLevel, number>;
  grades: Record<string, number>;
  byLevelGrade: Record<KanjiLevel, Record<string, number>>;
}

const levelCache = new Map<KanjiLevel, Promise<KanjiRecord[]>>();
let indexCache: Promise<KanjiIndexMetadata> | null = null;

const fallbackLevelLoaders: Record<KanjiLevel, () => Promise<{ default: unknown }>> = {
  N5: () => import("../../public/data/v1/kanji/N5.json"),
  N4: () => import("../../public/data/v1/kanji/N4.json"),
  N3: () => import("../../public/data/v1/kanji/N3.json"),
  N2: () => import("../../public/data/v1/kanji/N2.json"),
  N1: () => import("../../public/data/v1/kanji/N1.json"),
};

function isMockedFetch(): boolean {
  return (
    typeof globalThis.fetch === "function" &&
    ("mock" in globalThis.fetch || "_isMockFunction" in globalThis.fetch)
  );
}

function canUseBrowserFetch(): boolean {
  if (isMockedFetch()) return true;
  if (typeof process !== "undefined" && process.env?.VITEST) return false;
  return typeof window !== "undefined" && typeof globalThis.fetch === "function";
}

export function toKanjiLevel(jlpt: number): KanjiLevel {
  if (jlpt === 1 || jlpt === 2 || jlpt === 3 || jlpt === 4 || jlpt === 5) {
    return `N${jlpt}`;
  }
  throw new Error(`Invalid JLPT level: ${jlpt}`);
}

export function clearKanjiCache(): void {
  levelCache.clear();
  indexCache = null;
}

export function getKanjiByLevel(level: KanjiLevel): Promise<KanjiRecord[]> {
  const cached = levelCache.get(level);
  if (cached) return cached;

  const request = (async (): Promise<KanjiRecord[]> => {
    if (canUseBrowserFetch()) {
      const response = await globalThis.fetch(`/data/v1/kanji/${level}.json`, {
        cache: "force-cache",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch Kanji data for ${level} (${response.status})`);
      }
      return (await response.json()) as KanjiRecord[];
    }
    const mod = await fallbackLevelLoaders[level]();
    return mod.default as KanjiRecord[];
  })().catch((error: unknown) => {
    levelCache.delete(level);
    throw error;
  });

  levelCache.set(level, request);
  return request;
}

export function getKanjiIndex(): Promise<KanjiIndexMetadata> {
  if (indexCache) return indexCache;

  indexCache = (async (): Promise<KanjiIndexMetadata> => {
    if (canUseBrowserFetch() && !isMockedFetch()) {
      const response = await globalThis.fetch("/data/v1/kanji/all.json", {
        cache: "force-cache",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch Kanji index (${response.status})`);
      }
      return (await response.json()) as KanjiIndexMetadata;
    }
    const mod = await import("../../public/data/v1/kanji/all.json");
    return mod.default as KanjiIndexMetadata;
  })().catch((error: unknown) => {
    indexCache = null;
    throw error;
  });

  return indexCache;
}

export async function loadKanjiData(levels?: number[]): Promise<KanjiRecord[]> {
  const targetLevels: KanjiLevel[] =
    levels && levels.length > 0
      ? [...new Set(levels.map(toKanjiLevel))]
      : [...kanjiLevels];
  const groups = await Promise.all(targetLevels.map((level) => getKanjiByLevel(level)));
  return groups.flat();
}

export async function getKanjiPool(selection: {
  levels: number[];
  grades: number[];
  kanjiIds?: string[];
}): Promise<KanjiRecord[]> {
  if (!selection.levels.length || !selection.grades.length) return [];
  const records = await loadKanjiData(selection.levels);
  const ids = selection.kanjiIds ? new Set(selection.kanjiIds) : null;
  const gradeSet = new Set(selection.grades);
  const levelSet = new Set(selection.levels);
  return records.filter(
    (record) =>
      levelSet.has(record.jlpt) &&
      gradeSet.has(record.grade) &&
      (!ids || ids.has(record.c))
  );
}

export async function countsByLevelGrade(levels: number[]): Promise<Record<number, number>> {
  const index = await getKanjiIndex();
  const counts: Record<number, number> = {};
  for (const level of levels) {
    const levelKey = toKanjiLevel(level);
    const byGrade = index.byLevelGrade[levelKey] ?? {};
    for (const [grade, count] of Object.entries(byGrade)) {
      counts[Number(grade)] = (counts[Number(grade)] ?? 0) + count;
    }
  }
  return counts;
}

export async function countsByLevel(grades: number[]): Promise<Record<number, number>> {
  const index = await getKanjiIndex();
  const counts: Record<number, number> = {};
  for (const level of [1, 2, 3, 4, 5] as const) {
    const levelKey = `N${level}` as const;
    const byGrade = index.byLevelGrade[levelKey] ?? {};
    let total = 0;
    for (const grade of grades) {
      total += byGrade[String(grade)] ?? 0;
    }
    counts[level] = total;
  }
  return counts;
}

