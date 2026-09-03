"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/canon/Icon";
import type { ProductStory } from "@/types/trace";

type SheetTab = "spot" | "checkout" | "similar";

export function ProductSheet({
  story,
  tab,
  open,
  onTab,
  onClose,
}: {
  story: ProductStory;
  tab: SheetTab;
  open: boolean;
  onTab: (tab: SheetTab) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const dragStart = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = [...sheetRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')]
        .filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const title = tab === "spot" ? "Know this item" : tab === "checkout" ? "Choose the right listing" : "Tell them apart";
  const similar = story.similarItems?.length ? story.similarItems : [story.nearestConfusion];

  return (
    <div className="sheetOverlay">
      <button className="sheetBackdrop" type="button" aria-label="Close product story" onClick={onClose} />
      <section
        className="sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheetTitle"
        tabIndex={-1}
        style={dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined}
      >
        <div
          className="sheetHandle"
          aria-hidden="true"
          onPointerDown={(event) => {
            dragStart.current = event.clientY;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (dragStart.current === null) return;
            setDragOffset(Math.min(180, Math.max(0, event.clientY - dragStart.current)));
          }}
          onPointerUp={(event) => {
            if (dragStart.current === null) return;
            const distance = event.clientY - dragStart.current;
            dragStart.current = null;
            if (distance > 80) onClose();
            setDragOffset(0);
          }}
        />
        <header className="sheetHeader">
          <div><small>{story.title}</small><h2 id="sheetTitle">{title}</h2></div>
          <button ref={closeRef} className="closeButton" type="button" aria-label="Close product story" onClick={onClose}><Icon name="close" /></button>
        </header>
        <nav className="sheetTabs" role="tablist" aria-label={`${story.title} details`}>
          {(["spot", "checkout", "similar"] as SheetTab[]).map((item) => (
            <button
              type="button"
              role="tab"
              className={tab === item ? "active" : ""}
              aria-selected={tab === item}
              onClick={() => onTab(item)}
              key={item}
            >
              {item === "spot" ? "Spot it" : item === "checkout" ? "At checkout" : "Similar"}
            </button>
          ))}
        </nav>
        <div className="sheetBody">
          {tab === "spot" && (
            <div className="storyCards">
              <article className="storyCard"><span className="storyIcon"><Icon name="bell" /></span><span><b>{story.identity.form}-shaped</b><small>{story.visualCues[0]}</small></span></article>
              <article className="storyCard"><span className="storyIcon"><Icon name="color" /></span><span><b>{story.identity.color}</b><small>{story.visualCues[1]}</small></span></article>
              <article className="storyCard"><span className="storyIcon"><Icon name="loose" /></span><span><b>{story.checkout.saleForm} produce</b><small>{story.checkout.soldBy === "Weight" ? "Place it on the scale" : "Count one item"}</small></span></article>
            </div>
          )}
          {tab === "checkout" && (
            <div className="storyCards">
              {story.retailVariants.map((variant) => (
                <article className={`storyCard${variant.scope === "primary" ? " primary" : ""}`} key={variant.id}>
                  <span className="storyIcon"><Icon name={variant.scope === "package" || variant.scope === "case" ? "bag" : variant.scope === "primary" ? "scale" : "loose"} /></span>
                  <span><b>{variant.name}</b><small>{variant.scope === "primary" ? (variant.soldBy === "Weight" ? "Place it on the scale" : "Count one item") : variant.note}</small></span>
                  <strong className="storyCode">{variant.code}</strong>
                </article>
              ))}
            </div>
          )}
          {tab === "similar" && (
            <div className="storyCards">
              {similar.map((item, index) => (
                <article className="storyCard" key={`${item.name}-${item.code}`}>
                  <span className="storyIcon"><i className="pepperDot" style={{ background: item.color ?? ["#df4f4b", "#e2c83f", "#8bb64a"][index % 3] }} /></span>
                  <span><b>{item.name}</b><small>{item.cue}</small></span>
                  <strong className="storyCode">{item.code}</strong>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
