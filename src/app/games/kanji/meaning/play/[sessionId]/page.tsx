"use client";

import { Suspense, useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { loadKanjiData, type KanjiRecord } from "@/data/kanji";
import { GameLayout } from "@/lib/game-core/layout";
import { buildKanjiMeaningResult, createKanjiMeaningState, kanjiMeaningReducer, type KanjiMeaningState, type StoredKanjiMeaningSession } from "@/lib/game/kanji-meaning";
import { getGameResult, getGameSession, saveGameResult } from "@/lib/game-core/storage";
import { QuitSessionDialog, useQuitSessionGuard } from "@/lib/game-core/quit-session";

export default function KanjiMeaningPlayPage() {
  return <Suspense fallback={<main className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">Preparing session...</main>}><KanjiMeaningPlayContent /></Suspense>;
}

function KanjiMeaningPlayContent() {
  const router = useRouter();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [game, setGame] = useState<{ session: StoredKanjiMeaningSession; records: KanjiRecord[]; initial: KanjiMeaningState } | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      const savedResult = getGameResult("kanji", sessionId);
      if (savedResult) {
        router.replace(`/games/kanji/meaning/result/${sessionId}`);
        return;
      }
      const session = getGameSession<StoredKanjiMeaningSession>("kanji", sessionId);
      if (!session || session.sessionId !== sessionId || !Array.isArray(session.questions) || !session.questions.length) {
        router.replace("/games/kanji/meaning");
        return;
      }
      const records = await loadKanjiData();
      if (active) setGame({ session, records, initial: createKanjiMeaningState(session, records) });
    }).catch((error: unknown) => {
      if (!active) return;
      console.error("Could not load kanji meaning session data.", error);
      setLoadError(true);
    });
    return () => { active = false; };
  }, [router, sessionId]);

  if (loadError) return <main className="grid min-h-dvh place-items-center bg-[var(--bg)] px-5 text-center text-[var(--muted)]">This session could not be loaded. Return to <a className="ml-1 underline" href="/games/kanji/meaning">setup</a>.</main>;
  if (!game) return <main className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">Preparing session...</main>;
  return <KanjiMeaningGame key={sessionId} session={game.session} records={game.records} initial={game.initial} />;
}

