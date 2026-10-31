import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createEmptyCard } from "ts-fsrs";
import { srsDb } from "@/lib/srs/db";
import { importCards } from "@/lib/srs/service";
import ReviewHubPage from "./page";

describe("FSRS Review Hub (/review)", () => {
  beforeEach(async () => {
    cleanup();
    await srsDb.items.clear();
  });

  it("loads due counts from Dexie and completes a flashcard review flow", async () => {
    const past = new Date(Date.now() - 60_000);
    await importCards([
      {
        id: "kanji:4F53",
        type: "kanji",
        level: "N4",
        prompt: "体",
        answer: "body, substance",
        reading: "タイ · からだ",
        card: createEmptyCard(past),
      },
    ]);

    const user = userEvent.setup();
    render(<ReviewHubPage />);

    await waitFor(() => {
      expect(screen.getByTestId("due-total-count").textContent).toBe("1");
    });
    expect(screen.getByTestId("due-kanji-count").textContent).toBe("1");

    const startBtn = screen.getByRole("button", { name: /start review/i });
    await user.click(startBtn);

    expect(await screen.findByText("体")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /show answer/i }));

    expect(await screen.findByText("body, substance")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Good" }));

    expect(await screen.findByRole("heading", { name: /review session complete/i })).toBeTruthy();

    const updated = await srsDb.items.get("kanji:4F53");
    expect(updated?.card.reps).toBe(1);
    expect(new Date(updated!.card.due).getTime()).toBeGreaterThan(Date.now());
  });
});

