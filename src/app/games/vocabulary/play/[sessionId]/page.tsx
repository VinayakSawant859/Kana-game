"use client";

import { Suspense, useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import { Check, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { loadVocabularyData, vocabularyLevels, type VocabularyLevel } from "@/data/vocabulary";
import { GameLayout } from "@/lib/game-core/layout";
import { getGameResult, getGameSession, saveGameResult } from "@/lib/game-core/storage";
import {
  BASE_QUESTION_SCORE,
  buildVocabularyResult,
  createVocabularyState,
  getPotentialScore,
  parseExampleFurigana,
  vocabularyReducer,
  type StoredVocabularySession,
  type VocabularyState,
} from "@/lib/game/vocabulary";
import { QuitSessionDialog, useQuitSessionGuard } from "@/lib/game-core/quit-session";

export default function VocabularyPlayPage() {
  return (
    <Suspense fallback={<main className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">Preparing session...</main>}>
      <VocabularyPlayContent />
    </Suspense>
  );
}

function isStoredSession(value: unknown, sessionId: string): value is StoredVocabularySession {
  if (typeof value !== "object" || value === null) return false;
  const session = value as Partial<StoredVocabularySession>;
  return session.sessionId === sessionId &&
    Array.isArray(session.questionIds) &&
    session.questionIds.length > 0 &&
    session.questionIds.every((id) => typeof id === "string" && id.length > 0) &&
    new Set(session.questionIds).size === session.questionIds.length &&
    typeof session.settings === "object" &&
    session.settings !== null &&
    Array.isArray(session.settings.levels) &&
    session.settings.levels.length > 0 &&
    session.settings.levels.every((level) => vocabularyLevels.includes(level as VocabularyLevel)) &&
    Array.isArray(session.settings.grades) &&
    session.settings.grades.every((grade) => Number.isInteger(grade) && grade > 0) &&
    (session.settings.size === "all" || [10, 20, 30].includes(session.settings.size)) &&
    (session.settings.size === "all" || session.questionIds.length === session.settings.size);
}

function VocabularyPlayContent() {
  const router = useRouter();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [game, setGame] = useState<{ session: StoredVocabularySession; initial: VocabularyState } | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      if (getGameResult("vocabulary", sessionId)) {
        router.replace(`/games/vocabulary/result/${sessionId}`);
        return;
      }
      const session = getGameSession<unknown>("vocabulary", sessionId);
      if (!session || !isStoredSession(session, sessionId)) {
        router.replace("/games/vocabulary");
        return;
      }
      const data = await loadVocabularyData(session.settings.levels);
      if (active) setGame({ session, initial: createVocabularyState(session, data) });
    }).catch((error: unknown) => {
      if (!active) return;
      console.error("Could not load vocabulary session data.", error);
      setLoadError(true);
    });
    return () => { active = false; };
  }, [router, sessionId]);

  if (loadError) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--bg)] px-5 text-center text-[var(--muted)]">
        <p>This session could not be loaded. <a className="underline" href="/games/vocabulary">Return to setup</a>.</p>
      </main>
    );
  }
  if (!game) {
    return <main className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">Preparing session...</main>;
  }
  return <VocabularyGame key={sessionId} session={game.session} initial={game.initial} />;
}

