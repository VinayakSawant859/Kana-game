"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, RotateCcw, Trophy } from "lucide-react";
import { GameLayout } from "@/lib/game-core/layout";
import { formatTime } from "@/lib/game-core/time";
import { getGameSession, saveGameSession } from "@/lib/game-core/storage";
import type { KanaSessionResult } from "@/lib/game/kana";
import { createKanaSession, type CardRecord, type StoredKanaSession } from "@/lib/game/session";
import { localStorageAdapter } from "@/lib/storage/kana";

type Filter = "All" | "Passed" | "Needs practice" | "Skipped" | "Not reached";

export default function KanaResultPage() {
  return <Suspense fallback={<main className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">Preparing results...</main>}><KanaResultContent /></Suspense>;
}

function KanaResultContent() {
  const router = useRouter();
  const params=useParams<{sessionId:string}>();
  const [filter,setFilter]=useState<Filter>("All");
  const [result,setResult]=useState<KanaSessionResult|null>(null);
  useEffect(() => {
    try {
      const saved = localStorageAdapter.getResult(params.sessionId);
      if (!saved || typeof saved !== "object") {
        router.replace("/games/kana");
        return;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult(saved as KanaSessionResult);
    } catch {
      router.replace("/games/kana");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.sessionId]);

  if (!result) return <main className="grid min-h-dvh place-items-center bg-[var(--bg)] text-[var(--muted)]">Preparing results...</main>;
  const cards=[...result.cards];
  cards.sort((left,right)=>{
    const leftNeeds=["skipped","unfinished"].includes(left.status)||left.mistakes>0;
    const rightNeeds=["skipped","unfinished"].includes(right.status)||right.mistakes>0;
    if(leftNeeds!==rightNeeds)return leftNeeds?-1:1;
    if(left.status=== "not-reached" && right.status!== "not-reached")return 1;
    if(right.status=== "not-reached" && left.status!== "not-reached")return -1;
    return right.mistakes-left.mistakes;
  });
  const total=result.cards.length;
  const first=result.cards.filter((card)=>card.status=== "correct-first-try").length;
  const retry=result.cards.filter((card)=>card.status=== "correct-after-retry").length;
  const skipped=result.cards.filter((card)=>card.status=== "skipped").length;
  const unfinished=result.cards.filter((card)=>card.status=== "unfinished").length;
  const notReached=result.cards.filter((card)=>card.status=== "not-reached").length;
  const attempted=first+retry+skipped+unfinished;
  const mistakes=result.cards.reduce((sum,card)=>sum+card.mistakes,0);
  const percentage=total ? Math.round(first/total*100) : 0;
  const time=formatTime(result.endedAt-result.startedAt);
  const weakIds=result.cards.filter((card)=>card.status=== "skipped"||card.status=== "unfinished"||card.mistakes>0).map((card)=>card.id);
  const correctOverall=first+retry;
  const filtered=cards.filter((card)=>filter === "All" || (filter === "Passed" && card.status.startsWith("correct")) || (filter === "Needs practice" && (["skipped","unfinished","pending"].includes(card.status)||card.mistakes>0)) || (filter === "Skipped" && card.status=== "skipped") || (filter === "Not reached" && card.status=== "not-reached"));
  function practice(options: { weak?: boolean }) {
    const stored = getGameSession<StoredKanaSession>("kana", params.sessionId);
    const settings = stored?.settings ?? (stored as unknown as { script: "hiragana" | "katakana" | "both"; rowKeys: string[]; questionCount: number | null }) ?? {
      script: "both" as const,
      rowKeys: [],
      questionCount: null,
    };
    const newSession = createKanaSession({
      script: settings.script,
      rowKeys: options.weak ? [] : settings.rowKeys,
      questionCount: options.weak ? null : settings.questionCount,
      characterIds: options.weak ? weakIds : undefined,
    });
    saveGameSession("kana", newSession.sessionId, newSession);
    router.push(`/games/kana/play/${newSession.sessionId}`);
  }
  function resultLabel(card:CardRecord) { if(card.status=== "correct-first-try")return"✓ Passed first try"; if(card.status=== "correct-after-retry")return"✓ Passed after retry"; if(card.status=== "skipped")return"Skipped"; if(card.status=== "unfinished")return"× Unfinished"; if(card.status=== "not-reached")return"— Not reached"; return"— Pending"; }

  return <GameLayout label="KANA" glyph="あ">
    <section className="mx-auto flex w-full max-w-5xl flex-1 items-center px-5 pb-6 sm:px-8 sm:pb-8"><div className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_18px_50px_rgba(208,16,76,.08)] sm:p-8"><div className="flex flex-col items-start justify-between gap-5 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-center"><div><p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Session complete</p><h1 className="text-2xl font-bold sm:text-3xl">Report card</h1></div><div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-full bg-[var(--sakura-light)] text-[var(--primary-fg)]"><Trophy size={22}/></div><div><div className="text-2xl font-bold">{first} / {total}</div><div className="text-xs text-[var(--muted)]">{percentage}% first try</div></div></div></div>
      <p className="py-3 text-sm font-bold text-[var(--muted)]">Correct overall (first try + retries): {correctOverall} · Attempted: {attempted} of {total}</p>
      <div className="mb-4 h-3 overflow-hidden rounded-full bg-[var(--line)]" aria-label="Result status progress"><div className="flex h-full"><span style={{width:`${total?first/total*100:0}%`}} className="bg-[var(--correct)]"/><span style={{width:`${total?retry/total*100:0}%`}} className="bg-[var(--sakura)]"/><span style={{width:`${total?skipped/total*100:0}%`}} className="bg-[var(--muted)]"/><span style={{width:`${total?unfinished/total*100:0}%`}} className="bg-[var(--wrong)]"/><span style={{width:`${total?notReached/total*100:0}%`}} className="bg-[var(--line)]"/></div></div>
      <div className="mb-4 flex flex-wrap gap-3 text-xs font-bold"><span>■ First try <b>{first}</b></span><span>■ Retries <b>{retry}</b></span><span>■ Skipped <b>{skipped}</b></span><span>■ Unfinished <b>{unfinished}</b></span><span>■ Not reached <b>{notReached}</b></span></div>
      <div className="grid grid-cols-2 gap-2 py-2 sm:grid-cols-3 lg:grid-cols-7">{[["Passed first try",first],["After retries",retry],["Skipped",skipped],["Unfinished",unfinished],["Not reached",notReached],["Mistakes",mistakes],["Time",time]].map(([label,value])=>{const key=String(label);return <div key={key} className="rounded-md border border-[var(--line)] bg-[var(--sakura-light)] px-3 py-3"><span className="block text-xs text-[var(--muted)]">{label}</span><span className="mt-1 block text-lg font-bold">{value}</span></div>})}</div>
      <div className="flex flex-wrap gap-2 border-b border-[var(--line)] pb-3">{(["All","Passed","Needs practice","Skipped","Not reached"] as Filter[]).map((tab)=>{const count=tab=== "All"?total:tab=== "Passed"?first+retry:tab=== "Skipped"?skipped:tab=== "Not reached"?notReached:cards.filter((card)=>["skipped","unfinished","pending"].includes(card.status)||card.mistakes>0).length;return <button key={tab} type="button" onClick={()=>setFilter(tab)} className={`rounded-md px-3 py-2 text-sm font-bold ${filter===tab?"bg-[var(--primary)] text-white":"secondary-button border"}`}>{tab} ({count})</button>})}</div>
      <div className="result-table mt-3 max-h-[50vh] overflow-auto"><div className="result-grid result-header sticky top-0 z-10 min-w-[620px] bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]"><span>Character</span><span>Romaji</span><span>Result</span><span className="text-center">Mistakes</span><span>What you typed</span></div>{filtered.map((card)=><div key={card.id} className="result-grid result-row min-w-[620px] border-b border-[var(--line)]"><span className="font-japanese text-2xl">{card.char}</span><span className="font-bold">{card.romaji.join(" / ")}</span><span className={`result-badge ${card.status=== "skipped"||card.status=== "pending"||card.status=== "not-reached"?"text-[var(--muted)]":card.status.startsWith("correct")?"text-[var(--correct)]":"text-[var(--wrong)]"}`}>{resultLabel(card)}</span><span className="text-center font-bold">{card.mistakes}</span><span className="flex flex-wrap gap-1">{card.wrongAnswers.length?card.wrongAnswers.map((answer,index)=><span key={`${answer}-${index}`} className="rounded-full bg-[var(--sakura-light)] px-2 py-1 text-xs">{answer}</span>):<span>—</span>}</span></div>)}</div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={()=>practice({weak:true})} disabled={weakIds.length===0} className="secondary-button flex h-12 flex-1 items-center justify-center gap-2 rounded-md border text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw size={17}/>Practice weak characters ({weakIds.length})</button><button type="button" onClick={()=>practice({})} className="primary-button flex h-12 flex-1 items-center justify-center gap-2 rounded-md text-sm font-bold">Play again <ArrowRight size={17}/></button><button type="button" onClick={()=>router.push("/games/kana")} className="secondary-button flex h-12 flex-1 items-center justify-center rounded-md border text-sm font-bold">Change settings</button></div>
    </div></section></GameLayout>;
}
