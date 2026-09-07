"use client";

import Link from "next/link";
import { ArrowRight, Check, ImageOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ReviewedPhoto } from "@/components/canon/ReviewedPhoto";
import { CORE_SESSION_EVENT, CORE_SESSION_KEY, parseCoreSession } from "@/lib/trace/core-session";
import type { BatchStorySummary } from "@/types/batch";

type TodayItem = Pick<BatchStorySummary, "id" | "title" | "shortTitle" | "hero">;
type SessionProgress = { status: "checking" | "available" | "unavailable"; completedIds: string[] };

export function TodayHome({ items, signature }: { items: TodayItem[]; signature: string }) {
  const [progress, setProgress] = useState<SessionProgress>({ status: "checking", completedIds: [] });
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const ids = useMemo(() => items.map((item) => item.id), [items]);

  useEffect(() => {
    const readProgress = () => {
      try {
        const saved = parseCoreSession(window.localStorage.getItem(CORE_SESSION_KEY), signature, ids);
        setProgress({ status: "available", completedIds: saved?.completedIds ?? [] });
      } catch {
        setProgress({ status: "unavailable", completedIds: [] });
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === CORE_SESSION_KEY || event.key === null) readProgress();
    };
    readProgress();
    window.addEventListener("pageshow", readProgress);
    window.addEventListener("focus", readProgress);
    window.addEventListener("storage", onStorage);
    window.addEventListener(CORE_SESSION_EVENT, readProgress);
    return () => {
      window.removeEventListener("pageshow", readProgress);
      window.removeEventListener("focus", readProgress);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CORE_SESSION_EVENT, readProgress);
    };
  }, [ids, signature]);

  const completed = progress.completedIds.length;
  const checking = progress.status === "checking";
  const actionLabel = checking ? "Open session" : completed === items.length ? "View session" : completed > 0 ? "Continue session" : "Start session";

  return (
    <main className="todayPage">
      <header className="todayIntro">
        <h1>A little practice.<br /><span>A sharper eye.</span></h1>
        <p className="todayDescription">Look closely. Recall the code.</p>
      </header>

      <section className="todaySession" aria-labelledby="today-session-title">
        <div className="todaySessionHeading">
          <div><p className="todayEyebrow">Core 25</p><h2 id="today-session-title">Everyday essentials.</h2></div>
        </div>

        <ol className="todayShelf" aria-label="Products in this session">
          {items.map((item) => {
            const practised = progress.completedIds.includes(item.id);
            return <li key={item.id} className={practised ? "todayProduct isPractised" : "todayProduct"}>
              <figure>
                <div className="todayProductImage">
                  {failedImages.has(item.id) ? <div className="todayPhotoUnavailable"><ImageOff aria-hidden="true" /><span>Photo unavailable</span></div> : <ReviewedPhoto photo={item.hero} alt="" aria-hidden="true" loading="eager" decoding="async" className="todayPhoto" style={{ objectPosition: item.hero.focus ?? "50% 50%" }} onError={() => setFailedImages((current) => new Set(current).add(item.id))} />}
                  {practised && <span className="todayProductCheck"><Check aria-hidden="true" /><span className="todaySrOnly">Practised</span></span>}
                </div>
                <figcaption title={item.title}>{item.shortTitle || item.title}</figcaption>
              </figure>
            </li>;
          })}
        </ol>

        <div className="todaySessionBottom">
          <div className="todayProgress" role="status" aria-live="polite">
            <span>{checking ? "Checking session progress…" : progress.status === "unavailable" ? "Ready when you are" : <><strong>{completed}/{items.length}</strong> practised</>}</span>
            <div className="todayProgressTrack" aria-hidden="true">{items.map((item) => <i key={item.id} className={progress.completedIds.includes(item.id) ? "isComplete" : ""} />)}</div>
          </div>
          <Link className="todayStart" href="/session/core-25/">{actionLabel}<ArrowRight aria-hidden="true" /></Link>
        </div>
        {progress.status === "unavailable" && <p className="todayStorageNote" role="status">You can still practise. This browser cannot save your session progress.</p>}
      </section>
    </main>
  );
}
