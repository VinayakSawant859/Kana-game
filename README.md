# Kana-Play

Kana-Play is a Japanese-learning app with games for practicing kana, kanji meanings, and vocabulary meanings.

Vocabulary and kanji data are bundled from OpenJLPT. See [ASSETS.md](./ASSETS.md) and the included [OpenJLPT notice](./src/data/openjlpt/NOTICE.md) for attribution and licensing.

## Getting Started

Install dependencies and run the development server:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run the checks and production build with:

```bash
npm run lint
npm test
npm run build
```

## Deploy

This app is prepared for deployment on Vercel's Hobby plan. Follow [DEPLOY.md](./DEPLOY.md) for dashboard setup and deployment steps.
