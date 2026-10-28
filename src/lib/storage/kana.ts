import { getGameHistory, getGameResult, getGameSession, saveGameResult, saveGameSession } from "@/lib/game-core/storage";

export interface StorageAdapter {
  saveSettings(id: string, settings: unknown): void;
  getSettings(id: string): unknown | null;
  saveResult(result: unknown & { sessionId?: string }): void;
  getResult(id: string): unknown | null;
  getHistory(): string[];
}

export const localStorageAdapter: StorageAdapter = {
  saveSettings(id, settings) { saveGameSession("kana", id, settings); },
  getSettings(id) { return getGameSession("kana", id); },
  saveResult(result) {
    saveGameResult("kana", result);
  },
  getResult(id) { return getGameResult("kana", id); },
  getHistory() { return getGameHistory("kana"); },
};
