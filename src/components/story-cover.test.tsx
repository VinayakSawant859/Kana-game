import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StoryCover } from "./story-cover";
import { PLACEHOLDER_STORY_IMAGE } from "@/data/stories";

afterEach(() => cleanup());

function renderCover() {
  render(
    <StoryCover
      src="/images/stories/school.png"
      placeholder="/images/stories/placeholders/school.svg"
      alt="School"
    />
  );
  return {
    placeholder: screen.getByTestId("story-cover-placeholder"),
    image: () => screen.queryByTestId("story-cover-image"),
  };
}

describe("StoryCover", () => {
  it("shows the SVG placeholder while the PNG is loading", () => {
    const { placeholder, image } = renderCover();
    expect(placeholder.getAttribute("src")).toBe("/images/stories/placeholders/school.svg");
    expect(placeholder.className).toContain("opacity-100");
    expect(image()?.className).toContain("opacity-0");
    expect(image()?.getAttribute("data-status")).toBe("loading");
  });

  it("fades the PNG in and hides the placeholder once loaded", () => {
    const { placeholder, image } = renderCover();
    fireEvent.load(image()!);
    expect(image()?.getAttribute("data-status")).toBe("loaded");
    expect(image()?.className).toContain("opacity-100");
    expect(placeholder.className).toContain("opacity-0");
  });

  it("keeps the SVG placeholder if the PNG fails", () => {
    const { placeholder, image } = renderCover();
    fireEvent.error(image()!);
    expect(image()).toBeNull();
    expect(placeholder.className).toContain("opacity-100");
  });

  it("falls back to the default SVG if the story placeholder is missing", () => {
    const { placeholder } = renderCover();
    fireEvent.error(placeholder);
    expect(screen.getByTestId("story-cover-placeholder").getAttribute("src")).toBe(
      PLACEHOLDER_STORY_IMAGE
    );
  });
});

