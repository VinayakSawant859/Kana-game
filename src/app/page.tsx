import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GameLayout } from "@/lib/game-core/layout";
import { games } from "@/games/registry";

export default function GamesHub() {
  return (
    <GameLayout label="GAMES" glyph="遊">
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 pb-10 sm:px-8">
        <div className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Japanese practice</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Choose your game</h1>
          <p className="mt-3 max-w-xl text-[var(--muted)]">Short, focused games for learning Japanese writing.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {games.map((game) => {
            const card = (
              <>
                <span className="mb-5 grid size-12 place-items-center rounded-full bg-[var(--sakura-light)] font-japanese text-2xl text-[var(--primary-fg)]">
                  {game.id === "kana" ? "あ" : "漢"}
                </span>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">{game.title}</h2>
                    <p className="mt-2 text-sm text-[var(--muted)]">{game.description}</p>
                  </div>
                  {game.status === "live" && <ArrowRight className="mt-1 shrink-0 text-[var(--primary-fg)] transition-transform group-hover:translate-x-1" />}
                </div>
                <span className={`mt-6 inline-flex rounded-full px-3 py-1 text-xs font-bold ${game.status === "live" ? "bg-[var(--correct)]/15 text-[var(--correct)]" : "bg-[var(--sakura-light)] text-[var(--muted)]"}`}>
                  {game.status === "live" ? "Live" : "Coming soon"}
                </span>
              </>
            );
            const cardClass = `group rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_18px_50px_rgba(188,0,45,0.055)] ${game.status === "live" ? "transition-transform hover:-translate-y-1" : "opacity-65"}`;
            return game.status === "live"
              ? <Link key={game.id} href={game.href} className={cardClass}>{card}</Link>
              : <div key={game.id} aria-disabled="true" className={cardClass}>{card}</div>;
          })}
        </div>
      </section>
    </GameLayout>
  );
}
