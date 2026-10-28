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

export async function loadKanjiData(): Promise<KanjiRecord[]> {
  const data = await import("./kanji.generated.json");
  return data.default as KanjiRecord[];
}

export async function getKanjiPool(selection: {
  levels: number[];
  grades: number[];
  kanjiIds?: string[];
}): Promise<KanjiRecord[]> {
  const records = await loadKanjiData();
  const ids = selection.kanjiIds ? new Set(selection.kanjiIds) : null;
  return records.filter(
    (record) =>
      selection.levels.includes(record.jlpt) &&
      selection.grades.includes(record.grade) &&
      (!ids || ids.has(record.c))
  );
}

export async function countsByLevelGrade(levels: number[]): Promise<Record<number, number>> {
  const records = await loadKanjiData();
  const counts: Record<number, number> = {};
  for (const record of records) {
    if (levels.includes(record.jlpt)) counts[record.grade] = (counts[record.grade] ?? 0) + 1;
  }
  return counts;
}

export async function countsByLevel(grades: number[]): Promise<Record<number, number>> {
  const records = await loadKanjiData();
  const counts: Record<number, number> = {};
  for (const record of records) {
    if (grades.includes(record.grade)) counts[record.jlpt] = (counts[record.jlpt] ?? 0) + 1;
  }
  return counts;
}
