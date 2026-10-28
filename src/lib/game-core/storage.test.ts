import { beforeEach, describe, expect, it } from "vitest";
import { getGameHistory, getGameResult, getSharedGameHistory, saveGameResult } from "./storage";

describe("shared game result storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps a shared 20-result history across games", () => {
    for (let index = 0; index < 22; index += 1) {
      const game = index % 2 === 0 ? "kana" : "kanji";
      saveGameResult(game, { sessionId: `session-${index}`, index });
    }

    const history = getSharedGameHistory();
    expect(history).toHaveLength(20);
    expect(history[0]).toEqual({ game: "kanji", sessionId: "session-21" });
    expect(history.at(-1)).toEqual({ game: "kana", sessionId: "session-2" });
    expect(getGameResult("kana", "session-0")).toBeNull();
    expect(getGameHistory("kana")).not.toContain("session-0");
    expect(getGameResult("kanji", "session-21")).toEqual({ sessionId: "session-21", index: 21 });
  });
});
