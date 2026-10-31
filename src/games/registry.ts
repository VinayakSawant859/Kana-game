export interface GameEntry {
  id: string;
  title: string;
  description: string;
  href: string;
  badge: string;
  status: "live" | "soon";
  ctaLabel?: string;
}

export const games: GameEntry[] = [
  {
    id: "kana",
    title: "Kana Practice",
    description: "Build confidence with hiragana and katakana.",
    href: "/games/kana",
    badge: "あ",
    status: "live",
    ctaLabel: "Practice kana",
  },
  {
    id: "kanji-meaning",
    title: "Kanji Meaning",
    description: "Recognize JLPT and school-grade kanji and learn what they mean.",
    href: "/games/kanji/meaning",
    badge: "漢",
    status: "live",
    ctaLabel: "Practice meanings",
  },
  {
    id: "vocabulary",
    title: "Vocabulary Meaning",
    description: "Type the English meaning of Japanese words.",
    href: "/games/vocabulary",
    badge: "語",
    status: "live",
    ctaLabel: "Practice words",
  },
  {
    id: "kanji-reading",
    title: "Kanji Reading",
    description: "Master on'yomi and kun'yomi readings across JLPT levels.",
    href: "/games/kanji/reading",
    badge: "読",
    status: "soon",
  },
  {
    id: "review",
    title: "FSRS Review Hub",
    description: "Adaptive spaced-repetition reviews tailored to your memory curve.",
    href: "/review",
    badge: "復",
    status: "live",
    ctaLabel: "Open reviews",
  },
];
