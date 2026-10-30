# Kana-Play · 日本語練習

> A fast, tactile, local-first Japanese writing and vocabulary practice platform. Practice Kana (Hiragana & Katakana), Kanji meanings, and JLPT vocabulary with paper-card animations, Day/Night themes, and responsive mobile-first ergonomics.

---

## Features & Game Modes

### 1. Kana Practice (`/games/kana`)
* **Comprehensive Scripts**: Hiragana, Katakana, or simultaneous practice.
* **Granular Row Selection**: Basic gojūon, Dakuten / Handakuten, Yōon digraphs, and modern Katakana extended combinations.
* **Deterministic Single-Deck Engine**: Question order and shuffles are generated once per session with an injectable seeded RNG.
* **Immediate Feedback & Statistics**: Tracks first-try accuracy, retries, and mistakes with detailed post-session breakdowns.

### 2. Kanji: Guess the Meaning (`/games/kanji/meaning`)
* **JLPT & School-Grade Coverage**: 2,208 curated kanji spanning JLPT N5 through N1 and elementary grades 1–6, Secondary (8), and Names (9).
* **Smart Distractor Disambiguation**: Algorithmic synonym and stem filtering ensures multiple-choice options never present ambiguous or conflicting definitions.
* **Static Partitioned Data Pipeline**: Kanji records are pre-cleaned and partitioned into cached per-level JSON payloads (`/public/data/v1/kanji/N[1-5].json`), keeping bundle sizes ultralight.

### 3. Vocabulary Meaning (`/games/vocabulary`)
* **Rich JLPT Lexicon**: Over 7,800 vocabulary words with English meanings and example sentences.
* **Interactive Hint System**: Reveal furigana readings or individual kanji character meanings at the cost of score penalties.
* **Ruby Text Furigana**: Native Japanese sentence examples rendered with `<ruby>` annotations.

### 4. Spaced Repetition & Reading *(Coming Soon)*
* **Kanji Reading**: Practice on'yomi and kun'yomi readings with kana typing inputs.
* **FSRS Review Hub**: Adaptive spaced-repetition scheduler optimizing reviews against individual forgetting curves.

---

## Architectural Design

The codebase enforces a strict four-tier architectural pattern: `data → engine → hooks → components`.

```
src/
├── engine/        # Pure, framework-agnostic TypeScript logic (zero React/DOM imports)
│   ├── kana.ts              # Check answers, normalize input, deck generation
│   ├── kana-session.ts      # Pure session state reducer, transitions, finalizer
│   ├── kanji-meaning.ts     # Distractor generation, disambiguation, scoring
│   └── random.ts            # Seeded PRNG and Fisher-Yates shuffle
├── data/          # Data access abstractions and typed fetch loaders
│   ├── kanji.ts             # On-demand, cached per-level kanji data fetcher
│   ├── kana.ts              # Character registry, rows, and sample pairs
│   └── vocabulary.ts        # OpenJLPT dataset loaders and normalizers
├── hooks/         # Reusable client hooks (session guards, keyboard handlers)
├── components/    # Reusable atomic UI components (theme toggle, layout shells)
└── app/           # Next.js App Router pages and route handlers
```

### Mobile-First & Ergonomic Highlights
* **Dynamic Viewport (`min-h-dvh`)**: Eliminates address-bar resizing jumpiness on iOS Safari and mobile Chrome.
* **Safe-Area Insets**: Uses `pt-safe` and `pb-safe` utilities with `env(safe-area-inset-*)` to prevent UI overlaps with mobile gesture bars.
* **Touch Targets & Focus**: Minimum 44×44px interactive touch targets across chips, buttons, and switches, with global tap-to-focus fallback and mobile virtual keyboard helpers (`enterKeyHint="go"`, `inputMode="text"`).
* **Hardware-Accelerated Transitions**: Pure CSS transforms (`translate3d`, `opacity`) with `will-change: transform` and full `@media (prefers-reduced-motion: reduce)` accessibility support.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | [Next.js](https://nextjs.org/) 16 (App Router, Turbopack) |
| **Library** | [React](https://react.dev/) 19 (Server & Client Components) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (Strict Mode) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) 4 |
| **Typography** | `next/font` (Inter, Noto Sans JP, Noto Serif JP, Yuji Syuku) |
| **Testing** | [Vitest](https://vitest.dev/) & [Testing Library](https://testing-library.com/) |
| **Icons** | [Lucide React](https://lucide.dev/) |

---

## Getting Started

### Prerequisites
* Node.js `22.x` (or newer)
* npm `10.x` (or newer)

### Installation & Development

```bash
# 1. Clone the repository
git clone https://github.com/VinayakSawant859/Kana-game.git
cd Kana-game

# 2. Install dependencies
npm ci

# 3. (Optional) Rebuild static kanji data partitions
npm run build:kanji-data

# 4. Start local development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the Games Hub.

### Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server with Turbopack. |
| `npm test` | Runs all 20 test suites (81 unit & integration tests) via Vitest. |
| `npm run lint` | Runs ESLint checks across TypeScript and React code. |
| `npm run build` | Builds an optimized production bundle with static prerendering. |
| `npm run build:kanji-data` | Processes raw KANJIDIC data into public static JSON files (`public/data/v1/kanji/`). |

---

## Deployment

The application is optimized for deployment on Vercel's Hobby tier with zero configuration.

See [DEPLOY.md](./DEPLOY.md) for full deployment instructions and configuration details.

---

## Data Attribution & Acknowledgments

* **KANJIDIC & EDRDG**: Kanji dictionary entries and readings are derived from the KANJIDIC project by the Electronic Dictionary Research and Development Group (EDRDG), licensed under [CC BY-SA 3.0 / 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
* **OpenJLPT**: Vocabulary definitions and sentence examples are sourced from [OpenJLPT](https://github.com/evanclan/OpenJLPT) (derived from JMdict, KANJIDIC2, and Tatoeba, CC BY-SA 4.0).
* **Fonts**: Google Fonts (Inter, Noto Sans JP, Noto Serif JP, Yuji Syuku) are self-hosted via `next/font` under the [SIL Open Font License (OFL)](https://openfontlicense.org/).
* Full attribution details are documented in [ASSETS.md](./ASSETS.md) and [NOTICE.md](./src/data/openjlpt/NOTICE.md).

---

## License

This project is open-source under the MIT License. Data assets retain their respective Creative Commons licenses.
