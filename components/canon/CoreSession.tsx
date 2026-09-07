"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ProductIconProvider } from "@/components/canon/Icon";
import { PluLesson } from "@/components/canon/PluLesson";
import { completeCoreSession, CORE_SESSION_EVENT, CORE_SESSION_KEY, CORE_SESSION_LENGTH, parseCoreSession, sessionSignature } from "@/lib/trace/core-session";
import { productTheme } from "@/lib/ui/product-theme";
import type { CoreSessionPayload, CoreSessionProgress } from "@/types/session";
import type { ProductStory } from "@/types/trace";

type StorageState = "available" | "saved" | "unavailable";
type ActiveRun = { generation: number; signature: string; ids: string[]; progress: CoreSessionProgress; index: number; ready: boolean; advancedIndex: number };

export function CoreSession({ stories }: { stories: ProductStory[] }) {
  const items = useMemo(() => stories.map(story => ({ id: story.id, code: story.checkout.code })), [stories]);
  const ids = useMemo(() => items.map(item => item.id), [items]);
  const signature = sessionSignature(items);
  const validItems = items.length === CORE_SESSION_LENGTH && new Set(ids).size === CORE_SESSION_LENGTH && items.every(item => item.id && /^\d+$/.test(item.code));
  const [progress, setProgress] = useState<CoreSessionProgress | null>(null);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [finished, setFinished] = useState(false);
  const [storage, setStorage] = useState<StorageState>("available");
  const [run, setRun] = useState(0);
  const activeRun = useRef<ActiveRun | null>(null);
  const generation = useRef(0);
  const counter = useRef<HTMLParagraphElement>(null);
  const summaryHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const nextGeneration = ++generation.current;
    let restored: CoreSessionProgress | null = null;
    let nextStorage: StorageState = "available";
    try {
      restored = parseCoreSession(window.localStorage.getItem(CORE_SESSION_KEY), signature, ids);
      if (restored) nextStorage = "saved";
    } catch {
      nextStorage = "unavailable";
    }
    const nextProgress = restored ?? { completedIds: [], updatedAt: new Date().toISOString() };
    const nextIndex = Math.min(nextProgress.completedIds.length, CORE_SESSION_LENGTH - 1);
    activeRun.current = { generation: nextGeneration, signature, ids, progress: nextProgress, index: nextIndex, ready: validItems, advancedIndex: -1 };
    setProgress(nextProgress);
    setIndex(nextIndex);
    setFinished(nextProgress.completedIds.length === CORE_SESSION_LENGTH);
    setStorage(nextStorage);
    setRun(nextGeneration);
    setReady(true);
    return () => {
      if (activeRun.current) activeRun.current.ready = false;
    };
  }, [signature, ids, validItems]);

  useEffect(() => {
    if (!ready) return;
    if (finished) summaryHeading.current?.focus({ preventScroll: true });
    else counter.current?.focus({ preventScroll: true });
  }, [ready, index, finished, run]);

  const save = (next: CoreSessionProgress, currentSignature: string) => {
    try {
      const payload: CoreSessionPayload = { version: 1, signature: currentSignature, ...next };
      window.localStorage.setItem(CORE_SESSION_KEY, JSON.stringify(payload));
      setStorage("saved");
      window.dispatchEvent(new CustomEvent(CORE_SESSION_EVENT));
    } catch {
      setStorage("unavailable");
    }
  };

  const recordCompletion = (id: string) => {
    const current = activeRun.current;
    if (!current?.ready || current.generation !== run || current.signature !== signature || current.ids[current.index] !== id) return;
    const next = completeCoreSession(current.progress, current.ids, id, new Date().toISOString());
    if (next === current.progress) return;
    current.progress = next;
    setProgress(next);
    save(next, current.signature);
  };

  const advance = (id: string) => {
    const current = activeRun.current;
    if (!current?.ready || current.generation !== run || current.ids[current.index] !== id || current.progress.completedIds[current.index] !== id || current.advancedIndex === current.index) return;
    current.advancedIndex = current.index;
    if (current.index === CORE_SESSION_LENGTH - 1) {
      setFinished(true);
    } else {
      current.index += 1;
      setIndex(current.index);
    }
  };

  const startAgain = () => {
    const current = activeRun.current;
    if (!current?.ready || current.generation !== run || !finished) return;
    current.ready = false;
    const nextProgress = { completedIds: [], updatedAt: new Date().toISOString() };
    const nextGeneration = ++generation.current;
    activeRun.current = { generation: nextGeneration, signature, ids, progress: nextProgress, index: 0, ready: true, advancedIndex: -1 };
    setProgress(nextProgress);
    setIndex(0);
    setFinished(false);
    setRun(nextGeneration);
    save(nextProgress, signature);
  };

  const story = stories[index];
  const phase = !ready ? "loading" : !validItems ? "unavailable" : finished ? "summary" : "practice";
  const completedCount = progress?.completedIds.length ?? 0;

  return (
    <div className="coreSession" data-phase={phase}>
      <header className="coreSessionHeader">
        <Link className="coreSessionExit" href="/" aria-label="Exit session to Today"><ArrowLeft aria-hidden="true" /><span>Today</span></Link>
        <p ref={counter} className="coreSessionCounter" tabIndex={-1}><span>Core 25</span><strong>{finished ? "5 of 5 practised" : `Product ${index + 1} of 5`}</strong></p>
        <ol className="coreSessionDots" aria-label={`${completedCount} of 5 products practised`}>
          {stories.map((item, itemIndex) => <li key={item.id} data-state={itemIndex < completedCount ? "complete" : itemIndex === index ? "current" : "upcoming"}><span className="relationshipSrOnly">{itemIndex + 1}. {item.title}: {itemIndex < completedCount ? "practised" : itemIndex === index ? "current" : "up next"}</span></li>)}
        </ol>
      </header>

      {storage === "unavailable" && <p className="coreSessionStatus" role="status">Progress isn't saved on this device. Keep this page open.</p>}
      {!ready && <p className="coreSessionStatus" role="status">Opening your session…</p>}
      {ready && !validItems && <main className="coreSessionSummary"><h1>Session unavailable.</h1><Link className="primaryAction" href="/">Today <ArrowRight aria-hidden="true" /></Link></main>}

      {ready && validItems && !finished && story && <div className="coreSessionLesson productTheme lessonRouteShell" style={productTheme(story)}>
        <ProductIconProvider story={story}>
          <PluLesson
            key={`${run}:${story.id}`}
            story={story}
            onComplete={() => recordCompletion(story.id)}
            completionActions={<><Link className="secondaryAction" href="/">Pause</Link><button className="primaryAction" type="button" onClick={() => advance(story.id)}>{index === CORE_SESSION_LENGTH - 1 ? "Finish session" : "Next product"}<ArrowRight aria-hidden="true" /></button></>}
          />
        </ProductIconProvider>
      </div>}

      {ready && validItems && finished && <main className="coreSessionSummary" aria-labelledby="core-session-summary-title">
        <div className="coreSessionSummaryMark" aria-hidden="true"><Check /></div>
        <h1 ref={summaryHeading} id="core-session-summary-title" tabIndex={-1}>Five products practised.</h1>
        <ul className="coreSessionSummaryList">{stories.map(item => <li key={item.id}><Check aria-hidden="true" /><span>{item.title}</span><code>{item.checkout.code}</code></li>)}</ul>
        <div className="coreSessionSummaryActions"><button className="secondaryAction" type="button" onClick={startAgain}><RotateCcw aria-hidden="true" />Run again</button><Link className="primaryAction" href="/">Today <ArrowRight aria-hidden="true" /></Link></div>
      </main>}
    </div>
  );
}
