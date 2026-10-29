"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { loadVocabularyData, vocabularyLevels, type VocabularyLevel } from "@/data/vocabulary";
import { GameLayout } from "@/lib/game-core/layout";
import { formatTime } from "@/lib/game-core/time";
import { getGameResult, saveGameSession } from "@/lib/game-core/storage";
import {
  buildVocabularyReviewQuestions,
  calculateVocabularyReport,
  createVocabularySession,
  type VocabularyReviewQuestion,
  type VocabularyResult,
} from "@/lib/game/vocabulary";

export default function VocabularyResultPage() {
  return (
    <Suspense fallback={<main className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">Preparing results...</main>}>
      <VocabularyResultContent />
    </Suspense>
  );
}

function isVocabularyResult(value: unknown, sessionId: string): value is VocabularyResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Partial<VocabularyResult>;
  return result.sessionId === sessionId &&
    Array.isArray(result.questions) &&
  result.questions.length > 0 &&
  new Set(result.questions.map((question) => question.id)).size === result.questions.length &&
  result.questions.every((question) =>
    typeof question.id === "string" &&
    Array.isArray(question.attempts) &&
    question.attempts.every((answer) => typeof answer === "string") &&
    Array.isArray(question.kanjiHints) &&
    question.kanjiHints.every((character) => typeof character === "string") &&
    typeof question.furiganaHintUsed === "boolean" &&
    ["correct", "skipped", "unanswered"].includes(question.status) &&
    Number.isFinite(question.pointsEarned) &&
    question.pointsEarned >= 0 &&
    question.pointsEarned <= 100 &&
    Number.isFinite(question.pointsDeducted) &&
    question.pointsDeducted >= 0 &&
    question.pointsDeducted <= 100
  ) &&
  typeof result.settings === "object" &&
  result.settings !== null &&
  Array.isArray(result.settings.levels) &&
  result.settings.levels.length > 0 &&
  result.settings.levels.every((level) => vocabularyLevels.includes(level as VocabularyLevel)) &&
  Array.isArray(result.settings.grades) &&
  result.settings.grades.every((grade) => Number.isInteger(grade) && grade > 0) &&
  (result.settings.size === "all" || [10, 20, 30].includes(result.settings.size)) &&
  Number.isFinite(result.startedAt) &&
  Number.isFinite(result.endedAt) &&
  typeof result.endedEarly === "boolean";
}