function KanjiMeaningGame({
  session,
  records,
  initial,
}: {
  session: StoredKanjiMeaningSession;
  records: KanjiRecord[];
  initial: KanjiMeaningState;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(kanjiMeaningReducer, initial);
  const nextButton = useRef<HTMLButtonElement>(null);
  const questionStartedAt = useRef(0);
  const stateRef = useRef(state);
  const timerRef = useRef<{ id: number; index: number } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const { quitDialogOpen, cancelQuit, confirmQuit } = useQuitSessionGuard(true);
  const recordByCharacter = new Map(records.map((record) => [record.c, record]));
  const question = state.questions[state.index];
  const result = state.results[state.index];
  const answered = result?.status !== "unanswered";
  const correctCount = state.results.filter((item) => item.status === "correct").length;
  const progress = ((state.index + (answered ? 1 : 0)) / state.questions.length) * 100;

  useEffect(() => {
    questionStartedAt.current = Date.now();
    if (answered) nextButton.current?.focus();
  }, [answered, state.index]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current.id);
  }, []);

  const finish = useCallback((finalState: KanjiMeaningState, endedEarly = false) => {
    if (timerRef.current) window.clearTimeout(timerRef.current.id);
    timerRef.current = null;
    setLeaving(false);
    const finishedState = endedEarly ? kanjiMeaningReducer(finalState, { type: "END" }) : finalState;
    saveGameResult("kanji", buildKanjiMeaningResult(finishedState), localStorage);
    router.push(`/games/kanji/meaning/result/${session.sessionId}`);
  }, [router, session.sessionId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!question || answered || leaving || !/^[1-4]$/.test(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      dispatch({ type: "ANSWER", optionIndex: Number(event.key) - 1, index: state.index, timeMs: Date.now() - questionStartedAt.current });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answered, leaving, question, state.index]);

  function quitSession() {
    confirmQuit();
    if (timerRef.current) window.clearTimeout(timerRef.current.id);
    timerRef.current = null;
    sessionStorage.removeItem(`kanji-session:${session.sessionId}`);
    router.replace("/games/kanji/meaning");
  }

  function answer(optionIndex: number) {
    if (answered || leaving || !question) return;
    // This timestamp is captured in response to a user event, not during rendering.
    // eslint-disable-next-line react-hooks/purity
    dispatch({ type: "ANSWER", optionIndex, index: state.index, timeMs: Date.now() - questionStartedAt.current });
  }

  function next() {
    if (!answered || leaving) return;
    const targetIndex = state.index;
    setLeaving(true);
    timerRef.current = {
      index: targetIndex,
      id: window.setTimeout(() => {
        const latest = stateRef.current;
        if (latest.index !== targetIndex || timerRef.current?.index !== targetIndex) {
          if (timerRef.current?.index === targetIndex) timerRef.current = null;
          return;
        }
        timerRef.current = null;
        const advanced = kanjiMeaningReducer(latest, { type: "NEXT", index: targetIndex });
        if (advanced.index >= advanced.questions.length) finish(advanced);
        else {
          setLeaving(false);
          dispatch({ type: "NEXT", index: targetIndex });
        }
      }, 360),
    };
  }

  if (!question || !result) return null;
  const kanji = recordByCharacter.get(question.kanji);
  if (!kanji) return <main className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">Kanji data is missing from this session.</main>;

  return (
    <>
    <GameLayout label="KANJI" glyph="漢">
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pb-7 sm:px-8">
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-[var(--line)] pb-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-bold">
              <span>{state.index + 1} / {state.questions.length}</span>
              <span className="text-[var(--muted)]">Score {correctCount}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]" aria-label="Question progress">
              <div className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <button type="button" onClick={() => finish(state, true)} className="secondary-button rounded-md border px-4 py-2 text-sm font-bold">End session</button>
        </div>

        <div className="flex flex-col items-center py-5">
          <div className="kana-card-shell kanji-card-shell" key={question.id}>
            <div className="kana-card-stack" aria-hidden="true">
              {[0, 1, 2].slice(0, Math.min(3, state.questions.length - state.index - 1)).map((layer) => <div key={layer} className="paper-layer" />)}
            </div>
            <div className={`kana-card kanji-card ${result.status === "correct" ? "kana-correct" : result.status === "wrong" ? "kana-wrong" : ""} ${leaving ? "kanji-leave" : ""}`}>
              <div className="absolute left-0 right-0 top-[13%] z-[1] flex justify-center gap-2">
                <span className="rounded-full bg-[var(--sakura-light)] px-3 py-1 text-xs font-bold">N{kanji.jlpt}</span>
                <span className="rounded-full bg-[var(--sakura-light)] px-3 py-1 text-xs font-bold">{kanji.grade === 8 ? "Secondary (8)" : kanji.grade === 9 ? "Names (9)" : `Grade ${kanji.grade}`}</span>
              </div>
              <span className="kanji-card-glyph" aria-label={`Kanji ${kanji.c}`}>{kanji.c}</span>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold text-[var(--muted)]">Choose the meaning</p>
        </div>

        <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
          {question.optionKanji.map((option, index) => {
            const optionIsCorrect = option === question.kanji;
            const chosen = result.chosenKanji === option;
            const statusClass = !answered ? "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--sakura)]" :
              optionIsCorrect ? "border-[var(--correct)] bg-[var(--correct)]/15 text-[var(--ink)]" :
              chosen ? "border-[var(--wrong)] bg-[var(--wrong)]/15 text-[var(--ink)]" :
              "border-[var(--line)] bg-[var(--surface)] opacity-65";
            return (
              <button key={`${option}-${index}`} type="button" disabled={answered || leaving} onClick={() => answer(index)}
                className={`flex min-h-[72px] items-center gap-4 rounded-md border p-4 text-left text-sm font-bold transition-colors disabled:cursor-default ${statusClass}`}>
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-current text-xs">{index + 1}</span>
                <span className="flex-1">{state.labelByKanji[option]}</span>
                {answered && optionIsCorrect && <Check size={18} aria-label="Correct answer" className="text-[var(--correct)]" />}
                {answered && chosen && !optionIsCorrect && <X size={18} aria-label="Your incorrect answer" className="text-[var(--wrong)]" />}
              </button>
            );
          })}
        </div>

        <div className="mx-auto mt-4 w-full max-w-3xl">
          <p className={`min-h-6 text-center text-sm font-bold ${result.status === "correct" ? "text-[var(--correct)]" : result.status === "wrong" ? "text-[var(--wrong)]" : "text-[var(--muted)]"}`} aria-live="polite">
            {result.status === "correct" ? `✓ Correct — ${result.correctLabel}` : result.status === "wrong" ? `✕ Not quite. The meaning is ${result.correctLabel}.` : ""}
          </p>
          {answered && <div className="mt-3 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="text-sm font-bold">Learn this kanji</p>
            <p className="mt-2 text-xs text-[var(--muted)]"><strong className="text-[var(--ink)]">On:</strong> {kanji.on.length ? kanji.on.join("、") : "—"} <span className="mx-1">·</span> <strong className="text-[var(--ink)]">Kun:</strong> {kanji.kun.length ? kanji.kun.join("、") : "—"} <span className="mx-1">·</span> <strong className="text-[var(--ink)]">Strokes:</strong> {kanji.strokes}</p>
            <p className="mt-2 text-xs text-[var(--muted)]"><strong className="text-[var(--ink)]">Meanings:</strong> {kanji.meanings.join(", ")}</p>
          </div>}
          {answered && <button ref={nextButton} type="button" disabled={leaving} onClick={next} className="primary-button mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-md text-sm font-bold disabled:opacity-70">
            {state.index + 1 === state.questions.length ? "Finish" : "Next"} <span aria-hidden="true">→</span>
          </button>}
        </div>
      </section>
    </GameLayout>
    <QuitSessionDialog open={quitDialogOpen} onCancel={cancelQuit} onConfirm={quitSession} />
    </>
  );
}
