"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const timer=window.setTimeout(() => {
      setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    },0);
    return ()=>window.clearTimeout(timer);
  },[]);

  function toggleTheme() {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("kana-theme", next);
    setTheme(next);
  }

  const night = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-icon-button grid size-10 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:text-[var(--primary-fg)]"
      aria-label={night ? "Switch to day mode" : "Switch to night mode"}
    >
      {night ? <Sun key="sun" size={18} /> : <Moon key="moon" size={18} />}
    </button>
  );
}
