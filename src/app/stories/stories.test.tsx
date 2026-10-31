import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import StoriesHubPage from "./page";
import StoryReadingRoomPage from "./[level]/[slug]/page";
import { COMPLETED_STORIES_STORAGE_KEY } from "@/data/stories";
import { srsDb } from "@/lib/srs/db";
import { getAllSrsItems } from "@/lib/srs/service";

let mockParams: { level: string; slug: string } = { level: "N5", slug: "school" };

vi.mock("next/navigation", () => ({
  useParams: () => mockParams,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("Stories Library Hub & Interactive Reading Room", () => {
  beforeEach(async () => {
    await srsDb.items.clear();
    window.localStorage.clear();
    mockParams = { level: "N5", slug: "school" };
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Stories Hub and filters by JLPT level and category", () => {
    render(<StoriesHubPage />);

    expect(screen.getByText("Reading Practice")).toBeTruthy();
    expect(screen.getByText("42 stories")).toBeTruthy();
    expect(screen.getByText("学校へ行く")).toBeTruthy();
    expect(screen.getByText("桃太郎")).toBeTruthy();

    // Filter by N5
    fireEvent.click(screen.getByRole("button", { name: "N5" }));
    expect(screen.getByText("20 stories")).toBeTruthy();
    expect(screen.getByText("学校へ行く")).toBeTruthy();
    expect(screen.queryByText("桃太郎")).toBeNull();

    // Filter by Fairy Tales within N5
    fireEvent.click(screen.getByRole("button", { name: "Fairy Tales" }));
    expect(screen.getByText("10 stories")).toBeTruthy();
    expect(screen.getByText("浦島太郎")).toBeTruthy();
    expect(screen.queryByText("学校へ行く")).toBeNull();
  });

  it("renders ruby furigana, toggles vertical writing mode, saves tapped word to FSRS, and completes quiz", async () => {
    const { container } = render(<StoryReadingRoomPage />);

    // Verify story title and native <ruby>/<rt> rendering
    expect(screen.getByRole("heading", { name: "学校へ行く" })).toBeTruthy();
    const rubyElements = container.querySelectorAll("ruby");
    expect(rubyElements.length).toBeGreaterThan(0);
    const rtElements = container.querySelectorAll("rt");
    expect(rtElements.length).toBeGreaterThan(0);

    // Toggle vertical writing mode
    const article = screen.getByRole("article", { name: "Story text" });
    expect(article.getAttribute("style")).toContain("horizontal-tb");

    const modeButton = screen.getByRole("button", { name: "Toggle reading direction" });
    fireEvent.click(modeButton);
    expect(article.getAttribute("style")).toContain("vertical-rl");

    // Tap a word token ("学校") to open Vocabulary Inspector and add to FSRS Review
    const schoolButtons = screen.getAllByRole("button", { name: /学校/ });
    expect(schoolButtons.length).toBeGreaterThan(0);
    fireEvent.click(schoolButtons[0]);

    expect(screen.getByText("Vocabulary Inspector")).toBeTruthy();
    const addButton = screen.getByRole("button", { name: /Add to FSRS Review/i });
    fireEvent.click(addButton);

    await waitFor(async () => {
      expect(screen.getByRole("button", { name: /Added to FSRS Review/i })).toBeTruthy();
      const srsItems = await getAllSrsItems();
      expect(srsItems.some((item) => item.id === "vocab:学校")).toBe(true);
    });

    // Complete the 3-question comprehension quiz
    fireEvent.click(screen.getByRole("button", { name: "七時" }));
    fireEvent.click(screen.getByRole("button", { name: "歩いて" }));
    fireEvent.click(screen.getByRole("button", { name: "山下さん" }));

    expect(screen.getByText("Score: 3 / 3")).toBeTruthy();
    const storedCompleted = JSON.parse(
      window.localStorage.getItem(COMPLETED_STORIES_STORAGE_KEY) ?? "[]"
    ) as string[];
    expect(storedCompleted).toContain("school");
  });
});