function VocabularyResultContent() {
  const router = useRouter();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [result, setResult] = useState<VocabularyResult | null>(null);
  const [reviewQuestions, setReviewQuestions] = useState<VocabularyReviewQuestion[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      const saved = getGameResult<unknown>("vocabulary", sessionId);
      if (!saved || !isVocabularyResult(saved, sessionId)) {
        router.replace("/games/vocabulary");
        return;
      }
      const data = await loadVocabularyData(saved.settings.levels);
      const questions = buildVocabularyReviewQuestions(saved, data);
      if (active) {
        setResult(saved);
        setReviewQuestions(questions);
      }
    }).catch((loadError: unknown) => {
      if (!active) return;
      console.error("Could not read the vocabulary result.", loadError);
      setError("This result could not be loaded.");
    });
    return () => { active = false; };
  }, [router, sessionId]);

  const report = useMemo(
    () => result ? calculateVocabularyReport(result) : null,
    [result]
  );

  async function startPractice(missedOnly: boolean) {
    if (!result || working) return;
    setWorking(true);
    setError("");
    try {
      const missedIds = result.questions
        .filter((question) => question.status !== "correct")
        .map((question) => question.id);
      const settings = missedOnly
        ? { ...result.settings, size: "all" as const }
        : result.settings;
      const data = await loadVocabularyData(settings.levels);
      const session = createVocabularySession(
        {
          levels: settings.levels,
          grades: settings.grades,
          size: settings.size,
          ...(missedOnly ? { ids: missedIds } : {}),
        },
        data
      );
      saveGameSession("vocabulary", session.sessionId, session);
      router.push(`/games/vocabulary/play/${session.sessionId}`);
    } catch (startError) {
      console.error("Could not start the next vocabulary session.", startError);
      setError("A new session could not be started.");
      setWorking(false);
    }
  }

  if (error && !result) {
    return <main className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">{error}</main>;
  }
  if (!result || !report) {
    return <main className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">Preparing results...</main>;
  }

  const missedCount = result.questions.filter((question) => question.status !== "correct").length;
  const maxGradeList = [...new Set(reviewQuestions.flatMap((question) =>
    question.kanji.map((kanji) => kanji.grade).filter((grade): grade is number => grade !== null)
  ))].sort((a, b) => a - b);

  return (
    <GameLayout label="VOCABULARY" glyph="語">
      <section className="mx-auto w-full max-w-6xl flex-1 px-5 pb-8 sm:px-8">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_18px_50px_rgba(188,0,45,0.055)] sm:p-8">
          <div className="flex flex-col justify-between gap-5 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-center">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Session {result.endedEarly ? "ended" : "complete"}</p>
              <h1 className="text-2xl font-bold sm:text-3xl">Vocabulary results</h1>
            </div>
            <div className="rounded-md bg-[var(--sakura-light)] px-5 py-3">
              <p className="text-2xl font-bold">{report.score} / {report.maximumScore} points</p>
              <p className="text-sm text-[var(--muted)]">{report.accuracy}% accuracy · {formatTime(report.completionTime)}</p>
            </div>
          </div>

          <div className="my-5 flex flex-wrap gap-2">
            <SummaryChip label="Questions attempted" value={`${report.attempted} / ${report.total}`} />
            <SummaryChip label="First-try correct" value={report.firstTryCorrect} />
            <SummaryChip label="Correct after retries" value={report.correctAfterRetries} />
            <SummaryChip label="Questions with incorrect attempts" value={report.incorrect} />
            <SummaryChip label="Incorrect attempts" value={report.incorrectAttempts} />
            <SummaryChip label="Skipped" value={report.skipped} />
            {report.unanswered > 0 && <SummaryChip label="Unanswered" value={report.unanswered} />}
            <SummaryChip label="Hints used" value={report.hintsUsed} />
            <SummaryChip label="Potential points deducted" value={report.pointsDeducted} />
          </div>
          <p className="mb-4 text-xs text-[var(--muted)]">
            Accuracy is correct questions divided by questions with at least one answer attempt.
            Skipped or unanswered questions may also include incorrect attempts.
          </p>

          <section className="mb-5">
            <h2 className="mb-2 text-sm font-bold">Selected levels and grades</h2>
            <div className="flex flex-wrap gap-2">
              {result.settings.levels.map((level) => <span key={level} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold">{level}</span>)}
              {maxGradeList.map((grade) => (
                <span key={grade} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold">
                  {grade === 8 ? "Secondary (8)" : grade === 9 ? "Names (9)" : `Grade ${grade}`}
                </span>
              ))}
            </div>
          </section>

          <div className="overflow-x-auto rounded-md border border-[var(--line)]">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="p-3">Word</th>
                  <th className="p-3">Reading</th>
                  <th className="p-3">Expected meaning</th>
                  <th className="p-3">Submitted answer</th>
                  <th className="p-3">Hints used</th>
                  <th className="p-3">Result</th>
                  <th className="p-3">Points</th>
                </tr>
              </thead>
              <tbody>
                {reviewQuestions.map((question) => {
                  const hints = [
                    ...(question.furiganaHintUsed ? ["Furigana"] : []),
                    ...question.kanjiHints.map((character) => `Kanji ${character}`),
                  ];
                  const answer = question.attempts.at(-1);
                  return (
                    <tr key={question.id} className="border-t border-[var(--line)] align-top">
                      <td className="p-3">
                        <span className="block font-japanese text-2xl">{question.word}</span>
                        <span className="text-xs text-[var(--muted)]">{question.level}</span>
                      </td>
                      <td className="p-3 font-japanese">{question.reading}</td>
                      <td className="p-3 font-semibold">{question.meanings.join("; ")}</td>
                      <td className="p-3">
                        {answer || "—"}
                        {(question.status === "correct" ? question.attempts.length - 1 : question.attempts.length) > 0 && (
                          <span className="mt-1 block text-xs text-[var(--muted)]">
                            {question.status === "correct" ? question.attempts.length - 1 : question.attempts.length} incorrect {((question.status === "correct" ? question.attempts.length - 1 : question.attempts.length) === 1) ? "attempt" : "attempts"}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {hints.length ? hints.join(", ") : "—"}
                        {hints.length > 0 && <span className="mt-1 block text-xs text-[var(--muted)]">−{question.pointsDeducted} potential pts</span>}
                      </td>
                      <td className="p-3"><ResultBadge question={question} /></td>
                      <td className="p-3 font-bold">{question.pointsEarned}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {error && <p role="alert" className="mt-3 text-sm font-semibold text-[var(--wrong)]">{error}</p>}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={!missedCount || working}
              onClick={() => startPractice(true)}
              className="secondary-button flex h-12 flex-1 items-center justify-center gap-2 rounded-md border text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw size={17} /> Retry missed words ({missedCount})
            </button>
            <button
              type="button"
              disabled={working}
              onClick={() => startPractice(false)}
              className="primary-button flex h-12 flex-1 items-center justify-center gap-2 rounded-md text-sm font-bold disabled:opacity-50"
            >
              Play again <ArrowRight size={17} />
            </button>
            <button type="button" onClick={() => router.push("/games/vocabulary")} className="secondary-button h-12 flex-1 rounded-md border text-sm font-bold">
              Change settings
            </button>
            <button type="button" onClick={() => router.push("/")} className="secondary-button h-12 flex-1 rounded-md border text-sm font-bold">
              Return to games
            </button>
          </div>
        </div>
      </section>
    </GameLayout>
  );
}

function SummaryChip({ label, value }: { label: string; value: string | number }) {
  return <span className="rounded-full bg-[var(--sakura-light)] px-3 py-1.5 text-xs font-bold">{label}: {value}</span>;
}

function ResultBadge({ question }: { question: VocabularyReviewQuestion }) {
  if (question.status === "correct" && question.attempts.length === 1) {
    return <span className="inline-flex items-center gap-1 font-bold text-[var(--correct)]"><Check size={15} /> First try</span>;
  }
  if (question.status === "correct") {
    return <span className="inline-flex items-center gap-1 font-bold text-[var(--correct)]"><Check size={15} /> Correct after retry</span>;
  }
  if (question.status === "skipped") {
    return <span className="inline-flex items-center gap-1 font-bold text-[var(--muted)]"><X size={15} /> Skipped</span>;
  }
  return <span className="font-bold text-[var(--muted)]">Unanswered</span>;
}
