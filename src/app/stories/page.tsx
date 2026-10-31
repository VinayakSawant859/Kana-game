"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock } from "lucide-react";
import { GameLayout } from "@/lib/game-core/layout";
import {
  COMPLETED_STORIES_STORAGE_KEY,
  estimateReadingTimeMinutes,
  getAllStories,
  getCompletedStoryIds,
  type StoryCategory,
  type StoryRecord,
} from "@/data/stories";
import { StoryCover } from "@/components/story-cover";

void COMPLETED_STORIES_STORAGE_KEY;

const levelTabs: Array<{ key: "All" | "N5" | "N4"; label: string }> = [
  { key: "All", label: "All" },
  { key: "N5", label: "N5" },
  { key: "N4", label: "N4" },
];

const categoryTabs: Array<{ key: "All" | StoryCategory; label: string }> = [
  { key: "All", label: "All" },
  { key: "Everyday Life", label: "Everyday Life" },
  { key: "Fairy Tales", label: "Fairy Tales" },
];

export default function StoriesHubPage() {
  const allStories = useMemo(() => getAllStories(), []);
  const [selectedLevel, setSelectedLevel] = useState<"All" | "N5" | "N4">("All");
  const [selectedCategory, setSelectedCategory] = useState<"All" | StoryCategory>("All");
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompletedIds(getCompletedStoryIds());
  }, []);

  const filteredStories = useMemo(() => {
    return allStories.filter((story: StoryRecord) => {
      if (selectedLevel !== "All" && story.level !== selectedLevel) {
        return false;
      }
      if (selectedCategory !== "All" && story.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [allStories, selectedLevel, selectedCategory]);

  return (
    <GameLayout glyph="読" label="READING">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center py-6">
        <div className="mb-8 flex flex-col gap-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--card-shadow)] md:p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-[var(--primary)] uppercase">
                Graded Story & Folklore Library
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--ink)] md:text-3xl">
                Reading Practice
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm text-[var(--muted)]">
                Read JLPT-graded situational stories and classic Japanese folklore with furigana,
                vertical/horizontal layouts, native audio, and 1-tap FSRS vocabulary saving.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-[var(--muted)]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--paper-tint)] px-3.5 py-1.5 text-[var(--ink)]">
                <BookOpen className="size-3.5 text-[var(--primary)]" />
                {filteredStories.length} {filteredStories.length === 1 ? "story" : "stories"}
              </span>
              {completedIds.size > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success)]/35 bg-[var(--success-soft)] px-3.5 py-1.5 text-[var(--success)]">
                  <CheckCircle2 className="size-3.5" />
                  {completedIds.size} completed
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-[var(--line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
            {/* JLPT Level Tabs */}
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="JLPT Level Filter">
              <span className="mr-1 text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                Level
              </span>
              {levelTabs.map((tab) => {
                const active = selectedLevel === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedLevel(tab.key)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-ink)] shadow-sm"
                        : "border-[var(--line)] bg-[var(--paper-tint)] text-[var(--ink)] hover:border-[var(--primary)]/50"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Category Filter">
              <span className="mr-1 text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                Category
              </span>
              {categoryTabs.map((tab) => {
                const active = selectedCategory === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedCategory(tab.key)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-ink)] shadow-sm"
                        : "border-[var(--line)] bg-[var(--paper-tint)] text-[var(--ink)] hover:border-[var(--primary)]/50"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Story Grid */}
        <section
          aria-label="Stories list"
          className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {filteredStories.map((story) => {
            const readMinutes = estimateReadingTimeMinutes(story);
            const isCompleted = completedIds.has(story.id) || completedIds.has(story.slug);
            return (
              <Link
                key={story.id}
                href={`/stories/${story.level}/${story.slug}`}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--card-shadow)] transition hover:-translate-y-0.5 hover:border-[var(--primary)]/60"
              >
                <div>
                  {/* Cover Art Frame */}
                  <div className="relative h-44 w-full overflow-hidden border-b border-[var(--line)] bg-[var(--paper-tint)]">
                    <StoryCover
                      src={story.coverImage}
                      placeholder={story.coverPlaceholder}
                      alt={`${story.title} (${story.titleEn})`}
                      className="transition duration-300 group-hover:scale-105"
                    />
                  </div>

                  <div className="p-6 pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-[var(--primary)] px-2.5 py-0.5 text-xs font-bold text-[var(--primary-ink)]">
                          {story.level}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--paper-tint)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted)]">
                          {story.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCompleted && (
                          <span
                            title="Completed"
                            className="inline-flex items-center gap-1 rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--success)]"
                          >
                            <CheckCircle2 className="size-3" />
                            Done
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                          <Clock className="size-3.5" />
                          {readMinutes} min read
                        </span>
                      </div>
                    </div>

                    <h2
                      lang="ja"
                      className="font-japanese mt-4 text-2xl font-semibold tracking-tight text-[var(--ink)] transition group-hover:text-[var(--primary)]"
                    >
                      {story.title}
                    </h2>
                    <p className="mt-1 text-xs font-medium text-[var(--muted)]">
                      {story.titleRomaji}
                    </p>
                    <p className="mt-1.5 text-sm font-medium text-[var(--ink)]">
                      {story.titleEn}
                    </p>
                    <p
                      lang="ja"
                      className="font-japanese mt-3 line-clamp-2 text-xs leading-relaxed text-[var(--muted)]"
                    >
                      {story.paragraphs[0]?.ja}
                    </p>
                  </div>
                </div>

                <div className="mx-6 mb-6 mt-5 flex items-center justify-between border-t border-[var(--line)] pt-3.5 text-xs font-semibold text-[var(--primary)]">
                  <span>Read story</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </GameLayout>
  );
}

