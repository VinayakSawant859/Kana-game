import type { Metadata, Viewport } from "next";
import { appFontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kana Practice — Japanese Kana Flashcards",
  description: "Learn hiragana and katakana with focused, interactive flashcard practice.",
  openGraph: {
    title: "Kana Practice — Japanese Kana Flashcards",
    description: "Learn hiragana and katakana with focused, interactive flashcard practice.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf6f1" },
    { media: "(prefers-color-scheme: dark)", color: "#150a0e" },
  ],
};

const themeScript = `
  try {
    const saved = localStorage.getItem("kana-theme");
    const theme = saved === "light" || saved === "dark"
      ? saved
      : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
  } catch {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={appFontVariables}>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
