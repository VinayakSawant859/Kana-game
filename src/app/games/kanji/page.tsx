import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GameLayout } from "@/lib/game-core/layout";

const modes = [
  { title: "Meaning", description: "Choose the English meaning for each kanji.", href: "/games/kanji/meaning", live: true },
  { title: "Reading", description: "Practice on'yomi and kun'yomi readings.", live: false },
  { title: "Kanji from meaning", description: "Find the kanji that matches a meaning.", live: false },
  { title: "Typing", description: "Practice typing kanji from their readings.", live: false },
];

export default function KanjiModesPage() {
  return (
    <GameLayout label="KANJI" glyph="漢">
      <section className="mx-auto w-full max-w-5xl flex-1 px-5 pb-10 sm:px-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Choose a mode</p>
        <h1 className="mb-7 text-3xl font-bold">Kanji practice</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          {modes.map((mode) => {
            const content = (
              <>
                <span className="mb-5 grid size-11 place-items-center rounded-full bg-[var(--sakura-light)] font-japanese text-xl text-[var(--primary-fg)]">
                  {mode.live ? "意" : "漢"}
                </span>
                <h2 className="text-lg font-bold">{mode.title}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">{mode.description}</p>
                <span className="mt-5 flex items-center justify-between text-xs font-bold">
                  <span className={mode.live ? "text-[var(--correct)]" : "text-[var(--muted)]"}>{mode.live ? "Live" : "Coming soon"}</span>
                  {mode.live && <ArrowRight size={17} className="text-[var(--primary-fg)]" />}
                </span>
              </>
            );
            const className = `rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 ${mode.live ? "transition-transform hover:-translate-y-1" : "opacity-65"}`;
            return mode.live && mode.href ? (
              <Link key={mode.title} href={mode.href} className={className}>{content}</Link>
            ) : (
              <div key={mode.title} aria-disabled="true" className={className}>{content}</div>
            );
          })}
        </div>
      </section>
    </GameLayout>
  );
}
