import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GameLayout } from "@/lib/game-core/layout";
import { games } from "@/games/registry";

export default function GamesHub() {
  return (
    <GameLayout
      label="NIHONGO GAMES"
      glyph="遊"
      rightSlot={
        <a
          href="https://github.com/VinayakSawant859/Kana-game"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub repository"
          className="grid size-11 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:text-[var(--primary-fg)]"
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
          </svg>
        </a>
      }
    >
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between px-5 pb-8 sm:px-8">
        <div className="my-auto py-4">
          <div className="mb-8">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
              Japanese practice
            </p>
            <h1 className="text-3xl font-bold sm:text-4xl">Choose your game</h1>
            <p className="mt-3 max-w-xl text-[var(--muted)]">
              Short, focused games for mastering Japanese kana, kanji, and vocabulary.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => {
              const isLive = game.status === "live";
              const card = (
                <>
                  <div className="mb-5 flex items-center justify-between">
                    <span className="grid size-12 place-items-center rounded-full bg-[var(--sakura-light)] font-japanese text-2xl text-[var(--primary-fg)]">
                      {game.badge}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                        isLive
                          ? "bg-[var(--correct)]/15 text-[var(--correct)]"
                          : "bg-[var(--sakura-light)] text-[var(--muted)]"
                      }`}
                    >
                      {isLive ? "Live" : "Soon"}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h2 className="text-xl font-bold">{game.title}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                        {game.description}
                      </p>
                    </div>
                    <div className="mt-6 flex items-center justify-between text-xs font-bold">
                      <span className={isLive ? "text-[var(--primary-fg)]" : "text-[var(--muted)]"}>
                        {isLive ? (game.ctaLabel ?? "Start practice") : "Coming soon"}
                      </span>
                      {isLive && (
                        <ArrowRight
                          size={16}
                          className="shrink-0 text-[var(--primary-fg)] transition-transform group-hover:translate-x-1"
                        />
                      )}
                    </div>
                  </div>
                </>
              );
              const cardClass = `group flex flex-col rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_18px_50px_rgba(188,0,45,0.055)] ${
                isLive
                  ? "transition-transform hover:-translate-y-1 hover:border-[var(--sakura)]"
                  : "opacity-65"
              }`;
              return isLive ? (
                <Link key={game.id} href={game.href} className={cardClass}>
                  {card}
                </Link>
              ) : (
                <div key={game.id} aria-disabled="true" className={cardClass}>
                  {card}
                </div>
              );
            })}
          </div>
        </div>

        <footer className="mt-10 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)]">
          <p>
            Kanji &amp; dictionary data derived from{" "}
            <a
              href="https://www.edrdg.org/wiki/index.php/KANJIDIC_Project"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[var(--primary-fg)]"
            >
              KANJIDIC2
            </a>{" "}
            and{" "}
            <a
              href="https://www.edrdg.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[var(--primary-fg)]"
            >
              EDRDG
            </a>{" "}
            (CC BY-SA 3.0 / 4.0).
          </p>
        </footer>
      </section>
    </GameLayout>
  );
}
