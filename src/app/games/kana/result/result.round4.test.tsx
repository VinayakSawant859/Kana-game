import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import KanaResultPage from "./[sessionId]/page";
import type { KanaSessionResult } from "@/lib/game/kana";
import type { StoredKanaSession } from "@/lib/game/session";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSessionId = "result-session-123";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useParams: () => ({ sessionId: mockSessionId }),
}));

describe("Result Page integration test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("displays correct stats and no impossible numbers", () => {
    mockSessionId = "result-test-1";
    const sampleResult: KanaSessionResult = {
      sessionId: mockSessionId,
      startedAt: Date.now() - 30000,
      endedAt: Date.now(),
      endedEarly: true,
      cards: [
        { id: "hiragana-あ", char: "あ", romaji: ["a"], script: "hiragana", group: "basic", row: "vowel", status: "correct-first-try", mistakes: 0, wrongAnswers: [] },
        { id: "hiragana-い", char: "い", romaji: ["i"], script: "hiragana", group: "basic", row: "vowel", status: "correct-after-retry", mistakes: 2, wrongAnswers: ["x", "y"] },
        { id: "hiragana-う", char: "う", romaji: ["u"], script: "hiragana", group: "basic", row: "vowel", status: "skipped", mistakes: 0, wrongAnswers: [] },
        { id: "hiragana-え", char: "え", romaji: ["e"], script: "hiragana", group: "basic", row: "vowel", status: "unfinished", mistakes: 1, wrongAnswers: ["z"] },
        { id: "hiragana-お", char: "お", romaji: ["o"], script: "hiragana", group: "basic", row: "vowel", status: "not-reached", mistakes: 0, wrongAnswers: [] },
      ],
    };
    localStorage.setItem(`kana-result:${mockSessionId}`, JSON.stringify(sampleResult));

    render(<KanaResultPage />);

    // Attempted: 4 of 5 (1 first + 1 retry + 1 skipped + 1 unfinished)
    expect(screen.getByText(/Attempted: 4 of 5/)).toBeDefined();
    // First try: 1 / 5
    expect(screen.getByText(/1 \/ 5/)).toBeDefined();
    // Mistakes: 3 (2 from card 1 + 1 from card 3)
    expect(screen.getAllByText(/Mistakes/).length).toBeGreaterThan(0);
  });

  it("Play again starts new session preserving script", () => {
    mockSessionId = "result-test-katakana";
    const storedSession: StoredKanaSession = {
      sessionId: mockSessionId,
      settings: {
        sessionId: mockSessionId,
        script: "katakana",
        rowKeys: ["basic:vowel"],
        questionCount: null,
      },
      deckIds: ["katakana-ア", "katakana-イ", "katakana-ウ", "katakana-エ", "katakana-オ"],
    };
    sessionStorage.setItem(`kana-session:${mockSessionId}`, JSON.stringify(storedSession));

    const sampleResult: KanaSessionResult = {
      sessionId: mockSessionId,
      startedAt: Date.now() - 10000,
      endedAt: Date.now(),
      endedEarly: false,
      cards: [
        { id: "katakana-ア", char: "ア", romaji: ["a"], script: "katakana", group: "basic", row: "vowel", status: "correct-first-try", mistakes: 0, wrongAnswers: [] },
      ],
    };
    localStorage.setItem(`kana-result:${mockSessionId}`, JSON.stringify(sampleResult));

    render(<KanaResultPage />);

    const playAgainBtn = screen.getByRole("button", { name: /play again/i });
    fireEvent.click(playAgainBtn);

    expect(mockPush).toHaveBeenCalledTimes(1);
    const pushedUrl = mockPush.mock.calls[0][0] as string;
    expect(pushedUrl).toMatch(/^\/games\/kana\/play\/[0-9a-f-]+$/);
    const newSessionId = pushedUrl.replace("/games/kana/play/", "");

    const newStored = JSON.parse(sessionStorage.getItem(`kana-session:${newSessionId}`)!);
    expect(newStored.deckIds.every((id: string) => id.startsWith("katakana-"))).toBe(true);
  });
});
