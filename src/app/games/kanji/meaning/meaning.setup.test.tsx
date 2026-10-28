import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadKanjiData } from "@/data/kanji";
import MeaningSetupPage from "./page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

describe("kanji meaning setup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it("starts a N5 grade 1 session with ten questions", async () => {
    const user = userEvent.setup();
    render(<MeaningSetupPage />);
    const start = await screen.findByRole("button", { name: /start/i });
    await waitFor(() => expect((start as HTMLButtonElement).disabled).toBe(false));

    await user.click(screen.getByRole("button", { name: /Grade 2/ }));
    await user.click(screen.getByRole("button", { name: "10" }));
    await user.click(start);

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    await waitFor(() => expect((start as HTMLButtonElement).disabled).toBe(false));
    expect(screen.queryByRole("button", { name: /Starting/i })).toBeNull();
    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toMatch(/^\/games\/kanji\/meaning\/play\/.+$/);
    const sessionId = url.split("/").at(-1)!;
    const session = JSON.parse(sessionStorage.getItem(`kanji-session:${sessionId}`)!);
    const records = await loadKanjiData();
    const byKanji = new Map(records.map((record) => [record.c, record]));
    expect(session.questions).toHaveLength(10);
    expect(new Set(session.questions.map((question: { kanji: string }) => question.kanji)).size).toBe(10);
    expect(session.settings.levels).toEqual([5]);
    expect(session.settings.grades).toEqual([1]);
    expect(session.questions.every((question: { kanji: string }) => {
      const record = byKanji.get(question.kanji);
      return record?.jlpt === 5 && record.grade === 1;
    })).toBe(true);
  });
});
