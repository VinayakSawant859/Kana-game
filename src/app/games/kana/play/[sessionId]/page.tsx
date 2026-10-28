"use client";

import { Suspense, useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { rowMetadata } from "@/data/kana";
import { checkAnswer, computeResult } from "@/lib/game/kana";
import {
  createSessionState,
  finalize,
  sessionReducer,
  type StoredKanaSession,
} from "@/lib/game/session";
import { localStorageAdapter } from "@/lib/storage/kana";
import { GameLayout } from "@/lib/game-core/layout";
import { getGameSession } from "@/lib/game-core/storage";
import { QuitSessionDialog, useQuitSessionGuard } from "@/lib/game-core/quit-session";

export default function KanaPlayPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">
          Preparing session...
        </main>
      }
    >
      <KanaPlayContent />
    </Suspense>
  );
}

function KanaPlayContent() {
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [storedSession, setStoredSession] = useState<StoredKanaSession | null>(null);

  useEffect(() => {
    try {
      const parsed = getGameSession<StoredKanaSession>("kana", sessionId);
      if (!parsed) {
        router.replace("/games/kana");
        return;
      }
      if (!parsed || !Array.isArray(parsed.deckIds) || parsed.deckIds.length === 0) {
        router.replace("/games/kana");
        return;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStoredSession(parsed);
    } catch {
      router.replace("/games/kana");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (!storedSession) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">
        Preparing session...
      </main>
    );
  }

  return <KanaGame key={storedSession.sessionId} session={storedSession} router={router} />;
}

function KanaGame({
  session,
  router,
}: {
  session: StoredKanaSession;
  router: ReturnType<typeof useRouter>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);
  const [state, dispatch] = useReducer(
    sessionReducer,
    undefined,
    () => createSessionState(session.deckIds, Date.now())
  );
  const [answer, setAnswer] = useState("");
  const { quitDialogOpen, cancelQuit, confirmQuit } = useQuitSessionGuard(true);

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  const focusInput = useCallback(() => {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    focusInput();
    return clearTimers;
  }, [clearTimers, focusInput]);

  function finish(endedEarly: boolean, latestState = state) {
    clearTimers();
    const finalCards = finalize(endedEarly ? sessionReducer(latestState, { type: "END" }) : latestState);
    const result = computeResult(
      session.sessionId,
      finalCards,
      latestState.startedAt,
      Date.now(),
      endedEarly
    );
    localStorageAdapter.saveResult(result);
    router.push(`/games/kana/result/${session.sessionId}`);
  }

  function advance(targetIndex: number) {
    dispatch({ type: "ADVANCE", index: targetIndex });
    setAnswer("");
    focusInput();
  }

  function submitAnswer(retry = false) {
    if ((state.phase !== "idle" && !retry) || answer.trim() === "") return;
    const currentIndex = state.index;
    const card = state.cards[currentIndex];
    if (!card) return;

    const isCorrect = checkAnswer(card, answer);
    dispatch({ type: "SUBMIT", answer, index: currentIndex });

    if (!isCorrect) {
      inputRef.current?.select();
      focusInput();
      return;
    }

    const feedbackTimer = window.setTimeout(() => {
      dispatch({ type: "LEAVE", index: currentIndex });
      const exitTimer = window.setTimeout(() => {
        if (currentIndex + 1 >= state.cards.length) {
          const submittedState = sessionReducer(state, { type: "SUBMIT", answer, index: currentIndex });
          finish(false, submittedState);
        } else {
          advance(currentIndex);
        }
      }, 420);
      timers.current.push(exitTimer);
    }, 650);
    timers.current.push(feedbackTimer);
  }

  function skip() {
    if (state.phase !== "idle") return;
    const currentIndex = state.index;
    dispatch({ type: "SKIP", index: currentIndex });
    inputRef.current?.blur();

    const revealTimer = window.setTimeout(() => {
      dispatch({ type: "LEAVE", index: currentIndex });
      const exitTimer = window.setTimeout(() => {
        if (currentIndex + 1 >= state.cards.length) {
          const skippedState = sessionReducer(state, { type: "SKIP", index: currentIndex });
          finish(false, skippedState);
        } else {
          advance(currentIndex);
        }
      }, 420);
      timers.current.push(exitTimer);
    }, 1300);
    timers.current.push(revealTimer);
  }

  function quitSession() {
    confirmQuit();
    clearTimers();
    sessionStorage.removeItem(`kana-session:${session.sessionId}`);
    router.replace("/games/kana");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (event.shiftKey) {
      if (state.phase === "idle") skip();
      return;
    }
    if (state.phase === "wrong") {
      submitAnswer(true);
      return;
    }
    submitAnswer();
  }

  if (!state.cards.length) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">
        Preparing session...
      </main>
    );
  }

  const character = state.cards[state.index];
  if (!character) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">
        Preparing result...
      </main>
    );
  }

  const meta = rowMetadata.find((item) => item.group === character.group && item.row === character.row);
  const rowLabel = meta ? (character.script === "hiragana" ? meta.label.hiragana : meta.label.katakana) : "";
  const wrongCount = character.mistakes;
  const progress = ((state.index + (state.phase === "idle" ? 0 : 1)) / state.cards.length) * 100;
  const done = state.cards.filter((card) => card.status !== "pending").length;

  return (
    <>
    <GameLayout
    label="KANA"
    glyph="あ"
    onPointerDown={(event) => {
      if ((event.target as HTMLElement).tagName !== "BUTTON") focusInput();
    }}
    >

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-6 sm:px-8 sm:pb-8">
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-[var(--line)] pb-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-bold">
              <span>
                {state.index + 1} / {state.cards.length}
              </span>
              <span className="text-[var(--muted)]">{done} done</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-400"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => finish(true)}
            className="secondary-button rounded-md border px-4 py-2 text-sm font-bold"
          >
            End session
          </button>
        </div>

        <div className="relative flex flex-1 items-center justify-center py-3">
          <div className="relative mx-auto flex w-full max-w-[520px] flex-col items-center">
            <div className="kana-card-shell" key={character.id} aria-live="polite">
              <div className="kana-card-stack" aria-hidden="true">
                {[0, 1, 2]
                  .slice(0, Math.min(3, Math.max(state.cards.length - state.index - 1, 0)))
                  .map((layer) => (
                    <div key={layer} className="paper-layer" />
                  ))}
              </div>
              <div
                className={`kana-card ${state.phase === "wrong" ? "kana-wrong" : ""} ${state.phase === "correct" ? "kana-correct" : ""} ${state.phase === "skipped" ? "kana-skipped" : ""} ${state.phase === "leaving" ? "kana-leave" : ""}`}
              >
                <span className="row-label font-japanese">{rowLabel}</span>
                <span className="kana-card-glyph">{character.char}</span>
                <span className="hanko grid">{character.script === "hiragana" ? "平" : "片"}</span>
              </div>
            </div>

            {state.phase === "wrong" && (
              <p
                className="mt-3 flex items-center gap-2 text-center text-sm font-bold text-[var(--wrong)]"
                aria-live="polite"
              >
                <X size={16} />Not quite, try again
              </p>
            )}
            {state.phase === "skipped" && (
              <p className="mt-3 text-center text-sm font-bold text-[var(--muted)]" aria-live="polite">
                Answer: {character.romaji[0]}
              </p>
            )}
            {state.phase === "correct" && (
              <p className="mt-3 text-center text-sm font-bold text-[var(--correct)]">✓ Correct</p>
            )}
            {state.phase === "idle" && <div className="mt-3 h-5" />}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (state.phase === "idle") submitAnswer();
                else if (state.phase === "wrong") submitAnswer(true);
              }}
              className={`answer-field answer-${state.phase} relative mt-1 w-full max-w-[440px]`}
            >
              <input
                ref={inputRef}
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                onKeyDown={handleKeyDown}
                readOnly={state.phase !== "idle" && state.phase !== "wrong"}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="type the sound"
                className="answer-input"
              />
              <button
                type="button"
                onClick={skip}
                disabled={state.phase !== "idle"}
                aria-label="Skip character"
                className="answer-submit"
                style={{ position: "absolute", right: -44 }}
              >
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="mt-2 flex items-center gap-2 text-xs text-[var(--muted)]">
              <span>Enter to check · Shift+Enter to skip</span>
              {wrongCount >= 3 && (
                <button
                  type="button"
                  onClick={skip}
                  disabled={state.phase !== "idle"}
                  className="font-bold text-[var(--primary-fg)]"
                >
                  Skip
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </GameLayout>
    <QuitSessionDialog open={quitDialogOpen} onCancel={cancelQuit} onConfirm={quitSession} />
    </>
  );
}
