"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { Icon } from "@/components/canon/Icon";
import type { RelationshipLessonData } from "@/types/relationship";

type SheetTab = "listing" | "related" | "sources";
const tabs: SheetTab[] = ["listing", "related", "sources"];
const tabLabels: Record<SheetTab, string> = { listing: "Listing", related: "Related", sources: "Sources" };

function pagesLabel(pages: number[]) {
  return pages.length ? `${pages.length === 1 ? "Page" : "Pages"} ${pages.join(", ")}` : "Page not recorded";
}

function saleLabel(soldBy: RelationshipLessonData["soldBy"]) {
  return soldBy === "Weight" ? "By weight" : soldBy === "Each" ? "Each" : "Sale unit not recorded";
}

function distinctNotes(notes: string[]) {
  const unique = [...new Set(notes.filter(Boolean))];
  return unique.filter((note) => !unique.some((other) => other !== note && other.includes(note)));
}

function RecordedCodes({ codes }: { codes: string[] }) {
  return <div className="relationshipCodes" role="group" aria-label="Complete recorded code set">{codes.map((code) => <code key={code}>{code}</code>)}</div>;
}

export function RelationshipSheet({ lesson, open, onClose }: {
  lesson: RelationshipLessonData;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<SheetTab>("listing");
  const [dragOffset, setDragOffset] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  const id = useId();
  const neighbors = lesson.members.filter((member) => member.catalogId !== lesson.catalogId);
  const listingNotes = distinctNotes([lesson.visualCue, lesson.qualifierNote, lesson.checkoutCaveat]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setTab("listing");
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
    <dialog ref={dialogRef} className="relationshipDetailsDialog" aria-labelledby={`${id}-item ${id}-title`} onClose={() => { dragStart.current = null; setDragOffset(0); onClose(); }}>
      <div className="sheetOverlay">
        <button className="sheetBackdrop" type="button" tabIndex={-1} aria-label="Close listing details" onClick={close} />
        <section className="sheet relationshipDetailsSheet" style={dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined}>
          <div
            className="sheetHandle"
            aria-hidden="true"
            onPointerDown={(event) => { dragStart.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); }}
            onPointerMove={(event) => { if (dragStart.current !== null) setDragOffset(Math.min(180, Math.max(0, event.clientY - dragStart.current))); }}
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
            <button ref={closeRef} className="closeButton" type="button" aria-label="Close listing details" onClick={close}><Icon name="close" /></button>
          </header>
          <nav className="sheetTabs" role="tablist" aria-label="Listing details">
            {tabs.map((item, index) => <button
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
            >{tabLabels[item]}</button>)}
          </nav>
          <div ref={bodyRef} className="sheetBody" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tab}`} tabIndex={0}>
            <div className="storyCards">
              {tab === "listing" && <>
                <article className="storyCard">
                  <span className="storyIcon"><Icon name="bookmark" /></span>
                  <div><b>{pagesLabel(lesson.sourcePages)} · {saleLabel(lesson.soldBy)}</b><RecordedCodes codes={lesson.codes} /></div>
                </article>
                {listingNotes.map((note) => <article className="storyCard" key={note}><span className="storyIcon"><Icon name="bookmark" /></span><span><small>{note}</small></span></article>)}
              </>}
              {tab === "related" && <>
                <p className="relationshipSheetNote">Related labels are not interchangeable. Check the store listing before use.</p>
                <article className="storyCard primary">
                  <span className="storyIcon"><Icon name="bookmark" /></span>
                  <div><b>This listing</b><small>{lesson.title}</small><small>{pagesLabel(lesson.sourcePages)} · {saleLabel(lesson.soldBy)}</small><RecordedCodes codes={lesson.codes} /></div>
                </article>
                {neighbors.map((member) => <article className="storyCard" key={member.catalogId}>
                  <span className="storyIcon"><Icon name="bookmark" /></span>
                  <div>
                    <b>{member.item}</b>
                    <small>{pagesLabel(member.sourcePages)} · {saleLabel(member.soldBy)}</small>
                    <small>{member.status === "queued" ? "Unconfirmed" : member.status === "mapped" ? "Check in store" : "Recorded listing"}</small>
                    <RecordedCodes codes={member.codes} />
                    {member.flags.length > 0 && <small>Notes: {member.flags.map((flag) => flag.replaceAll("-", " ")).join("; ")}</small>}
                  </div>
                </article>)}
              </>}
              {tab === "sources" && <>
                <article className="storyCard"><span className="storyIcon"><Icon name="bookmark" /></span><span><b>{pagesLabel(lesson.sourcePages)}</b><small>{lesson.reviewBasis}</small></span></article>
                <article className="storyCard">
                  <span className="storyIcon"><Icon name="bookmark" /></span>
                  <span><b>Reference photo</b><small>{lesson.photo.source.author}</small><small>{lesson.photo.source.license}</small><small><a href={lesson.photo.source.url} target="_blank" rel="noopener noreferrer">{lesson.photo.source.label} <span aria-hidden="true">↗</span><span className="relationshipSrOnly"> (opens a new tab)</span></a></small></span>
                </article>
              </>}
            </div>
          </div>
        </section>
      </div>
    </dialog>
  );
}
