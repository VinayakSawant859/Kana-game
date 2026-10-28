"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, RotateCcw, Settings2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { createKanaSession } from "@/lib/game/session";
import { countCharacters, groupRows, type KanaGroup, type ScriptSelection } from "@/data/kana";

export default function Home() {
  const router = useRouter();
  const [script, setScript] = useState<ScriptSelection>("hiragana");
  const [groups, setGroups] = useState<KanaGroup[]>(["basic"]);
  const [selectedRows, setSelectedRows] = useState<string[]>([...groupRows.basic.map((row) => row.key)]);
  const [questionMode, setQuestionMode] = useState<"all" | "custom">("all");
  const [customCount, setCustomCount] = useState(20);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("kana-last-setup") || "null") as {
        script?: ScriptSelection;
        groups?: KanaGroup[];
        rowKeys?: string[];
        questionCount?: number | null;
      } | null;
      if (saved) {
        /* eslint-disable react-hooks/set-state-in-effect */
        if (saved.script) setScript(saved.script);
        if (saved.groups) setGroups(saved.groups);
        if (saved.rowKeys) setSelectedRows(saved.rowKeys);
        if (saved.questionCount === null || saved.questionCount === undefined) {
          setQuestionMode("all");
        } else {
          setQuestionMode("custom");
          setCustomCount(saved.questionCount);
        }
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {}
  }, []);

  const characterCount = useMemo(() => countCharacters({ script, rowKeys: selectedRows }), [script, selectedRows]);

  function toggleRow(rowKey: string) {
    setSelectedRows((current) => current.includes(rowKey) ? current.filter((item) => item !== rowKey) : [...current, rowKey]);
  }

  function toggleGroup(group: KanaGroup) {
    setGroups((current) => {
      const active = current.includes(group);
      setSelectedRows((rows) => active
        ? rows.filter((key) => !key.startsWith(`${group}:`))
        : [...rows, ...groupRows[group].map((row) => row.key)]);
      return active ? current.filter((item) => item !== group) : [...current, group];
    });
  }

  function startPractice() {
    if (characterCount === 0) return;
    const session = createKanaSession({
      script,
      rowKeys: selectedRows.filter((key) => script === "hiragana" ? !key.startsWith("extended:") : true),
      questionCount: questionMode === "all" ? null : Math.min(customCount, characterCount),
    });

    localStorage.setItem(
      "kana-last-setup",
      JSON.stringify({
        script,
        groups,
        rowKeys: session.settings.rowKeys,
        questionCount: session.settings.questionCount,
      })
    );
    sessionStorage.setItem(`kana-session:${session.sessionId}`, JSON.stringify(session));
    router.push(`/games/kana/play/${session.sessionId}`);
  }

  return (
    <main className="relative flex min-h-dvh flex-col bg-[var(--bg)] text-[var(--ink)]">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8 sm:py-6">
        <button className="flex items-center gap-2.5" aria-label="Kana Practice home">
          <span className="grid size-9 place-items-center rounded-full bg-[var(--primary)] font-japanese text-xl text-white">あ</span>
          <span className="text-sm font-bold tracking-[0.18em]">KANA</span>
        </button>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:text-[var(--primary)]" aria-label="Settings"><Settings2 size={18} /></button>
        </div>
      </nav>

      <section className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-5 pb-6 sm:px-8 sm:pb-8">
        <div className="grid w-full gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_18px_50px_rgba(188,0,45,0.055)] sm:p-7">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div><p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">New session</p><h1 className="text-2xl font-bold sm:text-3xl">Practice setup</h1></div>
            <button type="button" onClick={() => { setScript("hiragana"); setGroups(["basic"]); setSelectedRows([...groupRows.basic.map((row) => row.key)]); setQuestionMode("all"); setCustomCount(20); }} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--sakura-light)] hover:text-[var(--primary-fg)]">
              <RotateCcw size={15} /> Reset
            </button>
          </div>

          <div className="space-y-7">
            <fieldset>
              <legend className="mb-3 text-sm font-bold">Script</legend>
              <div className="grid grid-cols-3 rounded-md bg-[var(--sakura-light)] p-1">
                {["hiragana", "katakana", "both"].map((option) => (
                  <button key={option} type="button" onClick={() => setScript(option as ScriptSelection)} className={`rounded-md px-2 py-2.5 text-sm font-semibold capitalize transition-colors ${script === option ? "bg-[var(--surface)] text-[var(--primary-fg)] shadow-sm" : "text-[var(--muted)]"}`}>{option}</button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-sm font-bold">Character sets</legend>
              <div className="grid gap-2 sm:grid-cols-4">
                {(["basic", "dakuten", "yoon", "extended"] as KanaGroup[]).map((group) => {
                  const disabled = group === "extended" && script === "hiragana";
                  const active = groups.includes(group);
                  const count = countCharacters({ script, rowKeys: groupRows[group].map((row) => row.key) });
                  const label = group === "yoon" ? "Yōon" : group[0].toUpperCase() + group.slice(1);
                  return <button key={group} type="button" disabled={disabled} onClick={() => toggleGroup(group)} className={`relative min-h-[82px] rounded-md border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${active && !disabled ? "border-[var(--primary)] bg-[var(--sakura-light)]" : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--sakura)]"}`}><span className="block font-bold">{label}</span><span className="mt-1 block text-xs text-[var(--muted)]">{disabled ? "Katakana only" : `${count} characters`}</span>{active && !disabled && <Check className="absolute right-3 top-3 text-[var(--primary-fg)]" size={16} />}</button>;
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-4 text-sm font-bold">Rows</legend>
              <div className="space-y-4">
                {(["basic","dakuten","yoon","extended"] as KanaGroup[]).filter((group) => groups.includes(group) && (script !== "hiragana" || group !== "extended")).map((group) => {
                  const rowsForGroup = groupRows[group];
                  const selectedForGroup = rowsForGroup.filter((row) => selectedRows.includes(row.key));
                  return <div key={group} className="rounded-md border border-[var(--line)] p-3">
                    <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[0.12em]">{group === "yoon" ? "Yōon" : group[0].toUpperCase() + group.slice(1)}</span><div className="flex gap-1 text-xs font-bold"><button type="button" onClick={() => setSelectedRows((current) => [...new Set([...current, ...rowsForGroup.map((row) => row.key)])])} className="rounded px-2 py-1 text-[var(--primary-fg)]">Select all</button><button type="button" onClick={() => setSelectedRows((current) => current.filter((key) => !rowsForGroup.some((row) => row.key === key)))} className="rounded px-2 py-1 text-[var(--muted)]">Clear</button></div></div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {rowsForGroup.map((row) => { const active = selectedRows.includes(row.key); const sample = script === "both" ? `${row.sample.hiragana} ${row.sample.katakana}` : row.sample[script]; return <button key={row.key} type="button" onClick={() => toggleRow(row.key)} aria-pressed={active} className={`flex min-h-[58px] items-center justify-between rounded-md border px-3 transition-colors ${active ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--sakura)]"}`}><span className="text-xs font-bold">{row.romajiLabel}</span><span className="font-japanese text-xl">{sample}</span></button>; })}
                    </div>
                    {selectedForGroup.length === 0 && <p className="mt-2 text-xs text-[var(--muted)]">No rows selected</p>}
                  </div>;
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-sm font-bold">Number of questions</legend>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setQuestionMode("all")} className={`rounded-md border px-3 py-3 text-left text-sm font-semibold ${questionMode === "all" ? "border-[var(--primary)] bg-[var(--sakura-light)]" : "border-[var(--line)]"}`}>All selected<span className="mt-0.5 block text-xs font-normal text-[var(--muted)]">Once each</span></button>
                <button type="button" onClick={() => setQuestionMode("custom")} className="rounded-md border border-[var(--line)] px-3 py-3 text-left text-sm font-semibold"><span>Custom</span><span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-[var(--muted)]"><input value={customCount} onChange={(event) => setCustomCount(Math.max(1, Math.min(characterCount, Number(event.target.value) || 1)))} onFocus={() => setQuestionMode("custom")} type="number" min={1} max={characterCount || 1} className="w-14 border-b border-[var(--line)] bg-transparent outline-none" />questions · max {characterCount}</span></button>
              </div>
            </fieldset>
          </div>
        </div>

        <aside className="rounded-lg border border-[var(--primary-hover)] bg-[var(--primary)] p-5 text-white sm:p-7 lg:sticky lg:bottom-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">Your selection</p>
          <div className="my-5 flex items-end justify-between border-b border-white/30 pb-5"><span className="font-japanese text-5xl leading-none">{characterCount}</span><span className="pb-1 text-sm text-white/80">characters</span></div>
          <div className="mb-5 flex items-center justify-between text-sm"><span className="text-white/80">Questions</span><span className="font-bold">{questionMode === "all" ? characterCount : customCount}</span></div>
          <button type="button" disabled={selectedRows.length === 0} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--surface)] text-sm font-bold text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-45" onClick={startPractice}>Start practice <ArrowRight size={17} /></button>
        </aside>
        </div>
      </section>
    </main>
  );
}
