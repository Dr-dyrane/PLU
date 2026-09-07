"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { Icon, itemIconName } from "@/components/canon/Icon";
import type { ReferenceLessonData } from "@/types/reference";

type SheetTab = "item" | "code" | "sources";
const tabs: SheetTab[] = ["item", "code", "sources"];
const tabLabels: Record<SheetTab, string> = { item: "Item", code: "Code", sources: "Sources" };

function distinctNotes(notes: string[]): string[] {
  const unique = [...new Set(notes.filter(Boolean))];
  return unique.filter((note) => !unique.some((other) => other !== note && other.includes(note)));
}

export function ReferenceSheet({ lesson, open, onClose }: {
  lesson: ReferenceLessonData;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<SheetTab>("item");
  const [dragOffset, setDragOffset] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  const id = useId();
  const illustrated = lesson.media.kind === "generated-illustration";
  const recorded = lesson.codeStatus === "recorded";
  const pages = lesson.sourcePages.length
    ? `${lesson.sourcePages.length === 1 ? "Page" : "Pages"} ${lesson.sourcePages.join(", ")}`
    : "Page not recorded";
  const saleUnit = lesson.soldBy === "Weight" ? "By weight" : lesson.soldBy === "Each" ? "Each" : "Sale unit not recorded";
  const itemNotes = distinctNotes([lesson.visualCue, lesson.identityNote, lesson.media.claimBoundary]);
  const codeNotes = distinctNotes([lesson.sourceIssue, lesson.checkoutCaveat]);
  const seenUrls = new Set(lesson.media.licenseUrl ? [lesson.media.licenseUrl] : []);
  const sources = [
    { title: illustrated ? "Illustration details" : "Image source", url: lesson.media.sourceUrl },
    ...lesson.evidenceSources,
  ].filter(({ url }) => {
    if (seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setTab("item");
      setDragOffset(0);
      dialog.showModal();
      closeRef.current?.focus({ preventScroll: true });
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => { bodyRef.current?.scrollTo({ top: 0 }); }, [tab, open]);

  const close = () => dialogRef.current?.close();
  const switchTab = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === "ArrowRight" ? (index + 1) % tabs.length
      : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length
        : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    setTab(tabs[next]);
    tabRefs.current[next]?.focus();
  };

  return (
    <dialog
      ref={dialogRef}
      className="referenceDetailsDialog"
      aria-labelledby={`${id}-item ${id}-title`}
      onClose={() => {
        dragStart.current = null;
        setDragOffset(0);
        onClose();
      }}
    >
      <div className="sheetOverlay">
        <button className="sheetBackdrop" type="button" tabIndex={-1} aria-label="Close item details" onClick={close} />
        <section className="sheet referenceDetailsSheet" style={dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined}>
          <div
            className="sheetHandle"
            aria-hidden="true"
            onPointerDown={(event) => {
              dragStart.current = event.clientY;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (dragStart.current !== null) setDragOffset(Math.min(180, Math.max(0, event.clientY - dragStart.current)));
            }}
            onPointerUp={(event) => {
              if (dragStart.current === null) return;
              const distance = event.clientY - dragStart.current;
              dragStart.current = null;
              setDragOffset(0);
              if (distance > 80) close();
            }}
            onPointerCancel={() => { dragStart.current = null; setDragOffset(0); }}
          />
          <header className="sheetHeader">
            <div><small id={`${id}-item`}>{lesson.title}</small><h2 id={`${id}-title`}>{tabLabels[tab]}</h2></div>
            <button ref={closeRef} className="closeButton" type="button" aria-label="Close item details" onClick={close}><Icon name="close" /></button>
          </header>
          <nav className="sheetTabs" role="tablist" aria-label="Item details">
            {tabs.map((item, index) => (
              <button
                key={item}
                ref={(element) => { tabRefs.current[index] = element; }}
                id={`${id}-tab-${item}`}
                type="button"
                role="tab"
                className={tab === item ? "active" : ""}
                aria-selected={tab === item}
                aria-controls={`${id}-panel`}
                tabIndex={tab === item ? 0 : -1}
                onClick={() => setTab(item)}
                onKeyDown={(event) => switchTab(event, index)}
              >{tabLabels[item]}</button>
            ))}
          </nav>
          <div ref={bodyRef} className="sheetBody" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tab}`} tabIndex={0}>
            <div className="storyCards">
              {tab === "item" && <>
                <article className="storyCard">
                  <span className="storyIcon"><Icon name={itemIconName(lesson.family)} /></span>
                  <span><b>{lesson.family}</b><small>{pages} · {saleUnit}</small></span>
                </article>
                <article className="storyCard">
                  <span className="storyIcon"><Icon name="bookmark" /></span>
                  <span><b>{illustrated ? "AI illustration" : "Reference photograph"}</b>{itemNotes.map((note) => <small key={note}>{note}</small>)}</span>
                </article>
              </>}
              {tab === "code" && <>
                <article className="storyCard">
                  <span className="storyIcon"><Icon name="bookmark" /></span>
                  <span><b>{recorded ? "Recorded code" : "Unconfirmed"}</b><small>{pages}</small><small className="referenceRawCode">{lesson.sourceCodeText || "No code recorded"}</small></span>
                </article>
                {codeNotes.map((note) => <article className="storyCard" key={note}><span className="storyIcon"><Icon name="bookmark" /></span><span><small>{note}</small></span></article>)}
              </>}
              {tab === "sources" && <>
                <article className="storyCard">
                  <span className="storyIcon"><Icon name="bookmark" /></span>
                  <span>
                    <b>{illustrated ? "AI illustration" : "Reference photograph"}</b>
                    <small>{lesson.media.author}</small>
                    <small>{lesson.media.licenseUrl ? <a href={lesson.media.licenseUrl} target="_blank" rel="noopener noreferrer">{lesson.media.license}<span className="relationshipSrOnly"> (opens a new tab)</span></a> : lesson.media.license}</small>
                  </span>
                </article>
                {sources.map((source) => <article className="storyCard" key={source.url}><span className="storyIcon"><Icon name="bookmark" /></span><span><b><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} <span aria-hidden="true">↗</span><span className="relationshipSrOnly"> (opens a new tab)</span></a></b></span></article>)}
              </>}
            </div>
          </div>
        </section>
      </div>
    </dialog>
  );
}
