import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VocabularySetupPage from "./page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

describe("vocabulary setup", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it("shows the eligible count and creates a unique N5 session", async () => {
    const user = userEvent.setup();
    render(<VocabularySetupPage />);
    const start = await screen.findByRole("button", { name: /^Start/ });
    await waitFor(() => expect((start as HTMLButtonElement).disabled).toBe(false));
    expect(screen.getByText("eligible words")).toBeTruthy();

    await user.click(start);
    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toMatch(/^\/games\/vocabulary\/play\/.+$/);
    const sessionId = url.split("/").at(-1)!;
    const session = JSON.parse(sessionStorage.getItem(`vocabulary-session:${sessionId}`)!);
    expect(session.settings).toMatchObject({ levels: ["N5"], grades: [], size: 10 });
    expect(session.questionIds).toHaveLength(10);
    expect(new Set(session.questionIds).size).toBe(10);
  });

  it("does not start if no level or enough eligible words are selected", async () => {
    const user = userEvent.setup();
    render(<VocabularySetupPage />);
    const start = await screen.findByRole("button", { name: /^Start/ });
    await waitFor(() => expect((start as HTMLButtonElement).disabled).toBe(false));

    await user.click(screen.getByRole("button", { name: "N5" }));
    expect((start as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Select at least one JLPT level.")).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
