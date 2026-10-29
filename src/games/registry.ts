export interface GameEntry {
  id: string;
  title: string;
  description: string;
  href: string;
  status: "live" | "soon";
}

export const games: GameEntry[] = [
  {
    id: "kana",
    title: "Kana Practice",
    description: "Build confidence with hiragana and katakana.",
    href: "/games/kana",
    status: "live",
  },
  {
    id: "kanji",
    title: "Kanji",
    description: "Recognize kanji and learn what they mean.",
    href: "/games/kanji",
    status: "live",
  },
  {
    id: "vocabulary",
    title: "Vocabulary Meaning",
    description: "Type the English meaning of Japanese words.",
    href: "/games/vocabulary",
    status: "live",
  },
];
