"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { GameLayout } from "@/lib/game-core/layout";
import { createKanjiMeaningSession, type KanjiMeaningResult, type KanjiMeaningStatus } from "@/lib/game/kanji-meaning";
import { formatTime } from "@/lib/game-core/time";
import { getGameResult, getGameSession, saveGameSession } from "@/lib/game-core/storage";
import type { StoredKanjiMeaningSession } from "@/lib/game/kanji-meaning";

type Filter = "All" | "Wrong" | "Correct";

export default function KanjiMeaningResultPage() {
  return <Suspense fallback={<main className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">Preparing results...</main>}><KanjiMeaningResultContent /></Suspense>;
}

function KanjiMeaningResultContent() {
  const router = useRouter();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [result, setResult] = useState<KanjiMeaningResult | null>(null);
  const [session, setSession] = useState<StoredKanjiMeaningSession | null>(null);
  const [filter, setFilter] = useState<Filter>("All");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.resolve().then(() => {
      const saved = getGameResult<KanjiMeaningResult>("kanji", sessionId);
      if (!saved || saved.sessionId !== sessionId) {
        router.replace("/games/kanji/meaning");
        return;
      }
      setResult(saved);
      setSession(getGameSession<StoredKanjiMeaningSession>("kanji", sessionId));
    }).catch((loadError: unknown) => {
      console.error("Could not read the kanji meaning result.", loadError);
      setError("This result could not be loaded.");
    });
  }, [router, sessionId]);

  const stats = useMemo(() => {
    if (!result) return null;
    const correct = result.questions.filter((question) => question.status === "correct").length;
    const wrong = result.questions.filter((question) => question.status === "wrong").length;
    const unanswered = result.questions.filter((question) => question.status === "unanswered").length;
    const total = result.questions.length;
    const elapsed = result.endedAt - result.startedAt;
    const average = total ? Math.round(result.questions.reduce((sum, question) => sum + question.timeMs, 0) / total) : 0;
    const grades = [...new Set(result.questions.map((question) => question.grade))].sort((a, b) => a - b);
    return { correct, wrong, unanswered, total, elapsed, average, grades, percentage: total ? Math.round(correct / total * 100) : 0 };
  }, [result]);

  if (error) return <main className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">{error}</main>;
  if (!result || !stats) return <main className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">Preparing results...</main>;
  const filtered = result.questions.filter((question) => filter === "All" || question.status.toLowerCase() === filter.toLowerCase());
  const missedIds = result.questions.filter((question) => question.status !== "correct").map((question) => question.kanji);

  async function startPractice(missedOnly: boolean) {
    if (!result || working) return;
    setWorking(true);
    setError("");
    try {
      const newSession = await createKanjiMeaningSession({
        levels: result.settings.levels,
        grades: result.settings.grades,
        size: result.settings.size,
        ...(missedOnly ? { kanjiIds: missedIds } : result.settings.kanjiIds ? { kanjiIds: result.settings.kanjiIds } : {}),
      });
      saveGameSession("kanji", newSession.sessionId, newSession);
      router.push(`/games/kanji/meaning/play/${newSession.sessionId}`);
    } catch (startError) {
      console.error("Could not start the next kanji meaning session.", startError);
      setError("A new session could not be started.");
      setWorking(false);
    }
  }

  const gradeStats = stats.grades.map((grade) => {
    const questions = result.questions.filter((question) => question.grade === grade);
    return { grade, correct: questions.filter((question) => question.status === "correct").length, total: questions.length };
  });

  return (
    <GameLayout label="KANJI" glyph="漢">
      <section className="mx-auto w-full max-w-6xl flex-1 px-5 pb-8 sm:px-8">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_18px_50px_rgba(188,0,45,0.055)] sm:p-8">
          <div className="flex flex-col justify-between gap-5 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-center">
            <div><p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Session complete</p><h1 className="text-2xl font-bold sm:text-3xl">Meaning practice results</h1></div>
            <div className="rounded-md bg-[var(--sakura-light)] px-5 py-3">
              <p className="text-2xl font-bold">{stats.correct} / {stats.total}</p>
              <p className="text-sm text-[var(--muted)]">{stats.percentage}% · {formatTime(stats.elapsed)}</p>
            </div>
          </div>
          <div className="my-5 flex flex-wrap gap-2">
            <SummaryChip label="Correct" value={stats.correct} />
            <SummaryChip label="Wrong" value={stats.wrong} />
            {result.endedEarly && <SummaryChip label="Unanswered" value={stats.unanswered} />}
            <SummaryChip label="Average time" value={`${(stats.average / 1000).toFixed(1)}s`} />
          </div>
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-bold">By grade</h2>
            <div className="flex flex-wrap gap-2">
              {gradeStats.map(({ grade, correct, total }) => <span key={grade} className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold">{grade === 8 ? "Secondary (8)" : grade === 9 ? "Names (9)" : `Grade ${grade}`}: {correct} / {total}</span>)}
            </div>
          </section>
          <div className="mb-3 flex flex-wrap gap-2 border-b border-[var(--line)] pb-3">
            {(["All", "Wrong", "Correct"] as Filter[]).map((tab) => {
              const count = tab === "All" ? stats.total : tab === "Wrong" ? stats.wrong : stats.correct;
              return <button key={tab} type="button" onClick={() => setFilter(tab)} aria-pressed={filter === tab} className={`rounded-md px-3 py-2 text-sm font-bold ${filter === tab ? "bg-[var(--primary)] text-white" : "secondary-button border"}`}>{tab} ({count})</button>;
            })}
          </div>
          <div className="overflow-x-auto rounded-md border border-[var(--line)]">
            <table className="w-full min-w-[780px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr><th className="p-3">Kanji</th><th className="p-3">Meaning</th><th className="p-3">You chose</th><th className="p-3">On / Kun</th><th className="p-3">Result</th></tr>
              </thead>
              <tbody>
                {filtered.map((question) => <tr key={question.id} className="border-t border-[var(--line)]">
                  <td className="p-3 font-japanese text-2xl">{question.kanji}</td>
                  <td className="p-3 font-semibold">{question.correctLabel}</td>
                  <td className="p-3">{question.status === "wrong" ? question.chosenLabel : "—"}</td>
                  <td className="p-3 text-xs text-[var(--muted)]"><span className="block">On: {question.on.join("、") || "—"}</span><span className="mt-1 block">Kun: {question.kun.join("、") || "—"}</span></td>
                  <td className="p-3"><ResultBadge status={question.status} /></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {error && <p role="alert" className="mt-3 text-sm font-semibold text-[var(--wrong)]">{error}</p>}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button type="button" disabled={!missedIds.length || working} onClick={() => startPractice(true)} className="secondary-button flex h-12 flex-1 items-center justify-center gap-2 rounded-md border text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw size={17} />Practice missed kanji ({missedIds.length})</button>
            <button type="button" disabled={working} onClick={() => startPractice(false)} className="primary-button flex h-12 flex-1 items-center justify-center gap-2 rounded-md text-sm font-bold">Play again <ArrowRight size={17} /></button>
            <button type="button" onClick={() => router.push("/games/kanji/meaning")} className="secondary-button h-12 flex-1 rounded-md border text-sm font-bold">Change settings</button>
          </div>
          {!session && <p className="mt-3 text-xs text-[var(--muted)]">The original session settings are unavailable; play again still uses the saved result settings.</p>}
        </div>
      </section>
    </GameLayout>
  );
}

function SummaryChip({ label, value }: { label: string; value: string | number }) {
  return <span className="rounded-full bg-[var(--sakura-light)] px-3 py-1.5 text-xs font-bold">{label}: {value}</span>;
}

function ResultBadge({ status }: { status: KanjiMeaningStatus }) {
  if (status === "correct") return <span className="inline-flex items-center gap-1 font-bold text-[var(--correct)]"><Check size={15} /> Correct</span>;
  if (status === "wrong") return <span className="inline-flex items-center gap-1 font-bold text-[var(--wrong)]"><X size={15} /> Wrong</span>;
  return <span className="font-bold text-[var(--muted)]">— Unanswered</span>;
}
