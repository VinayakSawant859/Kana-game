/**
 * Generates lightweight SVG cover placeholders for every graded story.
 *
 * Output: public/images/stories/placeholders/<slug>.svg (+ default.svg)
 * The Reading UI paints these instantly while the heavier PNG illustration
 * at public/images/stories/<slug>.png is still downloading/decoding.
 *
 * Run: npm run build:story-placeholders
 */
import fs from "node:fs";
import path from "node:path";

type Motif =
  | "waves"
  | "mountain"
  | "moon"
  | "fireworks"
  | "peach"
  | "default";

interface Theme {
  kanji: string;
  accent: string;
  bg1: string;
  bg2: string;
  motif: Motif;
}

const ROOT = process.cwd();
const STORIES_DIR = path.join(ROOT, "src/data/content/stories");
const OUT_DIR = path.join(ROOT, "public/images/stories/placeholders");

const themes: Record<string, Theme> = {
  // N5 Everyday Life
  school: { kanji: "学", accent: "#2563eb", bg1: "#eff6ff", bg2: "#bfdbfe", motif: "default" },
  "waking-up": { kanji: "朝", accent: "#ea580c", bg1: "#fff7ed", bg2: "#fed7aa", motif: "moon" },
  restaurant: { kanji: "食", accent: "#dc2626", bg1: "#fef2f2", bg2: "#fecaca", motif: "default" },
  library: { kanji: "本", accent: "#7c3aed", bg1: "#f5f3ff", bg2: "#ddd6fe", motif: "default" },
  supermarket: { kanji: "買", accent: "#16a34a", bg1: "#f0fdf4", bg2: "#bbf7d0", motif: "default" },
  market: { kanji: "市", accent: "#d97706", bg1: "#fffbeb", bg2: "#fde68a", motif: "default" },
  "meeting-friend": { kanji: "友", accent: "#db2777", bg1: "#fdf2f8", bg2: "#fbcfe8", motif: "default" },
  "playing-with-friends": { kanji: "遊", accent: "#0891b2", bg1: "#ecfeff", bg2: "#a5f3fc", motif: "default" },
  "studying-late": { kanji: "夜", accent: "#4f46e5", bg1: "#eef2ff", bg2: "#c7d2fe", motif: "moon" },
  theatre: { kanji: "映", accent: "#be123c", bg1: "#fff1f2", bg2: "#fecdd3", motif: "default" },

  // N5 Fairy Tales
  "urashima-taro": { kanji: "亀", accent: "#0284c7", bg1: "#f0f9ff", bg2: "#bae6fd", motif: "waves" },
  kintaro: { kanji: "金", accent: "#dc2626", bg1: "#fef2f2", bg2: "#fecaca", motif: "mountain" },
  "tongue-cut-sparrow": { kanji: "雀", accent: "#b45309", bg1: "#fffbeb", bg2: "#fde68a", motif: "default" },
  "moon-child": { kanji: "月", accent: "#ca8a04", bg1: "#fefce8", bg2: "#fef08a", motif: "moon" },
  "n5-my-lord-bag-of-rice": { kanji: "俵", accent: "#059669", bg1: "#ecfdf5", bg2: "#a7f3d0", motif: "waves" },
  "princess-hase": { kanji: "姫", accent: "#db2777", bg1: "#fdf2f8", bg2: "#fbcfe8", motif: "default" },
  "farmer-and-badger": { kanji: "狸", accent: "#9333ea", bg1: "#faf5ff", bg2: "#e9d5ff", motif: "mountain" },
  shinansha: { kanji: "車", accent: "#4f46e5", bg1: "#eef2ff", bg2: "#c7d2fe", motif: "default" },
  matsuyama: { kanji: "鏡", accent: "#0d9488", bg1: "#f0fdfa", bg2: "#99f6e4", motif: "moon" },
  "wish-to-die": { kanji: "寿", accent: "#e11d48", bg1: "#fff1f2", bg2: "#fecdd3", motif: "default" },

  // N4 Everyday Life
  university: { kanji: "学", accent: "#2563eb", bg1: "#eff6ff", bg2: "#bfdbfe", motif: "default" },
  bank: { kanji: "銀", accent: "#0f766e", bg1: "#f0fdfa", bg2: "#99f6e4", motif: "default" },
  airport: { kanji: "空", accent: "#0284c7", bg1: "#f0f9ff", bg2: "#bae6fd", motif: "default" },
  shinkansen: { kanji: "幹", accent: "#1d4ed8", bg1: "#eff6ff", bg2: "#bfdbfe", motif: "mountain" },
  "family-vacation": { kanji: "旅", accent: "#0891b2", bg1: "#ecfeff", bg2: "#a5f3fc", motif: "waves" },
  "baseball-stadium": { kanji: "球", accent: "#16a34a", bg1: "#f0fdf4", bg2: "#bbf7d0", motif: "default" },
  "going-on-date": { kanji: "恋", accent: "#e11d48", bg1: "#fff1f2", bg2: "#fecdd3", motif: "default" },
  hanabi: { kanji: "花", accent: "#9333ea", bg1: "#faf5ff", bg2: "#e9d5ff", motif: "fireworks" },
  "police-station": { kanji: "交", accent: "#475569", bg1: "#f8fafc", bg2: "#cbd5e1", motif: "default" },
  zoo: { kanji: "園", accent: "#15803d", bg1: "#f0fdf4", bg2: "#bbf7d0", motif: "default" },

  // N4 Fairy Tales
  momotaro: { kanji: "桃", accent: "#e11d48", bg1: "#fff1f2", bg2: "#fecdd3", motif: "peach" },
  "monkey-and-crab": { kanji: "蟹", accent: "#ea580c", bg1: "#fff7ed", bg2: "#fed7aa", motif: "default" },
  "white-hare-and-croc": { kanji: "兎", accent: "#0284c7", bg1: "#f0f9ff", bg2: "#bae6fd", motif: "waves" },
  "withered-trees": { kanji: "桜", accent: "#db2777", bg1: "#fdf2f8", bg2: "#fbcfe8", motif: "default" },
  "lost-wen": { kanji: "踊", accent: "#7c3aed", bg1: "#f5f3ff", bg2: "#ddd6fe", motif: "moon" },
  "skillful-fisher": { kanji: "釣", accent: "#0369a1", bg1: "#f0f9ff", bg2: "#bae6fd", motif: "waves" },
  "yamato-take": { kanji: "剣", accent: "#b91c1c", bg1: "#fef2f2", bg2: "#fecaca", motif: "mountain" },
  roshomon: { kanji: "門", accent: "#991b1b", bg1: "#fef2f2", bg2: "#fecaca", motif: "moon" },
  adachigahara: { kanji: "原", accent: "#6d28d9", bg1: "#f5f3ff", bg2: "#ddd6fe", motif: "moon" },
  "empress-jokwa": { kanji: "天", accent: "#0d9488", bg1: "#f0fdfa", bg2: "#99f6e4", motif: "default" },
  "fish-and-monkey": { kanji: "海", accent: "#0284c7", bg1: "#f0f9ff", bg2: "#bae6fd", motif: "waves" },
  "monkey-boar": { kanji: "山", accent: "#b45309", bg1: "#fffbeb", bg2: "#fde68a", motif: "mountain" },
};