function VocabularyGame({
  session,
  initial,
}: {
  session: StoredVocabularySession;
  initial: VocabularyState;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(vocabularyReducer, initial);
  const [answer, setAnswer] = useState("");
  const [answerError, setAnswerError] = useState("");
  const [selectedKanji, setSelectedKanji] = useState("");
  const answerInput = useRef<HTMLInputElement>(null);
  const { quitDialogOpen, cancelQuit, confirmQuit } = useQuitSessionGuard(true);
  const question = state.questions[state.index];
  const result = state.results[state.index];
  const accumulatedScore = state.results.reduce((sum, item) => sum + item.pointsEarned, 0);
  const availablePoints = result ? getPotentialScore(result) : 0;
  const completed = state.results.filter((item) => item.status !== "unanswered").length;
  const progress = (completed / state.questions.length) * 100;
  const kanjiHints = question?.kanji.filter((kanji) =>
    kanji.meanings.length > 0 && !result?.kanjiHints.includes(kanji.character)
  ) ?? [];
  const selectedHint = kanjiHints.find((kanji) => kanji.character === selectedKanji) ?? kanjiHints[0];
  const questionGrades = question
    ? [...new Set(question.kanji.map((kanji) => kanji.grade).filter((grade): grade is number => grade !== null))]
        .sort((a, b) => a - b)
    : [];
  const resolved = result ? result.status !== "unanswered" : false;

  useEffect(() => {
    answerInput.current?.focus();
  }, [state.index, result?.status]);

  function finish(finalState: VocabularyState, endedEarly = false) {
    const finishedState = endedEarly
      ? vocabularyReducer(finalState, { type: "END" })
      : finalState;
    saveGameResult("vocabulary", buildVocabularyResult(finishedState), localStorage);
    router.push(`/games/vocabulary/result/${session.sessionId}`);
  }

  function submitAnswer() {
    if (!question || !result || resolved) return;
    if (!answer.trim()) {
      setAnswerError("Type an English meaning before checking.");
      return;
    }
    setAnswerError("");
    dispatch({ type: "SUBMIT", answer, index: state.index });
  }

  function clearAnswer() {
    setAnswer("");
    setAnswerError("");
    setSelectedKanji("");
  }

  function next() {
    if (!resolved) return;
    const advanced = vocabularyReducer(state, { type: "NEXT", index: state.index });
    if (advanced.index >= advanced.questions.length) finish(advanced);
    else {
      dispatch({ type: "NEXT", index: state.index });
      clearAnswer();
    }
  }

  function skip() {
    if (!result || resolved) return;
    dispatch({ type: "SKIP", index: state.index });
    setAnswerError("");
  }

  function skipAndAdvance() {
    if (!result || resolved) return;
    const skipped = vocabularyReducer(state, { type: "SKIP", index: state.index });
    const advanced = vocabularyReducer(skipped, { type: "NEXT", index: state.index });
    if (advanced.index >= advanced.questions.length) finish(advanced);
    else {
      dispatch({ type: "SKIP", index: state.index });
      dispatch({ type: "NEXT", index: state.index });
      clearAnswer();
    }
  }

  function handleAnswerKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (resolved) {
      next();
    } else if (result.attempts.length > 0) {
      skipAndAdvance();
    } else {
      submitAnswer();
    }
  }

  function quitSession() {
    confirmQuit();
    sessionStorage.removeItem(`vocabulary-session:${session.sessionId}`);
    router.replace("/games/vocabulary");
  }

  if (!question || !result) return null;

  const expectedMeanings = question.meanings.join("; ");
  const resultMessage = result.status === "correct"
    ? `Correct — ${expectedMeanings}`
    : result.status === "skipped"
      ? `Skipped. Expected meaning: ${expectedMeanings}`
      : result.attempts.length
        ? `Not quite. Expected meaning: ${expectedMeanings}. Try again or skip.`
        : "";
  const answerStatusClass = result.status === "correct"
    ? "text-[var(--correct)]"
    : result.status === "skipped" || result.attempts.length
      ? "text-[var(--wrong)]"
      : "text-[var(--muted)]";

  return (
    <>
    <GameLayout label="VOCABULARY" glyph="語">
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-7 sm:px-8">
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-[var(--line)] pb-4">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold">
              <span>Question {state.index + 1} / {state.questions.length}</span>
              <span className="text-[var(--muted)]">Score {accumulatedScore} pts</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]"
              role="progressbar"
              aria-label="Question progress"
              aria-valuenow={completed}
              aria-valuemin={0}
              aria-valuemax={state.questions.length}
            >
              <div className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-right text-xs text-[var(--muted)]">{completed} completed</p>
          </div>
          <button type="button" onClick={() => finish(state, true)} className="secondary-button rounded-md border px-4 py-2 text-sm font-bold">
            End session
          </button>
        </div>

        <div className="grid flex-1 gap-5 py-5 lg:grid-cols-2 lg:items-start">
        <section aria-label="Vocabulary flashcard" className="flex flex-col items-center py-2 lg:sticky lg:top-6">
          <div className="kana-card-shell kanji-card-shell" key={question.id}>
            <div className="kana-card-stack" aria-hidden="true">
              {[0, 1, 2].slice(0, Math.min(3, state.questions.length - state.index - 1))
                .map((layer) => <div key={layer} className="paper-layer" />)}
            </div>
            <div className={`kana-card kanji-card ${result.status === "correct" ? "kana-correct" : result.status === "skipped" ? "kana-skipped" : result.attempts.length ? "kana-wrong" : ""}`}>
              <div className="absolute left-0 right-0 top-[10%] z-[1] flex flex-wrap justify-center gap-2 px-4">
                <span className="rounded-full bg-[var(--sakura-light)] px-3 py-1 text-xs font-bold">{question.level}</span>
                {questionGrades.map((grade) => (
                  <span key={grade} className="rounded-full bg-[var(--sakura-light)] px-3 py-1 text-xs font-bold">
                    {grade === 8 ? "Secondary (8)" : grade === 9 ? "Names (9)" : `Grade ${grade}`}
                  </span>
                ))}
              </div>
              <span className="font-japanese break-keep px-5 text-center text-[clamp(3rem,12vw,5.75rem)] font-bold leading-tight" aria-label={`Japanese word ${question.word}`}>
                {question.word}
              </span>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold text-[var(--muted)]">Type the English meaning</p>
          {question.kanji.length === 0 && <p className="mt-1 text-xs text-[var(--muted)]">No kanji metadata for this word.</p>}
        </section>

        <section aria-label="Answer and hints" className="mx-auto w-full max-w-2xl lg:pt-2">
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={resolved || result.furiganaHintUsed}
              onClick={() => dispatch({ type: "HINT_FURIGANA", index: state.index })}
              className="secondary-button min-h-11 rounded-md border px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45"
            >
              {result.furiganaHintUsed ? `Reading: ${question.reading}` : "Reveal Furigana (-20)"}
            </button>
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="kanji-hint-select">Choose a kanji meaning hint</label>
              <select
                id="kanji-hint-select"
                value={selectedHint?.character ?? ""}
                disabled={resolved || kanjiHints.length === 0}
                onChange={(event) => setSelectedKanji(event.target.value)}
                className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] disabled:opacity-50"
              >
                {kanjiHints.length === 0
                  ? <option value="">No unrevealed kanji meanings</option>
                  : kanjiHints.map((kanji) => <option key={kanji.character} value={kanji.character}>{kanji.character}</option>)}
              </select>
              <button
                type="button"
                disabled={resolved || !selectedHint}
                onClick={() => selectedHint && dispatch({ type: "HINT_KANJI", character: selectedHint.character, index: state.index })}
                className="secondary-button rounded-md border px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45"
              >
                Reveal kanji (-15)
              </button>
            </div>
          </div>

          {result.furiganaHintUsed && (
            <p className="mb-3 rounded-md border border-[var(--line)] bg-[var(--surface)] p-3 text-sm">
              <strong>Reading:</strong> <span className="font-japanese">{question.reading}</span>
            </p>
          )}
          {result.kanjiHints.length > 0 && (
            <div className="mb-3 rounded-md border border-[var(--line)] bg-[var(--surface)] p-3">
              <p className="text-sm font-bold">Individual kanji meanings — not the compound word meaning</p>
              <ul className="mt-2 space-y-1 text-sm">
                {result.kanjiHints.map((character) => {
                  const kanji = question.kanji.find((item) => item.character === character);
                  return kanji ? (
                    <li key={character}>
                      <span className="font-japanese text-lg">{character}</span>
                      <span className="text-[var(--muted)]"> — {kanji.meanings.join(", ")}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          )}

          <form
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              if (resolved) next();
              else if (result.attempts.length > 0) skipAndAdvance();
              else submitAnswer();
            }}
            className="space-y-3"
          >
            <label className="sr-only" htmlFor="vocabulary-answer">English meaning</label>
            <input
              ref={answerInput}
              id="vocabulary-answer"
              type="text"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={handleAnswerKeyDown}
              placeholder="English meaning"
              autoComplete="off"
              readOnly={resolved}
              className="answer-field w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-center text-lg text-[var(--ink)] outline-none focus:border-[var(--primary)] read-only:opacity-65"
            />
            {answerError && <p role="alert" className="text-center text-sm font-semibold text-[var(--wrong)]">{answerError}</p>}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type={result.attempts.length > 0 && !resolved ? "button" : "submit"}
                onClick={result.attempts.length > 0 && !resolved ? submitAnswer : undefined}
                disabled={resolved}
                className="primary-button flex h-12 flex-1 items-center justify-center gap-2 rounded-md text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Check size={17} /> {result.attempts.length > 0 && !resolved ? "Check again" : "Check meaning"}
              </button>
              {!resolved && (
                <button type="button" onClick={skip} className="secondary-button flex h-12 flex-1 items-center justify-center gap-2 rounded-md border text-sm font-bold">
                  <X size={17} /> Skip
                </button>
              )}
              {resolved && (
                <button type="button" onClick={next} className="primary-button flex h-12 flex-1 items-center justify-center gap-2 rounded-md text-sm font-bold">
                  {state.index + 1 === state.questions.length ? "Finish" : "Next"} <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          </form>

          <div className="mt-3 flex items-center justify-between rounded-md bg-[var(--sakura-light)] px-4 py-3 text-sm">
            <span>Available points: <strong>{availablePoints}</strong> / {BASE_QUESTION_SCORE}</span>
            {resolved && <span className="font-bold text-[var(--correct)]">Awarded: {result.pointsEarned}</span>}
          </div>
          <p className={`mt-3 min-h-6 text-center text-sm font-bold ${answerStatusClass}`} aria-live="polite">
            {resultMessage}
          </p>

          <p className="mt-1 text-center text-xs text-[var(--muted)]">
            Enter checks your answer; after a mistake, Enter skips to the next word.
          </p>

          {result.attempts.length > 0 && result.status === "unanswered" && (
            <p className="mb-2 text-center text-xs font-semibold text-[var(--wrong)]" aria-live="polite">
              Mistakes: {result.attempts.length} · Press Enter to skip, or Check again to retry.
            </p>
          )}

          {resolved && (
            <section className="mt-3 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
              <h2 className="text-sm font-bold">Learn this word</h2>
              <p className="mt-2 text-sm"><strong>Reading:</strong> <span className="font-japanese">{question.reading}</span></p>
              <p className="mt-1 text-sm"><strong>English meaning:</strong> {expectedMeanings}</p>
              {question.examples[0] && (
                <div className="mt-3 border-t border-[var(--line)] pt-3">
                  <p className="font-japanese text-lg leading-relaxed">
                    {parseExampleFurigana(question.examples[0].furigana ?? question.examples[0].ja).map((part, index) =>
                      part.reading
                        ? <ruby key={`${index}-${part.text}`}>{part.text}<rp>(</rp><rt>{part.reading}</rt><rp>)</rp></ruby>
                        : <span key={`${index}-${part.text}`}>{part.text}</span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{question.examples[0].en}</p>
                </div>
              )}
            </section>
          )}
        </section>
        </div>
      </section>
    </GameLayout>
    <QuitSessionDialog open={quitDialogOpen} onCancel={cancelQuit} onConfirm={quitSession} />
    </>
  );
}
