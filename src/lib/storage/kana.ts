export interface StorageAdapter {
  saveSettings(id: string, settings: unknown): void;
  getSettings(id: string): unknown | null;
  saveResult(result: unknown & { sessionId?: string }): void;
  getResult(id: string): unknown | null;
  getHistory(): string[];
}

export const localStorageAdapter: StorageAdapter = {
  saveSettings(id, settings) { sessionStorage.setItem(`kana-session:${id}`, JSON.stringify(settings)); },
  getSettings(id) { const value=sessionStorage.getItem(`kana-session:${id}`); return value ? JSON.parse(value) : null; },
  saveResult(result) {
    if (!result.sessionId) return;
    localStorage.setItem(`kana-result:${result.sessionId}`, JSON.stringify(result));
    const raw=localStorage.getItem("kana-history");
    const history=raw ? JSON.parse(raw) as string[] : [];
    const next=[result.sessionId,...history.filter((id)=>id!==result.sessionId)].slice(0,20);
    for (const oldId of history.filter((id)=>!next.includes(id))) localStorage.removeItem(`kana-result:${oldId}`);
    localStorage.setItem("kana-history",JSON.stringify(next));
  },
  getResult(id) { const value=localStorage.getItem(`kana-result:${id}`); return value ? JSON.parse(value) : null; },
  getHistory() { const value=localStorage.getItem("kana-history"); return value ? JSON.parse(value) as string[] : []; },
};
