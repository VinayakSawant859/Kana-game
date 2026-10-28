"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { GameLayout } from "@/lib/game-core/layout";
import { createKanjiMeaningSession } from "@/lib/game/kanji-meaning";
import { saveGameSession } from "@/lib/game-core/storage";
import { countsByLevel, countsByLevelGrade } from "@/data/kanji";

const levelOptions = [
  { value: 5, label: "N5" },
  { value: 4, label: "N4" },
  { value: 3, label: "N3" },
  { value: 2, label: "N2" },
  { value: 1, label: "N1" },
];
const gradeOptions = [
  { value: 1, label: "Grade 1" },
  { value: 2, label: "Grade 2" },
  { value: 3, label: "Grade 3" },
  { value: 4, label: "Grade 4" },
  { value: 5, label: "Grade 5" },
  { value: 6, label: "Grade 6" },
  { value: 8, label: "Secondary (8)" },
  { value: 9, label: "Names (9)" },
];
type SavedSetup = { levels: number[]; grades: number[]; size: 10 | 20 | 30 };

export default function KanjiMeaningSetupPage() {
  const router = useRouter();
  const [levels, setLevels] = useState<number[]>([5]);
  const [grades, setGrades] = useState<number[]>([]);
  const [size, setSize] = useState<10 | 20 | 30>(10);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [levelCounts, setLevelCounts] = useState<Record<number, number>>({});
  const [hasSavedSetup, setHasSavedSetup] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const initializedGrades = useRef(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let restoredGrades = false;
    try {
      const saved = localStorage.getItem("kanji-meaning-last-setup");
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<SavedSetup>;
        if (Array.isArray(parsed.levels) && parsed.levels.every((value) => levelOptions.some((item) => item.value === value))) setLevels(parsed.levels);
        if (Array.isArray(parsed.grades) && parsed.grades.every((value) => gradeOptions.some((item) => item.value === value))) {
          setGrades(parsed.grades);
          setHasSavedSetup(true);
          initializedGrades.current = true;
          restoredGrades = true;
        }
        if (parsed.size === 10 || parsed.size === 20 || parsed.size === 30) setSize(parsed.size);
      }
      if (!restoredGrades) setHasSavedSetup(false);
    } catch (loadError) {
      console.error("Could not read the saved kanji setup.", loadError);
      setError("Saved setup could not be loaded. You can still choose settings and start.");
      setHasSavedSetup(false);
    }
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    let active = true;
    countsByLevelGrade(levels).then((value) => {
      if (!active) return;
      setCounts(value);
      if (hasSavedSetup === false && !initializedGrades.current) {
        setGrades(gradeOptions.map((item) => item.value).filter((grade) => value[grade] > 0));
        initializedGrades.current = true;
      }
    }).catch((loadError: unknown) => {
      if (!active) return;
      console.error("Could not load kanji counts.", loadError);
      setError("Kanji data could not be loaded. Please refresh and try again.");
    });
    return () => { active = false; };
  }, [levels, hasSavedSetup]);

  useEffect(() => {
    let active = true;
    countsByLevel(grades).then((value) => {
      if (active) setLevelCounts(value);
    }).catch((loadError: unknown) => {
      if (!active) return;
      console.error("Could not load kanji level counts.", loadError);
      setError("Kanji data could not be loaded. Please refresh and try again.");
    });
    return () => { active = false; };
  }, [grades]);

  const poolSize = useMemo(
    () => gradeOptions.reduce((sum, grade) => sum + (grades.includes(grade.value) ? counts[grade.value] ?? 0 : 0), 0),
    [counts, grades]
  );

  function toggleValue(value: number, selected: number[], setSelected: (next: number[]) => void) {
    setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  async function start() {
    if (!poolSize || starting) return;
    setStarting(true);
    setError("");
    try {
      const session = await createKanjiMeaningSession({ levels, grades, size });
      saveGameSession("kanji", session.sessionId, session);
      localStorage.setItem("kanji-meaning-last-setup", JSON.stringify({ levels, grades, size }));
      setStarting(false);
      router.push(`/games/kanji/meaning/play/${session.sessionId}`);
    } catch (startError) {
      console.error("Could not start kanji meaning practice.", startError);
      setError("The session could not be started. Please try again.");
      setStarting(false);
    }
  }

  if (!ready) return <main className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">Preparing setup...</main>;

  return (
    <GameLayout label="KANJI" glyph="漢">
      <section className="mx-auto grid w-full max-w-6xl flex-1 gap-5 px-5 pb-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_18px_50px_rgba(188,0,45,0.055)] sm:p-7">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Meaning mode</p>
          <h1 className="mb-7 text-2xl font-bold sm:text-3xl">Practice setup</h1>
          <div className="space-y-7">
            <fieldset>
              <legend className="mb-3 text-sm font-bold">Level</legend>
              <div className="flex flex-wrap gap-2">
                {levelOptions.map((level) => (
                  <button key={level.value} type="button" aria-pressed={levels.includes(level.value)} onClick={() => toggleValue(level.value, levels, setLevels)}
                    className={`rounded-full border px-4 py-2 text-sm font-bold ${levels.includes(level.value) ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]"}`}>
                    {level.label} <span className="ml-1 text-xs opacity-80">({levelCounts[level.value] ?? 0})</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">Counts update with your selected grades.</p>
            </fieldset>
            <fieldset>
              <div className="mb-3 flex items-center justify-between gap-3">
                <legend className="text-sm font-bold">Grade</legend>
                <div className="flex gap-2 text-xs font-bold">
                  <button type="button" onClick={() => setGrades(gradeOptions.filter((item) => (counts[item.value] ?? 0) > 0).map((item) => item.value))} className="text-[var(--primary-fg)]">Select all</button>
                  <button type="button" onClick={() => setGrades([])} className="text-[var(--muted)]">Clear</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {gradeOptions.map((grade) => {
                  const count = counts[grade.value] ?? 0;
                  const selected = grades.includes(grade.value);
                  return <button key={grade.value} type="button" disabled={!count} aria-pressed={selected} onClick={() => toggleValue(grade.value, grades, setGrades)}
                    className={`rounded-md border px-3 py-3 text-left text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 ${selected ? "border-[var(--primary)] bg-[var(--sakura-light)]" : "border-[var(--line)] bg-[var(--surface)]"}`}>
                    <span className="block">{grade.label}</span><span className="mt-1 block text-xs font-normal text-[var(--muted)]">{count} kanji</span>
                  </button>;
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-sm font-bold">Set size</legend>
              <div className="grid grid-cols-3 gap-2">
                {(poolSize < 10 ? [10] as const : [10, 20, 30] as const).map((option) => (
                  <button key={option} type="button" disabled={poolSize === 0 || option > poolSize} aria-pressed={size === option}
                    onClick={() => setSize(option)}
                    className={`rounded-md border px-3 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 ${size === option ? "border-[var(--primary)] bg-[var(--sakura-light)]" : "border-[var(--line)]"}`}>
                    {poolSize < 10 ? `All ${poolSize}` : option}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </div>
        <aside className="rounded-lg border border-[var(--primary-hover)] bg-[var(--primary)] p-5 text-white sm:p-7 lg:sticky lg:top-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">Your selection</p>
          <div className="my-5 flex items-end justify-between border-b border-white/30 pb-5"><span className="font-japanese text-5xl leading-none">{poolSize}</span><span className="pb-1 text-sm text-white/80">kanji available</span></div>
          <p className="mb-5 text-sm text-white/80">Questions: <strong className="text-white">{Math.min(size, poolSize)}</strong></p>
          {error && <p role="alert" className="mb-3 text-sm font-semibold">{error}</p>}
          <button type="button" disabled={!poolSize || starting} onClick={start} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--surface)] text-sm font-bold text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-45">
            {starting ? "Starting…" : "Start"} <ArrowRight size={17} />
          </button>
        </aside>
      </section>
    </GameLayout>
  );
}
