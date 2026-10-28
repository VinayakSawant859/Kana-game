"use client";

import { useEffect, useState } from "react";

type QuitSessionDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function QuitSessionDialog({ open, onCancel, onConfirm }: QuitSessionDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-5" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quit-session-title"
        aria-describedby="quit-session-description"
        className="w-full max-w-sm rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6 shadow-2xl"
      >
        <h2 id="quit-session-title" className="text-xl font-bold">Quit this game?</h2>
        <p id="quit-session-description" className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Your progress in this session will be discarded and you will return to the game settings.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="secondary-button rounded-md border px-4 py-2 text-sm font-bold">
            Stay
          </button>
          <button type="button" onClick={onConfirm} className="primary-button rounded-md px-4 py-2 text-sm font-bold">
            Quit game
          </button>
        </div>
      </div>
    </div>
  );
}

export function useQuitSessionGuard(enabled: boolean) {
  const [quitDialogOpen, setQuitDialogOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    window.history.pushState({ ...window.history.state, __kanaGameQuitGuard: true }, "", window.location.href);

    function onPopState() {
      setQuitDialogOpen(true);
      window.history.pushState({ ...window.history.state, __kanaGameQuitGuard: true }, "", window.location.href);
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [enabled]);

  return {
    quitDialogOpen,
    cancelQuit: () => setQuitDialogOpen(false),
    confirmQuit: () => setQuitDialogOpen(false),
  };
}