const defaultTheme: Theme = {
  kanji: "読",
  accent: "#e11d48",
  bg1: "#fff1f2",
  bg2: "#fecdd3",
  motif: "default",
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function motifDecor(motif: Motif, accent: string): string {
  switch (motif) {
    case "waves":
      return `<path d="M40 310Q90 280 140 310T240 310T340 310T440 310T540 310" fill="none" stroke="${accent}" stroke-width="5" stroke-opacity=".28" stroke-linecap="round"/>
  <path d="M20 340Q70 310 120 340T220 340T320 340T420 340T560 340" fill="none" stroke="${accent}" stroke-width="4" stroke-opacity=".2" stroke-linecap="round"/>`;
    case "mountain":
      return `<path d="M40 350L170 210L290 350Z" fill="${accent}" fill-opacity=".12"/>
  <path d="M260 350L420 180L560 350Z" fill="${accent}" fill-opacity=".16"/>`;
    case "moon":
      return `<circle cx="470" cy="95" r="46" fill="${accent}" fill-opacity=".22"/>
  <path d="M60 110H150M90 130H180" stroke="${accent}" stroke-width="5" stroke-opacity=".22" stroke-linecap="round"/>`;
    case "fireworks":
      return `<circle cx="120" cy="100" r="38" fill="none" stroke="${accent}" stroke-width="3" stroke-dasharray="4 8" stroke-opacity=".35"/>
  <circle cx="480" cy="110" r="48" fill="none" stroke="${accent}" stroke-width="3" stroke-dasharray="5 9" stroke-opacity=".35"/>`;
    case "peach":
      return `<path d="M300 75C245 75 205 125 205 180C205 245 265 280 300 295C335 280 395 245 395 180C395 125 355 75 300 75Z" fill="${accent}" fill-opacity=".12"/>`;
    default:
      return `<circle cx="110" cy="95" r="28" fill="${accent}" fill-opacity=".12"/>
  <circle cx="495" cy="295" r="40" fill="${accent}" fill-opacity=".12"/>
  <path d="M65 315H175M425 95H525" stroke="${accent}" stroke-width="5" stroke-opacity=".2" stroke-linecap="round"/>`;
  }
}

function buildSvg(opts: {
  id: string;
  title: string;
  titleEn: string;
  level: string;
  theme: Theme;
}): string {
  const { id, level, theme } = opts;
  const { kanji, accent, bg1, bg2, motif } = theme;
  const title = escapeXml(opts.title);
  const en = escapeXml(opts.titleEn.length > 36 ? `${opts.titleEn.slice(0, 34)}…` : opts.titleEn);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="bg-${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
  </defs>
  <rect width="600" height="400" rx="24" fill="url(#bg-${id})"/>
  <rect x="18" y="18" width="564" height="364" rx="18" fill="none" stroke="${accent}" stroke-opacity=".22" stroke-width="2"/>
  ${motifDecor(motif, accent)}
  <circle cx="300" cy="175" r="82" fill="#fff" fill-opacity=".86" stroke="${accent}" stroke-width="3" stroke-opacity=".35"/>
  <circle cx="300" cy="175" r="72" fill="none" stroke="${accent}" stroke-width="1.2" stroke-dasharray="4 4" stroke-opacity=".4"/>
  <text x="300" y="203" text-anchor="middle" font-family="serif" font-size="80" font-weight="700" fill="${accent}">${kanji}</text>
  <g transform="translate(495 42)">
    <rect width="54" height="54" rx="10" fill="#dc2626" fill-opacity=".9"/>
    <rect x="4" y="4" width="46" height="46" rx="7" fill="none" stroke="#fff" stroke-width="1.5" stroke-opacity=".8"/>
    <text x="27" y="34" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="800" fill="#fff">${escapeXml(level)}</text>
  </g>
  <rect x="90" y="284" width="420" height="72" rx="14" fill="#fff" fill-opacity=".88" stroke="${accent}" stroke-opacity=".2" stroke-width="1.5"/>
  <text x="300" y="317" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="700" fill="#1e293b">${title}</text>
  <text x="300" y="342" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="500" fill="#64748b">${en}</text>
</svg>
`;
}

function walkJson(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkJson(full);
    return entry.name.endsWith(".json") && entry.name !== "lexicon.json" ? [full] : [];
  });
}

function main(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let count = 0;
  const missingThemes: string[] = [];

  for (const file of walkJson(STORIES_DIR)) {
    const slug = path.basename(file, ".json");
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as {
      title: string;
      titleEn: string;
      level: string;
    };
    const theme = themes[slug];
    if (!theme) missingThemes.push(slug);
    fs.writeFileSync(
      path.join(OUT_DIR, `${slug}.svg`),
      buildSvg({ id: slug, title: raw.title, titleEn: raw.titleEn, level: raw.level, theme: theme ?? defaultTheme }),
      "utf8"
    );
    count++;
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "default.svg"),
    buildSvg({ id: "default", title: "日本語の物語", titleEn: "Japanese Graded Reader", level: "読", theme: defaultTheme }),
    "utf8"
  );

  console.log(`Generated ${count} story placeholders + default.svg in ${path.relative(ROOT, OUT_DIR)}`);
  if (missingThemes.length) {
    console.warn(`Used default theme for: ${missingThemes.join(", ")}`);
  }
}

main();

