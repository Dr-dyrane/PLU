"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LessonDestination } from "@/types/lesson";

export function LessonFinishActions({ next, onRetry, retryLabel = "Study again" }: {
  next: LessonDestination | null;
  onRetry: () => void;
  retryLabel?: string;
}) {
  const label = next ? (next.kind === "lesson" ? "Next lesson" : "Next study") : "Done";
  return <>
    <button type="button" className="secondaryAction" onClick={onRetry}>{retryLabel}</button>
    <Link className="primaryAction lessonNextAction" href={next?.href ?? "/"} aria-label={next ? `${label}: ${next.title}` : "Done"}>
      {label} <ArrowRight size={18} aria-hidden="true" />
    </Link>
  </>;
}
