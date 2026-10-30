import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import GamesHub from "./page";

describe("GamesHub (/)", () => {
  it("renders live and upcoming games, GitHub link, and KANJIDIC attribution", () => {
    render(<GamesHub />);

    expect(screen.getByRole("heading", { name: /choose your game/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /kana practice/i }).getAttribute("href")).toBe("/games/kana");
    expect(screen.getByRole("link", { name: /kanji meaning/i }).getAttribute("href")).toBe("/games/kanji/meaning");
    expect(screen.getByRole("link", { name: /vocabulary meaning/i }).getAttribute("href")).toBe("/games/vocabulary");
    expect(screen.getByText(/Kanji Reading/i)).toBeTruthy();
    expect(screen.getByText(/FSRS Review Hub/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /github repository/i }).getAttribute("href")).toBe(
      "https://github.com/VinayakSawant859/Kana-game"
    );
    expect(screen.getByText(/KANJIDIC2/i)).toBeTruthy();
    expect(screen.getByText(/EDRDG/i)).toBeTruthy();
  });
});

