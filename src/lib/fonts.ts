import localFont from "next/font/local";
import { Noto_Sans_JP, Yuji_Syuku } from "next/font/google";

export const helveticaNow = localFont({
  src: [
    { path: "../fonts/helvetica-now/HelveticaNowText-Bold.ttf", weight: "700", style: "normal" },
    { path: "../fonts/helvetica-now/HelveticaNowText-BoldItalic.ttf", weight: "700", style: "italic" },
    { path: "../fonts/helvetica-now/HelveticaNowText-Black.ttf", weight: "900", style: "normal" },
    { path: "../fonts/helvetica-now/HelveticaNowText-BlackItalic.ttf", weight: "900", style: "italic" },
  ],
  variable: "--font-ui",
  display: "swap",
  fallback: ["Helvetica Neue", "Helvetica", "Nimbus Sans", "Arial", "Noto Sans JP", "sans-serif"],
});

export const notoSansJP = Noto_Sans_JP({
  variable: "--font-japanese",
  weight: ["400", "700"],
  display: "swap",
  subsets: ["latin"],
  preload: false,
});

export const yujiSyuku = Yuji_Syuku({
  variable: "--font-kana",
  weight: ["400"],
  display: "swap",
  subsets: ["latin"],
  preload: false,
});

export const appFontVariables = `${helveticaNow.variable} ${notoSansJP.variable} ${yujiSyuku.variable}`;
