import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import KanaPlayPage from "./[sessionId]/page";
import { createKanaSession } from "@/lib/game/session";
import type { KanaSessionResult } from "@/lib/game/kana";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSessionId = "test-session-123";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useParams: () => ({ sessionId: mockSessionId }),
}));

describe("Play Page integration test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("Issue 4: does NOT contain the left-side finished aside or counter pile", () => {
    mockSessionId = "session-check-layout";
    const session = createKanaSession(
      { script: "hiragana", rowKeys: ["basic:vowel"], questionCount: 5 },
      () => 0.1
    );
    sessionStorage.setItem(`kana-session:${mockSessionId}`, JSON.stringify(session));

    render(<KanaPlayPage />);

    // Top progress text exists
    expect(screen.getByText(/1 \/ 5/)).toBeDefined();
    expect(screen.getByText(/0 done/)).toBeDefined();

    // The left-side aside with "finished" text must NOT exist
    expect(screen.queryByText(/finished/i)).toBeNull();
  });

  it("shows a quit warning on browser back and discards the session when confirmed", () => {
    mockSessionId = "session-quit-warning";
    const session = createKanaSession(
      { sessionId: mockSessionId, script: "hiragana", rowKeys: ["basic:vowel"], questionCount: 5 },
      () => 0.1
    );
    sessionStorage.setItem(`kana-session:${mockSessionId}`, JSON.stringify(session));

    render(<KanaPlayPage />);
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(screen.getByRole("dialog", { name: /quit this game/i })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /quit game/i }));

    expect(sessionStorage.getItem(`kana-session:${mockSessionId}`)).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith("/games/kana");
  });

  it("Hiragana, Katakana, and Both sessions show the right script glyph on card 1", () => {
    // Katakana session
    const kataSession = createKanaSession(
      { script: "katakana", rowKeys: ["basic:vowel"], questionCount: 5 },
      () => 0.1
    );
    mockSessionId = "session-katakana-1";
    sessionStorage.setItem(`kana-session:${mockSessionId}`, JSON.stringify(kataSession));

    const { unmount } = render(<KanaPlayPage />);
    // In katakana card, the hanko has "片"
    expect(screen.getByText("片")).toBeDefined();
    unmount();

    // Hiragana session
    const hiraSession = createKanaSession(
      { script: "hiragana", rowKeys: ["basic:vowel"], questionCount: 5 },
      () => 0.1
    );
    mockSessionId = "session-hiragana-1";
    sessionStorage.setItem(`kana-session:${mockSessionId}`, JSON.stringify(hiraSession));

    render(<KanaPlayPage />);
    // In hiragana card, the hanko has "平"
    expect(screen.getByText("平")).toBeDefined();
  });

  it("Play flow with End session: saves result with correct status breakdown and navigates to result page", () => {
    mockSessionId = "session-end-flow";
    const session = createKanaSession(
      { sessionId: mockSessionId, script: "hiragana", rowKeys: ["basic:vowel"], questionCount: 5 },
      () => 0.1
    );
    sessionStorage.setItem(`kana-session:${mockSessionId}`, JSON.stringify(session));

    render(<KanaPlayPage />);

    const endBtn = screen.getByRole("button", { name: /end session/i });
    fireEvent.click(endBtn);

    expect(mockPush).toHaveBeenCalledWith(`/games/kana/result/${mockSessionId}`);
    const rawResult = localStorage.getItem(`kana-result:${mockSessionId}`);
    expect(rawResult).toBeTruthy();
    const result = JSON.parse(rawResult!) as KanaSessionResult;
    expect(result.endedEarly).toBe(true);
    expect(result.cards).toHaveLength(5);
    // Card 0 was on screen -> unfinished
    expect(result.cards[0].status).toBe("unfinished");
    // Cards 1..4 were not reached
    expect(result.cards.slice(1).every((c) => c.status === "not-reached")).toBe(true);
  });

  it("Full playthrough by user: correct first try, wrong-then-right, skipped, then End session", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    mockSessionId = "session-interactive-play";

    // 5 cards: あ, い, う, え, お
    const session = createKanaSession(
      {
        sessionId: mockSessionId,
        script: "hiragana",
        rowKeys: ["basic:vowel"],
        questionCount: 5,
      },
      // deterministic: no shuffle
      () => 0.999
    );
    sessionStorage.setItem(`kana-session:${mockSessionId}`, JSON.stringify(session));

    render(<KanaPlayPage />);

    const input = screen.getByPlaceholderText("type the sound") as HTMLInputElement;

    // Card 0: answered correct first try
    // Check card 0 glyph displayed
    const form = input.closest("form")!;

    // Card 0: submit correct answer for the glyph shown on card
    // First, let's type and submit
    // We can find out which kana is shown by looking at the glyph
    const currentGlyph = document.querySelector(".kana-card-glyph")?.textContent;
    // Map glyph to romaji
    const romajiMap: Record<string, string> = {
      あ: "a", い: "i", う: "u", え: "e", お: "o",
    };
    expect(currentGlyph).toBeDefined();

    // 1. Correct first try on Card 0
    fireEvent.change(input, { target: { value: romajiMap[currentGlyph!] } });
    fireEvent.submit(form);

    // Fast-forward feedback (650ms) + slide-out (420ms)
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    // Top progress should show "1 done"
    expect(screen.getByText(/1 done/)).toBeDefined();

    // Card 1: wrong once, then correct
    const glyph1 = document.querySelector(".kana-card-glyph")?.textContent;
    fireEvent.change(input, { target: { value: "wrong_guess" } });
    fireEvent.submit(form);

    // Shows "Not quite, try again"
    expect(screen.getByText(/Not quite, try again/)).toBeDefined();

    // Now type correct answer and submit
    fireEvent.change(input, { target: { value: romajiMap[glyph1!] } });
    fireEvent.submit(form);

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    // Top progress should show "2 done"
    expect(screen.getByText(/2 done/)).toBeDefined();

    // Card 2: skip
    const skipBtn = screen.getByLabelText("Skip character");
    fireEvent.click(skipBtn);

    // Fast forward skip reveal (1300ms) + slide-out (420ms)
    act(() => {
      vi.advanceTimersByTime(1750);
    });

    // Top progress should show "3 done"
    expect(screen.getByText(/3 done/)).toBeDefined();

    // Card 3: wrong once, then END
    fireEvent.change(input, { target: { value: "wrong_on_card3" } });
    fireEvent.submit(form);

    const endBtn = screen.getByRole("button", { name: /end session/i });
    fireEvent.click(endBtn);

    expect(mockPush).toHaveBeenCalledWith(`/games/kana/result/${mockSessionId}`);
    const rawResult = localStorage.getItem(`kana-result:${mockSessionId}`);
    expect(rawResult).toBeTruthy();
    const result = JSON.parse(rawResult!) as KanaSessionResult;

    // Card 0: correct-first-try, 0 mistakes
    expect(result.cards[0].status).toBe("correct-first-try");
    expect(result.cards[0].mistakes).toBe(0);

    // Card 1: correct-after-retry, 1 mistake
    expect(result.cards[1].status).toBe("correct-after-retry");
    expect(result.cards[1].mistakes).toBe(1);
    expect(result.cards[1].wrongAnswers).toEqual(["wrong_guess"]);

    // Card 2: skipped, 0 mistakes
    expect(result.cards[2].status).toBe("skipped");
    expect(result.cards[2].mistakes).toBe(0);

    // Card 3: unfinished, 1 mistake
    expect(result.cards[3].status).toBe("unfinished");
    expect(result.cards[3].mistakes).toBe(1);
    expect(result.cards[3].wrongAnswers).toEqual(["wrong_on_card3"]);

    // Card 4: not-reached, 0 mistakes
    expect(result.cards[4].status).toBe("not-reached");
    expect(result.cards[4].mistakes).toBe(0);

    vi.useRealTimers();
  });
});
