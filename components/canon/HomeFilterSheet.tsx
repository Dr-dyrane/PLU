"use client";

import { useEffect, useRef } from "react";
import {
  Check,
  CircleDot,
  Clock3,
  Layers3,
  RotateCcw,
  Scale,
  Sparkles,
  X,
} from "lucide-react";

export type SoldFilter = "all" | "weight" | "each";
export type LearningFilter = "all" | "ready" | "learned" | "queued";

const soldOptions: Array<{
  value: SoldFilter;
  label: string;
  detail: string;
  icon: typeof Scale;
}> = [
  { value: "all", label: "Any sale type", detail: "Weight and each", icon: Layers3 },
  { value: "weight", label: "By weight", detail: "Placed on the scale", icon: Scale },
  { value: "each", label: "Each", detail: "Counted one at a time", icon: CircleDot },
];

const learningOptions: Array<{
  value: LearningFilter;
  label: string;
  detail: string;
  icon: typeof Sparkles;
}> = [
  { value: "all", label: "All lessons", detail: "Ready and coming next", icon: Layers3 },
  { value: "ready", label: "Ready to learn", detail: "Available, not completed", icon: Sparkles },
  { value: "learned", label: "Learned", detail: "Completed on this device", icon: Check },
  { value: "queued", label: "Coming next", detail: "Locked into Core 25", icon: Clock3 },
];

export function HomeFilterSheet({
  open,
  sold,
  learning,
  onSold,
  onLearning,
  onClear,
  onClose,
}: {
  open: boolean;
  sold: SoldFilter;
  learning: LearningFilter;
  onSold: (value: SoldFilter) => void;
  onLearning: (value: LearningFilter) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = [...sheetRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.offsetParent !== null);

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
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  const hasFilters = sold !== "all" || learning !== "all";

  return (
    <div className="homeFilterOverlay">
      <button
        className="homeFilterBackdrop"
        type="button"
        aria-label="Close filters"
        onClick={onClose}
      />
      <section
        className="homeFilterSheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="homeFilterTitle"
        tabIndex={-1}
      >
        <div className="homeFilterHandle" aria-hidden="true" />
        <header className="homeFilterHeader">
          <div>
            <small>Find the right lesson</small>
            <h2 id="homeFilterTitle">Filters</h2>
          </div>
          <button
            ref={closeRef}
            className="homeFilterClose"
            type="button"
            aria-label="Close filters"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="homeFilterBody">
          <fieldset className="homeFilterGroup">
            <legend>How it is sold</legend>
            <div className="homeFilterOptions">
              {soldOptions.map((option) => {
                const Glyph = option.icon;
                const active = sold === option.value;
                return (
                  <button
                    className={`homeFilterOption${active ? " active" : ""}`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSold(option.value)}
                    key={option.value}
                  >
                    <span className="homeFilterOptionIcon"><Glyph aria-hidden="true" /></span>
                    <span><b>{option.label}</b><small>{option.detail}</small></span>
                    <i aria-hidden="true">{active && <Check />}</i>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="homeFilterGroup">
            <legend>Learning</legend>
            <div className="homeFilterOptions">
              {learningOptions.map((option) => {
                const Glyph = option.icon;
                const active = learning === option.value;
                return (
                  <button
                    className={`homeFilterOption${active ? " active" : ""}`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onLearning(option.value)}
                    key={option.value}
                  >
                    <span className="homeFilterOptionIcon"><Glyph aria-hidden="true" /></span>
                    <span><b>{option.label}</b><small>{option.detail}</small></span>
                    <i aria-hidden="true">{active && <Check />}</i>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <footer className="homeFilterFooter">
          <button
            className="homeFilterReset"
            type="button"
            disabled={!hasFilters}
            onClick={onClear}
          >
            <RotateCcw aria-hidden="true" /> Clear
          </button>
          <button className="homeFilterDone" type="button" onClick={onClose}>Done</button>
        </footer>
      </section>
    </div>
  );
}
