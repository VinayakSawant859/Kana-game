import Link from "next/link";
import type { PointerEventHandler, ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export function GameHeader({ label, glyph }: { label: string; glyph: string }) {
  return (
    <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8 sm:py-6">
      <Link className="flex items-center gap-2.5" href="/" aria-label={`${label} home`}>
        <span className="grid size-9 place-items-center rounded-full bg-[var(--primary)] font-japanese text-xl text-white">
          {glyph}
        </span>
        <span className="text-sm font-bold tracking-[0.18em]">{label}</span>
      </Link>
      <ThemeToggle />
    </nav>
  );
}

export function GameLayout({
  label,
  glyph,
  children,
  className = "",
  onPointerDown,
}: {
  label: string;
  glyph: string;
  children: ReactNode;
  className?: string;
  onPointerDown?: PointerEventHandler<HTMLElement>;
}) {
  return (
    <main
      className={`relative flex min-h-dvh flex-col bg-[var(--bg)] text-[var(--ink)] ${className}`}
      onPointerDown={onPointerDown}
    >
      <GameHeader label={label} glyph={glyph} />
      {children}
    </main>
  );
}
