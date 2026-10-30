"use client";

import { useEffect, useState } from "react";

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
    requestQuit: () => setQuitDialogOpen(true),
    cancelQuit: () => setQuitDialogOpen(false),
    confirmQuit: () => setQuitDialogOpen(false),
  };
}

