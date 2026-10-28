export function saveGameSession<T>(
  game: string,
  sessionId: string,
  session: T,
  storage: Storage = sessionStorage
): void {
  storage.setItem(`${game}-session:${sessionId}`, JSON.stringify(session));
}

export function getGameSession<T>(
  game: string,
  sessionId: string,
  storage: Storage = sessionStorage
): T | null {
  const value = storage.getItem(`${game}-session:${sessionId}`);
  return value ? (JSON.parse(value) as T) : null;
}

export function saveGameResult<T extends { sessionId?: string }>(
  game: string,
  result: T,
  storage: Storage = localStorage
): void {
  if (!result.sessionId) return;
  storage.setItem(`${game}-result:${result.sessionId}`, JSON.stringify(result));
  const historyKey = `${game}-history`;
  const history = storage.getItem(historyKey);
  const previous = history ? (JSON.parse(history) as string[]) : [];
  const next = [result.sessionId, ...previous.filter((id) => id !== result.sessionId)].slice(0, 20);
  storage.setItem(historyKey, JSON.stringify(next));

  const sharedHistory = storage.getItem("history");
  const previousShared = sharedHistory
    ? (JSON.parse(sharedHistory) as Array<{ game: string; sessionId: string }>)
    : [];
  const nextShared = [
    { game, sessionId: result.sessionId },
    ...previousShared.filter((entry) => entry.game !== game || entry.sessionId !== result.sessionId),
  ].slice(0, 20);
  const nextSharedKeys = new Set(nextShared.map((entry) => `${entry.game}:${entry.sessionId}`));
  for (const oldEntry of previousShared.filter((entry) => !nextSharedKeys.has(`${entry.game}:${entry.sessionId}`))) {
    storage.removeItem(`${oldEntry.game}-result:${oldEntry.sessionId}`);
    const oldGameHistoryKey = `${oldEntry.game}-history`;
    const oldGameHistory = storage.getItem(oldGameHistoryKey);
    if (oldGameHistory) {
      storage.setItem(
        oldGameHistoryKey,
        JSON.stringify((JSON.parse(oldGameHistory) as string[]).filter((id) => id !== oldEntry.sessionId))
      );
    }
  }
  storage.setItem("history", JSON.stringify(nextShared));
}

export function getGameResult<T>(
  game: string,
  sessionId: string,
  storage: Storage = localStorage
): T | null {
  const value = storage.getItem(`${game}-result:${sessionId}`);
  return value ? (JSON.parse(value) as T) : null;
}

export function getGameHistory(game: string, storage: Storage = localStorage): string[] {
  const value = storage.getItem(`${game}-history`);
  return value ? (JSON.parse(value) as string[]) : [];
}

export function getSharedGameHistory(
  storage: Storage = localStorage
): Array<{ game: string; sessionId: string }> {
  const value = storage.getItem("history");
  return value ? (JSON.parse(value) as Array<{ game: string; sessionId: string }>) : [];
}
