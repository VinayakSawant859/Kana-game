import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

describe("Setup page component test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("click Katakana, click Start -> stored record deckIds all katakana and router called with new id URL", async () => {
    const user = userEvent.setup();
    render(<Home />);

    // Click Katakana
    const katakanaBtn = screen.getByRole("button", { name: /^katakana$/i });
    await user.click(katakanaBtn);

    // Click Start practice
    const startBtn = screen.getByRole("button", { name: /start practice/i });
    await user.click(startBtn);

    expect(mockPush).toHaveBeenCalledTimes(1);
    const pushedUrl = mockPush.mock.calls[0][0] as string;
    expect(pushedUrl).toMatch(/^\/games\/kana\/play\/[0-9a-f-]+$/);

    const sessionId = pushedUrl.replace("/games/kana/play/", "");
    const raw = sessionStorage.getItem(`kana-session:${sessionId}`);
    expect(raw).toBeTruthy();
    const stored = JSON.parse(raw!);
    expect(stored.deckIds).toBeDefined();
    expect(stored.deckIds.length).toBeGreaterThan(0);
    expect(stored.deckIds.every((id: string) => id.startsWith("katakana-"))).toBe(true);
  });

  it("switching Hiragana -> Katakana -> Both in one visit creates correct deckIds", async () => {
    const user = userEvent.setup();
    render(<Home />);

    // Click Hiragana -> check
    await user.click(screen.getByRole("button", { name: /^hiragana$/i }));
    // Switch to Katakana
    await user.click(screen.getByRole("button", { name: /^katakana$/i }));
    // Switch to Both
    await user.click(screen.getByRole("button", { name: /^both$/i }));

    const startBtn = screen.getByRole("button", { name: /start practice/i });
    await user.click(startBtn);

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const sessionId = pushedUrl.replace("/games/kana/play/", "");
    const raw = sessionStorage.getItem(`kana-session:${sessionId}`);
    expect(raw).toBeTruthy();
    const stored = JSON.parse(raw!);
    expect(stored.deckIds).toBeDefined();
    expect(stored.deckIds.some((id: string) => id.startsWith("hiragana-"))).toBe(true);
    expect(stored.deckIds.some((id: string) => id.startsWith("katakana-"))).toBe(true);
  });

  it("when returning from previous Hiragana session via Change settings, selecting Katakana preserves Katakana selection", async () => {
    localStorage.setItem(
      "kana-last-setup",
      JSON.stringify({ script: "hiragana", groups: ["basic"], rowKeys: ["basic:vowel"], questionCount: null })
    );

    const user = userEvent.setup();
    render(<Home />);

    // User switches to Katakana
    const katakanaBtn = screen.getByRole("button", { name: /^katakana$/i });
    await user.click(katakanaBtn);

    const startBtn = screen.getByRole("button", { name: /start practice/i });
    await user.click(startBtn);

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const sessionId = pushedUrl.replace("/games/kana/play/", "");
    const raw = sessionStorage.getItem(`kana-session:${sessionId}`);
    expect(raw).toBeTruthy();
    const stored = JSON.parse(raw!);
    // In current implementation, stored.script or deckIds would be checked
    expect(stored.settings?.script ?? stored.script).toBe("katakana");
  });
});
