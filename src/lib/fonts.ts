import { Inter, Noto_Sans_JP, Yuji_Syuku } from "next/font/google";

export const inter = Inter({
  variable: "--font-inter",
  display: "swap",
  subsets: ["latin"],
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

export const appFontVariables = `${inter.variable} ${notoSansJP.variable} ${yujiSyuku.variable}`;
