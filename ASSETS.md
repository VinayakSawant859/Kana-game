# Assets

## Sakura background

- `public/backgrounds/sakura-gradient.svg`
- Source: original SVG matching the supplied sakura-to-Japanese-red gradient specification.
- License: project-owned reference asset.

## Fonts

- Inter is the UI font, bundled at build time through `next/font/google`. Its CSS stack keeps native Helvetica first on Apple devices.
- Noto Sans JP is used as the Japanese sans-serif fallback.
- Yuji Syuku is used for the kana card lettering.
- Kanji cards use Yuji Syuku with Yu Mincho, Noto Serif JP, Hiragino Mincho ProN, and Japanese serif fallbacks. FontTools coverage checks against the 2,211 raw kanji confirmed complete glyph coverage in both Yuji Syuku and Noto Serif JP.
- Inter, Noto Sans JP, Noto Serif JP, Yuji Syuku, and the optional Arimo alternative are licensed under the SIL Open Font License (OFL).

## Kanji data

- The meaning game uses kanji records derived from KANJIDIC.
- © Electronic Dictionary Research and Development Group (EDRDG), CC BY-SA.
- JLPT levels are unofficial community lists and may vary by source.

Google fonts are self-hosted in the generated app assets by `next/font`; visitors' browsers do not request fonts from Google.
