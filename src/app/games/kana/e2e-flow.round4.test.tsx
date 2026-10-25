import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import KanaPlayPage from "@/app/games/kana/play/[sessionId]/page";
import KanaResultPage from "@/app/games/kana/result/[sessionId]/page";

let currentPath = "/";
let currentSessionId = "";

const mockPush = vi.fn((path: string) => {
  currentPath = path;
  if (path.includes("/play/")) {
    currentSessionId = path.split("/play/")[1];
  } else if (path.includes("/result/")) {
    currentSessionId = path.split("/result/")[1];
  }
});
const mockReplace = vi.fn((path: string) => {
  currentPath = path;
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useParams: () => ({ sessionId: currentSessionId }),
}));

describe("Full lifecycle flow: Hiragana -> Start -> End session -> Change settings -> Katakana -> Start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    currentPath = "/";
    currentSessionId = "";
  });

  afterEach(() => {
    cleanup();
  });

  it("Hiragana -> Start -> End session -> Change settings -> Katakana -> Start -> first card is Katakana and counter says 1 / N", async () => {
    const user = userEvent.setup();

    // Step 1: User visits Home, clicks Start practice (default Hiragana)
    const { unmount: unmountHome1 } = render(<Home />);
    const startBtn1 = screen.getByRole("button", { name: /start practice/i });
    await user.click(startBtn1);

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(currentPath).toContain("/games/kana/play/");
    const session1Id = currentSessionId;
    unmountHome1();

    // Step 2: Play page for session 1
    const { unmount: unmountPlay1 } = render(<KanaPlayPage />);
    // Card 1 is Hiragana (hanko "平")
    expect(screen.getByText("平")).toBeDefined();
    expect(screen.getByText(/1 \/ \d+/)).toBeDefined();

    // User clicks "End session"
    const endBtn = screen.getByRole("button", { name: /end session/i });
    fireEvent.click(endBtn);
    expect(mockPush).toHaveBeenCalledWith(`/games/kana/result/${session1Id}`);
    unmountPlay1();

    // Step 3: Result page
    const { unmount: unmountResult } = render(<KanaResultPage />);
    const changeSettingsBtn = screen.getByRole("button", { name: /change settings/i });
    fireEvent.click(changeSettingsBtn);
    expect(mockPush).toHaveBeenCalledWith("/");
    unmountResult();

    // Step 4: Back on Home -> Change settings to Katakana -> Start
    const { unmount: unmountHome2 } = render(<Home />);
    const katakanaBtn = screen.getByRole("button", { name: /^katakana$/i });
    await user.click(katakanaBtn);

    const startBtn2 = screen.getByRole("button", { name: /start practice/i });
    await user.click(startBtn2);

    expect(mockPush).toHaveBeenCalledTimes(4); // play1, result, home, play2
    expect(currentPath).toContain("/games/kana/play/");
    const session2Id = currentSessionId;
    expect(session2Id).not.toBe(session1Id);
    unmountHome2();

    // Step 5: Play page for session 2
    render(<KanaPlayPage />);
    // The first card is Katakana (hanko "片")
    expect(screen.getByText("片")).toBeDefined();
    // And counter says "1 / N"
    const stored2 = JSON.parse(sessionStorage.getItem(`kana-session:${session2Id}`)!);
    const total2 = stored2.deckIds.length;
    expect(screen.getByText(`1 / ${total2}`)).toBeDefined();
    expect(screen.getByText("0 done")).toBeDefined();
  });
});
