import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cleanMeanings } from "../src/lib/kanji-data/clean-meanings";

interface RawKanji {
  kanji: string;
  jlpt: number;
  grade: number;
  meanings: string[];
  on_readings: string[];
  kun_readings: string[];
  heisig_en: string | null;
  stroke_count: number;
  freq_mainichi_shinbun: number | null;
}

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
  levels: Record<`N${1 | 2 | 3 | 4 | 5}`, number>;
  grades: Record<string, number>;
  byLevelGrade: Record<`N${1 | 2 | 3 | 4 | 5}`, Record<string, number>>;
}

async function main(): Promise<void> {
  const root = process.cwd();
  const rawPath = resolve(root, "data-raw/kanji_jlpt_only.json");
  try {
    await access(rawPath);
  } catch {
    throw new Error(`Missing required source dataset at ${rawPath}`);
  }

  const overridePath = resolve(root, "src/data/kanji/meaning-overrides.json");
  const outputDirectory = resolve(root, "src/data/kanji");
  const publicKanjiDirectory = resolve(root, "public/data/v1/kanji");
  const reportPath = resolve(root, "kanji-data-report.md");

  const raw = JSON.parse(await readFile(rawPath, "utf8")) as Record<string, RawKanji>;
  let overrides: Record<string, string[]> = {};
  try {
    overrides = JSON.parse(await readFile(overridePath, "utf8")) as Record<string, string[]>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const records: KanjiRecord[] = [];
  const excluded: string[] = [];
  let meaningsDropped = 0;
  const counts = new Map<string, number>();

  for (const [character, item] of Object.entries(raw)) {
    const meanings = cleanMeanings(overrides[character] ?? item.meanings, item.heisig_en);
    meaningsDropped += (overrides[character] ?? item.meanings).length - meanings.length;
    if (meanings.length === 0) {
      excluded.push(character);
      continue;
    }

    const parts: string[] = [];
    for (const meaning of meanings.slice(0, 3)) {
      const candidate = [...parts, meaning].join(", ");
      if (candidate.length > 40) break;
      parts.push(meaning);
    }
    const label = parts.join(", ");
    if (!label) {
      excluded.push(character);
      continue;
    }

    records.push({
      c: item.kanji,
      jlpt: item.jlpt,
      grade: item.grade,
      meanings,
      label,
      on: item.on_readings,
      kun: item.kun_readings,
      strokes: item.stroke_count,
      freq: item.freq_mainichi_shinbun,
    });
    const key = `${item.jlpt}-${item.grade}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  records.sort((left, right) => left.c.localeCompare(right.c, "ja"));

  await mkdir(outputDirectory, { recursive: true });
  await mkdir(publicKanjiDirectory, { recursive: true });

  const levels = [5, 4, 3, 2, 1] as const;
  const grades = [1, 2, 3, 4, 5, 6, 8, 9] as const;

  const indexMetadata: KanjiIndexMetadata = {
    version: "v1",
    total: records.length,
    levels: { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 },
    grades: {},
    byLevelGrade: { N5: {}, N4: {}, N3: {}, N2: {}, N1: {} },
  };

  for (const grade of grades) {
    indexMetadata.grades[String(grade)] = records.filter((r) => r.grade === grade).length;
  }

  for (const level of levels) {
    const levelKey = `N${level}` as const;
    const levelRecords = records.filter((record) => record.jlpt === level);
    indexMetadata.levels[levelKey] = levelRecords.length;
    for (const grade of grades) {
      indexMetadata.byLevelGrade[levelKey][String(grade)] = counts.get(`${level}-${grade}`) ?? 0;
    }
    await writeFile(
      resolve(publicKanjiDirectory, `${levelKey}.json`),
      `${JSON.stringify(levelRecords)}\n`
    );
  }

  await writeFile(
    resolve(publicKanjiDirectory, "all.json"),
    `${JSON.stringify(indexMetadata, null, 2)}\n`
  );

  const reportLevels = [1, 2, 3, 4, 5];
  const countRows = [
    "| JLPT level | " + grades.map((grade) => `Grade ${grade}`).join(" | ") + " | Total |",
    "|---|" + grades.map(() => "---:|").join("") + "---:|",
    ...reportLevels.map((level) => {
      const levelCounts = grades.map((grade) => counts.get(`${level}-${grade}`) ?? 0);
      return `| N${level} | ${levelCounts.join(" | ")} | ${levelCounts.reduce((sum, count) => sum + count, 0)} |`;
    }),
  ];
  const longestLabels = [...records]
    .sort((left, right) => right.label.length - left.label.length || left.c.localeCompare(right.c))
    .slice(0, 20);
  const report = [
    "# Kanji data report",
    "",
    `Included kanji: ${records.length}`,
    "",
    "## Counts by JLPT level and grade",
    "",
    countRows.join("\n"),
    "",
    "## Meanings dropped",
    "",
    `Dropped meanings (including duplicates and filtered noise): ${meaningsDropped}`,
    "",
    "## Excluded kanji",
    "",
    excluded.length ? excluded.join("、") : "None",
    "",
    "## 20 longest labels",
    "",
    "| Kanji | Label | Characters |",
    "|---|---|---:|",
    ...longestLabels.map((record) => `| ${record.c} | ${record.label} | ${record.label.length} |`),
    "",
  ].join("\n");
  await writeFile(reportPath, report);
  console.log(report);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
