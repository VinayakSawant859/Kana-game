"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlignJustify,
  ArrowLeft,
  BookmarkCheck,
  BookmarkPlus,
  CheckCircle2,
  Clock,
  Columns3,
  Pause,
  RotateCcw,
  Volume2,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  COMPLETED_STORIES_STORAGE_KEY,
  estimateReadingTimeMinutes,
  getCompletedStoryIds,
  getStoryBySlug,
  lookupWordMetadata,
  type StoryToken,
} from "@/data/stories";
import { StoryCover } from "@/components/story-cover";
import { addVocabularyToSrs } from "@/lib/srs/service";

export default function StoryReadingRoomPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">
          Loading story...
        </main>
      }
    >
      <StoryReadingRoomContent />
    </Suspense>
  );
}

interface SelectedTokenInfo {
  surface: string;
  baseForm: string;
  reading: string;
  meaning: string;
  level?: string;
}

function isPunctuationOnly(surface: string): boolean {
  return /^[\s、。！？「」『』（）・…―,."'!?\-:;]+$/.test(surface);
}

function StoryReadingRoomContent() {
  const params = useParams<{ level: string; slug: string }>();
  const levelParam = params?.level ?? "N5";
  const slugParam = params?.slug ?? "";

  const story = useMemo(
    () => getStoryBySlug(levelParam, slugParam),
    [levelParam, slugParam]
  );

  const [writingMode, setWritingMode] = useState<"horizontal" | "vertical">("horizontal");
  const [showFurigana, setShowFurigana] = useState(true);
  const [showEnglish, setShowEnglish] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ isPaused, setIsPaused] = useState(false);

  const [selectedToken, setSelectedToken] = useState<SelectedTokenInfo | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [savingSrs, setSavingSrs] = useState(false);

  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!story) return;
    const completed = getCompletedStoryIds();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsCompleted(completed.has(story.id) || completed.has(story.slug));
  }, [story]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!story) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bg)] px-6 text-center text-[var(--ink)]">
        <div className="max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 shadow-[var(--card-shadow)]">
          <p className="text-xs font-semibold tracking-[0.2em] text-[var(--primary)] uppercase">
            Story Not Found
          </p>
          <h1 className="mt-2 text-2xl font-semibold">We could not find that story</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            The requested reading passage ({levelParam}/{slugParam}) does not exist.
          </p>
          <Link
            href="/stories"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[var(--primary)] px-6 text-sm font-semibold text-[var(--primary-ink)]"
          >
            <ArrowLeft className="size-4" />
            Back to Stories
          </Link>
        </div>
      </main>
    );
  }

  const readMinutes = estimateReadingTimeMinutes(story);
  const totalQuizQuestions = story.quiz.length;
  const answeredQuizCount = Object.keys(quizAnswers).length;
  const correctQuizCount = story.quiz.reduce((acc, q, idx) => {
    return acc + (quizAnswers[idx] === q.answerIndex ? 1 : 0);
  }, 0);

  function handleSelectToken(token: StoryToken) {
    const surface = token.surface.trim();
    if (!surface || isPunctuationOnly(surface)) return;

    const fallback = lookupWordMetadata(surface);
    const reading = token.reading ?? fallback?.reading ?? surface;
    const meaning =
      token.meaning ??
      fallback?.meaning ??
      "Japanese particle or grammatical expression in context.";
    const baseForm = token.baseForm ?? fallback?.baseForm ?? surface;
    const level = token.level ?? fallback?.level ?? story?.level;

    setSelectedToken({
      surface,
      baseForm,
      reading,
      meaning,
      level,
    });
  }

  async function handleAddToFrs() {
    if (!selectedToken || savingSrs) return;
    setSavingSrs(true);
    try {
      const targetWord = selectedToken.baseForm || selectedToken.surface;
      await addVocabularyToSrs({
        word: targetWord,
        reading: selectedToken.reading,
        meaning: selectedToken.meaning,
        level: selectedToken.level ?? story?.level,
      });
      setSavedWords((prev) => {
        const next = new Set(prev);
        next.add(targetWord);
        next.add(selectedToken.surface);
        return next;
      });
    } finally {
      setSavingSrs(false);
    }
  }

  function handleToggleSpeech() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;

    if (isSpeaking && !isPaused) {
      synth.pause();
      setIsPaused(true);
      return;
    }

    if (isSpeaking && isPaused) {
      synth.resume();
      setIsPaused(false);
      return;
    }

    synth.cancel();
    const fullText = [
      story?.title ?? "",
      ...(story?.paragraphs.map((p) => p.ja) ?? []),
    ].join("。");

    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = "ja-JP";
    utterance.rate = 0.92;

    const voices = synth.getVoices?.() ?? [];
    const jaVoice = voices.find((v) => v.lang?.toLowerCase().startsWith("ja"));
    if (jaVoice) {
      utterance.voice = jaVoice;
    }

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    setIsSpeaking(true);
    setIsPaused(false);
    synth.speak(utterance);
  }

  function handleStopSpeech() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }

  function handleAnswerQuiz(questionIndex: number, optionIndex: number) {
    if (quizAnswers[questionIndex] !== undefined) return;
    const next = { ...quizAnswers, [questionIndex]: optionIndex };
    setQuizAnswers(next);

    if (story && Object.keys(next).length === story.quiz.length) {
      try {
        const completed = getCompletedStoryIds();
        completed.add(story.id);
        completed.add(story.slug);
        window.localStorage.setItem(
          COMPLETED_STORIES_STORAGE_KEY,
          JSON.stringify([...completed])
        );
        setIsCompleted(true);
      } catch {
        // Ignore storage write errors
      }
    }
  }

  function handleResetQuiz() {
    setQuizAnswers({});
  }

  const isSelectedTokenSaved =
    selectedToken !== null &&
    (savedWords.has(selectedToken.baseForm) || savedWords.has(selectedToken.surface));

  return (
    <main className="flex min-h-dvh flex-col bg-[var(--bg)] text-[var(--ink)]">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bg)]/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/stories"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              <ArrowLeft className="size-3.5" />
              Back to Stories
            </Link>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-[11px] font-bold text-[var(--primary-ink)]">
                  {story.level}
                </span>
                <span
                  lang="ja"
                  className="font-japanese text-sm font-semibold text-[var(--ink)]"
                >
                  {story.title}
                </span>
                <span className="text-xs text-[var(--muted)]">· {story.titleEn}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Web Speech Audio Sync */}
            <button
              type="button"
              onClick={handleToggleSpeech}
              aria-label={isSpeaking && !isPaused ? "Pause audio" : "Listen to story"}
              className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition ${
                isSpeaking
                  ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-ink)]"
                  : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--primary)]"
              }`}
            >
              {isSpeaking && !isPaused ? (
                <>
                  <Pause className="size-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Volume2 className="size-3.5 text-[var(--primary)]" />
                  <span>{isPaused ? "Resume" : "Listen"}</span>
                </>
              )}
            </button>
            {isSpeaking && (
              <button
                type="button"
                onClick={handleStopSpeech}
                className="inline-flex h-10 items-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)]"
              >
                Stop
              </button>
            )}

            {/* Furigana toggle */}
            <button
              type="button"
              aria-pressed={showFurigana}
              onClick={() => setShowFurigana((v) => !v)}
              className={`inline-flex h-10 items-center rounded-full border px-3.5 text-xs font-semibold transition ${
                showFurigana
                  ? "border-[var(--primary)]/50 bg-[var(--paper-tint)] text-[var(--primary)]"
                  : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]"
              }`}
            >
              Furigana {showFurigana ? "On" : "Off"}
            </button>

            {/* Reading Mode Toggle (Horizontal vs. Vertical) */}
            <button
              type="button"
              aria-label="Toggle reading direction"
              aria-pressed={writingMode === "vertical"}
              onClick={() =>
                setWritingMode((mode) => (mode === "horizontal" ? "vertical" : "horizontal"))
              }
              className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition ${
                writingMode === "vertical"
                  ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-ink)]"
                  : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--primary)]"
              }`}
            >
              {writingMode === "vertical" ? (
                <>
                  <Columns3 className="size-3.5" />
                  <span>Vertical (縦書き)</span>
                </>
              ) : (
                <>
                  <AlignJustify className="size-3.5" />
                  <span>Horizontal (横書き)</span>
                </>
              )}
            </button>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-8">
        {/* Story Title Banner */}
        <section className="flex flex-col justify-between gap-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--card-shadow)] md:flex-row md:items-center md:p-8">
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--primary)] px-3 py-0.5 text-xs font-bold text-[var(--primary-ink)]">
                  {story.level}
                </span>
                <span className="rounded-full border border-[var(--line)] bg-[var(--paper-tint)] px-3 py-0.5 text-xs font-semibold text-[var(--muted)]">
                  {story.category}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                  <Clock className="size-3.5" />
                  {readMinutes} min read
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isCompleted && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success)]/35 bg-[var(--success-soft)] px-3 py-1 text-xs font-semibold text-[var(--success)]">
                    <CheckCircle2 className="size-3.5" />
                    Completed
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowEnglish((v) => !v)}
                  className="rounded-full border border-[var(--line)] bg-[var(--paper-tint)] px-3.5 py-1 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--primary)]"
                >
                  {showEnglish ? "Hide English" : "Show English"}
                </button>
              </div>
            </div>

            <h1
              lang="ja"
              className="font-japanese mt-4 text-3xl font-semibold tracking-tight text-[var(--ink)] md:text-4xl"
            >
              {story.title}
            </h1>
            <p className="mt-1 text-sm font-medium text-[var(--muted)]">{story.titleRomaji}</p>
            <p className="mt-1 text-base font-medium text-[var(--ink)]">{story.titleEn}</p>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Tip: Tap any word in the passage to inspect its reading, definition, and save it to your{" "}
              <Link href="/review" className="font-semibold text-[var(--primary)] underline">
                FSRS Review Hub
              </Link>
              .
            </p>
          </div>

          <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--paper-tint)] md:h-44 md:w-64">
            <StoryCover
              key={story.slug}
              src={story.coverImage}
              placeholder={story.coverPlaceholder}
              alt={`${story.title} illustration`}
              imageClassName="object-contain p-3"
              loading="eager"
            />
          </div>
        </section>

        {/* Reading Room Paper Sheet & Tap-to-SRS Inspector */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <article
            aria-label="Story text"
            style={{
              writingMode: writingMode === "vertical" ? "vertical-rl" : "horizontal-tb",
            }}
            className={`rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--card-shadow)] md:p-10 ${
              writingMode === "vertical"
                ? "max-h-[72dvh] w-full overflow-x-auto leading-[2.4]"
                : "space-y-7 leading-[2.25]"
            }`}
          >
            {story.paragraphs.map((paragraph, pIdx) => {
              const tokens = paragraph.tokens ?? [{ surface: paragraph.ja }];
              return (
                <div
                  key={pIdx}
                  className={
                    writingMode === "vertical"
                      ? "ml-8 border-l border-[var(--line)]/60 pl-6 first:ml-0"
                      : "border-b border-[var(--line)]/60 pb-6 last:border-b-0 last:pb-0"
                  }
                >
                  <p
                    lang="ja"
                    className="font-japanese text-xl tracking-wide text-[var(--ink)] select-text md:text-2xl"
                  >
                    {tokens.map((token, tIdx) => {
                      const clickable = !isPunctuationOnly(token.surface);
                      const isSelected = selectedToken?.surface === token.surface;
                      const content =
                        showFurigana && token.reading ? (
                          <ruby className="ruby-token">
                            {token.surface}
                            <rt className="text-[0.55em] font-normal tracking-normal text-[var(--muted)]">
                              {token.reading}
                            </rt>
                          </ruby>
                        ) : (
                          token.surface
                        );

                      if (!clickable) {
                        return <span key={tIdx}>{content}</span>;
                      }

                      return (
                        <button
                          key={tIdx}
                          type="button"
                          onClick={() => handleSelectToken(token)}
                          className={`inline rounded px-0.5 text-left font-inherit transition ${
                            isSelected
                              ? "bg-[var(--primary)]/20 text-[var(--primary)] underline decoration-[var(--primary)] decoration-2 underline-offset-4"
                              : "hover:bg-[var(--paper-tint)] hover:text-[var(--primary)]"
                          }`}
                        >
                          {content}
                        </button>
                      );
                    })}
                  </p>

                  {showEnglish && writingMode === "horizontal" && (
                    <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                      {paragraph.en}
                    </p>
                  )}
                </div>
              );
            })}
          </article>

          {/* Vocabulary Inspector / Tap-to-SRS Sidebar / Sheet */}
          <aside
            aria-label="Vocabulary Inspector"
            className="flex flex-col justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--card-shadow)] lg:sticky lg:top-24 lg:h-fit"
          >
            {selectedToken ? (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-semibold tracking-[0.18em] text-[var(--primary)] uppercase">
                      Vocabulary Inspector
                    </span>
                    <div className="mt-2 flex items-baseline gap-2.5">
                      <h2
                        lang="ja"
                        className="font-japanese text-3xl font-bold text-[var(--ink)]"
                      >
                        {selectedToken.surface}
                      </h2>
                      {selectedToken.level && (
                        <span className="rounded-full bg-[var(--paper-tint)] px-2.5 py-0.5 text-xs font-bold text-[var(--primary)]">
                          {selectedToken.level}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close inspector"
                    onClick={() => setSelectedToken(null)}
                    className="rounded-full p-1 text-[var(--muted)] hover:bg-[var(--paper-tint)] hover:text-[var(--ink)]"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-3 border-t border-[var(--line)] pt-4">
                  <div>
                    <p className="text-xs font-semibold text-[var(--muted)] uppercase">Reading</p>
                    <p lang="ja" className="font-japanese mt-0.5 text-lg font-medium text-[var(--ink)]">
                      {selectedToken.reading}
                    </p>
                  </div>

                  {selectedToken.baseForm && selectedToken.baseForm !== selectedToken.surface && (
                    <div>
                      <p className="text-xs font-semibold text-[var(--muted)] uppercase">
                        Dictionary Form
                      </p>
                      <p lang="ja" className="font-japanese mt-0.5 text-base text-[var(--ink)]">
                        {selectedToken.baseForm}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-[var(--muted)] uppercase">
                      Definition
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-[var(--ink)]">
                      {selectedToken.meaning}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    disabled={savingSrs || isSelectedTokenSaved}
                    onClick={() => void handleAddToFrs()}
                    className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-xs font-semibold transition ${
                      isSelectedTokenSaved
                        ? "border border-[var(--success)]/40 bg-[var(--success-soft)] text-[var(--success)]"
                        : "bg-[var(--primary)] text-[var(--primary-ink)] hover:opacity-95"
                    }`}
                  >
                    {isSelectedTokenSaved ? (
                      <>
                        <BookmarkCheck className="size-4" />
                        <span>Added to FSRS Review</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="size-4" />
                        <span>{savingSrs ? "Saving..." : "Add to FSRS Review"}</span>
                      </>
                    )}
                  </button>
                  {isSelectedTokenSaved && (
                    <p className="mt-2 text-center text-xs text-[var(--muted)]">
                      Ready to practice in{" "}
                      <Link href="/review" className="font-semibold text-[var(--primary)] underline">
                        /review
                      </Link>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-xs font-semibold tracking-[0.18em] text-[var(--primary)] uppercase">
                  Tap-to-SRS Lookup
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--ink)]">
                  Click any word in the story
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                  Inspect readings and English meanings, and add unfamiliar words directly to your
                  FSRS spaced-repetition deck with one tap.
                </p>
              </div>
            )}
          </aside>
        </div>

        {/* Comprehension Micro-Quiz */}
        {story.quiz.length > 0 && (
          <section
            aria-label="Comprehension Check"
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--card-shadow)] md:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-[var(--primary)] uppercase">
                  Comprehension Check
                </p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">
                  Story Quiz ({answeredQuizCount}/{totalQuizQuestions})
                </h2>
              </div>

              {answeredQuizCount > 0 && (
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-[var(--line)] bg-[var(--paper-tint)] px-4 py-1.5 text-xs font-semibold text-[var(--ink)]">
                    Score: {correctQuizCount} / {totalQuizQuestions}
                  </span>
                  <button
                    type="button"
                    onClick={handleResetQuiz}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
                  >
                    <RotateCcw className="size-3.5" />
                    Retry Quiz
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-6">
              {story.quiz.map((q, qIdx) => {
                const chosenIndex = quizAnswers[qIdx];
                const isAnswered = chosenIndex !== undefined;
                return (
                  <div
                    key={qIdx}
                    className="rounded-xl border border-[var(--line)] bg-[var(--paper-tint)]/50 p-5"
                  >
                    <p
                      lang="ja"
                      className="font-japanese text-base font-semibold text-[var(--ink)]"
                    >
                      {qIdx + 1}. {q.question}
                    </p>
                    <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {q.options.map((option, oIdx) => {
                        const isSelected = chosenIndex === oIdx;
                        const isCorrect = q.answerIndex === oIdx;
                        let buttonStyle =
                          "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--primary)]";
                        if (isAnswered) {
                          if (isCorrect) {
                            buttonStyle =
                              "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)] font-semibold";
                          } else if (isSelected) {
                            buttonStyle =
                              "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]";
                          } else {
                            buttonStyle =
                              "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] opacity-70";
                          }
                        }

                        return (
                          <button
                            key={oIdx}
                            type="button"
                            disabled={isAnswered}
                            onClick={() => handleAnswerQuiz(qIdx, oIdx)}
                            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${buttonStyle}`}
                          >
                            <span lang="ja" className="font-japanese">
                              {option}
                            </span>
                            {isAnswered && isCorrect && (
                              <CheckCircle2 className="size-4 shrink-0 text-[var(--success)]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

