"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RotateCcw } from "lucide-react";
import { GameLayout } from "@/lib/game-core/layout";
import { saveGameSession } from "@/lib/game-core/storage";
import { availableVocabularyGrades, filterVocabulary, loadVocabularyData, type VocabularyData, type VocabularyLevel, vocabularyLevels } from "@/data/vocabulary";
import { createVocabularySession, type VocabularySessionSize } from "@/lib/game/vocabulary";

const gradeNames: Record<number, string> = {
  8: "Secondary (8)",
  9: "Names (9)",
};

interface SavedSetup {
  levels: VocabularyLevel[];
  grades: number[];
  size: VocabularySessionSize;
}

function isVocabularyLevel(value: unknown): value is VocabularyLevel {
  return vocabularyLevels.includes(value as VocabularyLevel);
}

function isSessionSize(value: unknown): value is VocabularySessionSize {
  return value === "all" || value === 10 || value === 20 || value === 30;
}

export default function VocabularySetupPage() {
  const router = useRouter();
  const [levels, setLevels] = useState<VocabularyLevel[]>(["N5"]);
  const [grades, setGrades] = useState<number[]>([]);
  const [size, setSize] = useState<VocabularySessionSize>(10);
  const [data, setData] = useState<VocabularyData | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("vocabulary-last-setup") || "null") as
        Partial<SavedSetup> | null;
      if (saved) {
        if (Array.isArray(saved.levels) && saved.levels.every(isVocabularyLevel)) setLevels(saved.levels);
        if (Array.isArray(saved.grades) && saved.grades.every((grade) => typeof grade === "number")) setGrades(saved.grades);
        if (isSessionSize(saved.size)) setSize(saved.size);
      }
    } catch (loadError) {
      console.error("Could not read the saved vocabulary setup.", loadError);
      setError("Saved settings could not be loaded. Choose settings and continue.");
    }
    setReady(true);
    function onPageShow() {
      setStarting(false);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    let active = true;
    if (!levels.length) {
      setData(null);
      setLoading(false);
      setError("");
      return () => { active = false; };
    }

    setLoading(true);
    setData(null);
    setError("");
    loadVocabularyData(levels).then((loaded) => {
      if (active) setData(loaded);
    }).catch((loadError: unknown) => {
      if (!active) return;
      console.error("Could not load OpenJLPT vocabulary data.", loadError);
      setError("Vocabulary data could not be loaded. Check your connection and try again.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [levels, reloadKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const eligible = useMemo(() => data
    ? filterVocabulary(data.records, { levels, grades }, data.kanjiByCharacter)
    : [], [data, grades, levels]);
  const gradeOptions = useMemo(() => data
    ? availableVocabularyGrades(data.kanjiByCharacter)
    : [], [data]);
  const gradeCounts = useMemo(() => {
    if (!data) return new Map<number, number>();
    return new Map(gradeOptions.map((grade) => [
      grade,
      filterVocabulary(data.records, { levels, grades: [grade] }, data.kanjiByCharacter).length,
    ]));
  }, [data, gradeOptions, levels]);

  const questionCount = size === "all" ? eligible.length : size;
  const canStart = Boolean(
    ready &&
    !loading &&
    levels.length &&
    eligible.length >= questionCount &&
    questionCount > 0 &&
    !starting
  );

  function toggleLevel(level: VocabularyLevel) {
    setLevels((current) =>
      current.includes(level)
        ? current.filter((item) => item !== level)
        : vocabularyLevels.filter((item) => current.includes(item) || item === level)
    );
  }

  function toggleGrade(grade: number) {
    setGrades((current) =>
      current.includes(grade)
        ? current.filter((item) => item !== grade)
        : [...current, grade].sort((a, b) => a - b)
    );
  }

  async function start() {
    if (!canStart || !data) return;
    setStarting(true);
    setError("");
    try {
      const session = createVocabularySession({ levels, grades, size }, data);
      saveGameSession("vocabulary", session.sessionId, session);
      localStorage.setItem("vocabulary-last-setup", JSON.stringify({ levels, grades, size }));
      setStarting(false);
      router.push(`/games/vocabulary/play/${session.sessionId}`);
    } catch (startError) {
      console.error("Could not start vocabulary practice.", startError);
      setError("A session could not be started with these settings.");
      setStarting(false);
    }
  }

  if (!ready) {
    return <main className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">Preparing setup...</main>;
  }

  return (
    <GameLayout label="VOCABULARY" glyph="語">
      <section className="mx-auto grid w-full max-w-6xl flex-1 gap-5 px-5 pb-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_18px_50px_rgba(188,0,45,0.055)] sm:p-7">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Meaning mode</p>
              <h1 className="text-2xl font-bold sm:text-3xl">Vocabulary setup</h1>
            </div>
            <button
              type="button"
              onClick={() => { setLevels(["N5"]); setGrades([]); setSize(10); }}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--sakura-light)] hover:text-[var(--primary-fg)]"
            >
              <RotateCcw size={15} /> Reset
            </button>
          </div>

          <div className="space-y-7">
            <fieldset>
              <legend className="mb-3 text-sm font-bold">JLPT levels</legend>
              <div className="flex flex-wrap gap-2">
                {vocabularyLevels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={levels.includes(level)}
                    onClick={() => toggleLevel(level)}
                    className={`rounded-full border px-4 py-2 text-sm font-bold ${levels.includes(level)
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]"}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </fieldset>

            {gradeOptions.length > 0 && (
              <fieldset>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <legend className="text-sm font-bold">Kanji school grades</legend>
                  <div className="flex gap-2 text-xs font-bold">
                    <button type="button" onClick={() => setGrades(gradeOptions)} className="text-[var(--primary-fg)]">Select all</button>
                    <button type="button" onClick={() => setGrades([])} className="text-[var(--muted)]">Clear</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {gradeOptions.map((grade) => {
                    const count = gradeCounts.get(grade) ?? 0;
                    const selected = grades.includes(grade);
                    return (
                      <button
                        key={grade}
                        type="button"
                        disabled={!count}
                        aria-pressed={selected}
                        onClick={() => toggleGrade(grade)}
                        className={`rounded-md border px-3 py-3 text-left text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 ${selected
                          ? "border-[var(--primary)] bg-[var(--sakura-light)]"
                          : "border-[var(--line)] bg-[var(--surface)]"}`}
                      >
                        <span className="block">{gradeNames[grade] ?? `Grade ${grade}`}</span>
                        <span className="mt-1 block text-xs font-normal text-[var(--muted)]">{count} words</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  A word matches when at least one kanji in it belongs to a selected grade.
                </p>
              </fieldset>
            )}

            <fieldset>
              <legend className="mb-3 text-sm font-bold">Session length</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([10, 20, 30, "all"] as const).map((option) => {
                  const disabled = option === "all" ? eligible.length === 0 : eligible.length < option;
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={disabled}
                      aria-pressed={size === option}
                      onClick={() => setSize(option)}
                      className={`rounded-md border px-3 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 ${size === option
                        ? "border-[var(--primary)] bg-[var(--sakura-light)]"
                        : "border-[var(--line)] bg-[var(--surface)]"}`}
                    >
                      {option === "all" ? "All available" : option}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
        </div>

        <aside className="rounded-lg border border-[var(--primary-hover)] bg-[var(--primary)] p-5 text-white sm:p-7 lg:sticky lg:top-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">Your selection</p>
          <div className="my-5 flex items-end justify-between border-b border-white/30 pb-5">
            <span className="font-japanese text-5xl leading-none">{loading ? "…" : eligible.length}</span>
            <span className="pb-1 text-sm text-white/80">eligible words</span>
          </div>
          <p className="mb-5 text-sm text-white/80">
            Questions: <strong className="text-white">{loading ? "…" : questionCount}</strong>
          </p>
          {!levels.length && <p className="mb-3 text-sm">Select at least one JLPT level.</p>}
          {levels.length > 0 && !loading && eligible.length < questionCount && (
            <p className="mb-3 text-sm">Choose a smaller session length or widen your selection.</p>
          )}
          {loading && <p role="status" className="mb-3 text-sm">Loading vocabulary…</p>}
          {error && <p role="alert" className="mb-3 text-sm font-semibold">{error}</p>}
          {error.includes("Vocabulary data could not be loaded") && (
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mb-3 text-sm font-bold underline">
              Retry loading
            </button>
          )}
          <button
            type="button"
            disabled={!canStart}
            onClick={start}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--surface)] text-sm font-bold text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {starting ? "Starting…" : "Start"} <ArrowRight size={17} />
          </button>
        </aside>
      </section>
    </GameLayout>
  );
}
