import { mkdir, readFile, writeFile } from "node:fs/promises";
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

interface KanjiRecord {
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

async function main(): Promise<void> {
const root = process.cwd();
const rawPath = resolve(root, "data-raw/kanji_jlpt_only.json");
const overridePath = resolve(root, "src/data/kanji/meaning-overrides.json");
const outputDirectory = resolve(root, "src/data/kanji");
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
await writeFile(
  resolve(outputDirectory, "kanji.generated.json"),
  `${JSON.stringify(records)}\n`
);

const levels = [1, 2, 3, 4, 5];
const grades = [1, 2, 3, 4, 5, 6, 8, 9];
const countRows = [
  "| JLPT level | " + grades.map((grade) => `Grade ${grade}`).join(" | ") + " | Total |",
  "|---|" + grades.map(() => "---:|").join("") + "---:|",
  ...levels.map((level) => {
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
