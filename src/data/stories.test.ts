import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  estimateReadingTimeMinutes,
  getAllStories,
  getStoriesByLevel,
  getStoryBySlug,
  PLACEHOLDER_STORY_IMAGE,
} from "./stories";

describe("Stories data pipeline & loader", () => {
  it("loads all 42 graded stories with normalized categories, cover images, and pre-parsed furigana tokens", () => {
    const stories = getAllStories();
    expect(stories.length).toBe(42);

    const placeholderDiskPath = path.join(process.cwd(), "public", PLACEHOLDER_STORY_IMAGE);
    expect(fs.existsSync(placeholderDiskPath)).toBe(true);

    for (const story of stories) {
      expect(story.id).toBeTruthy();
      expect(story.slug).toBeTruthy();
      expect(story.title).toBeTruthy();
      expect(story.titleEn).toBeTruthy();
      expect(story.coverImage).toBe(`/images/stories/${story.slug}.png`);
      expect(story.coverPlaceholder).toBe(`/images/stories/placeholders/${story.slug}.svg`);
      expect(fs.existsSync(path.join(process.cwd(), "public", story.coverPlaceholder))).toBe(true);
      const assetDiskPath = path.join(process.cwd(), "public", story.coverImage);
      expect(fs.existsSync(assetDiskPath)).toBe(true);
      expect(["N5", "N4", "N3", "N2", "N1"]).toContain(story.level);
      expect(["Everyday Life", "Fairy Tales", "News"]).toContain(story.category);
      expect(story.paragraphs.length).toBeGreaterThan(0);
      expect(story.quiz.length).toBeGreaterThanOrEqual(2);
      expect(estimateReadingTimeMinutes(story)).toBeGreaterThanOrEqual(1);

      for (const p of story.paragraphs) {
        expect(p.ja).not.toMatch(/\[cite:/);
        expect(p.en).not.toMatch(/\[cite:/);
        expect(Array.isArray(p.tokens)).toBe(true);
        expect(p.tokens!.length).toBeGreaterThan(0);
      }
    }
  });

  it("filters stories by JLPT level", () => {
    const n5Stories = getStoriesByLevel("N5");
    const n4Stories = getStoriesByLevel("N4");
    expect(n5Stories.length).toBe(20);
    expect(n4Stories.length).toBe(22);
    expect(n5Stories.every((s) => s.level === "N5")).toBe(true);
    expect(n4Stories.every((s) => s.level === "N4")).toBe(true);
  });

  it("retrieves stories by level and slug (2-arg and 3-arg forms)", () => {
    const school = getStoryBySlug("N5", "school");
    expect(school).toBeDefined();
    expect(school?.title).toBe("学校へ行く");
    expect(school?.category).toBe("Everyday Life");

    const urashima = getStoryBySlug("N5", "Fairy Tales", "urashima-taro");
    expect(urashima).toBeDefined();
    expect(urashima?.title).toBe("浦島太郎");
    expect(urashima?.category).toBe("Fairy Tales");

    const momotaro = getStoryBySlug("N4", "momotaro");
    expect(momotaro).toBeDefined();
    expect(momotaro?.title).toBe("桃太郎");
  });
});

