"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { libraryReturnPath } from "@/lib/trace/library-navigation";
import type { LessonDestination } from "@/types/lesson";

export function LessonFinishActions({ next, onRetry, retryLabel = "Study again" }: {
  next: LessonDestination | null;
  onRetry: () => void;
  retryLabel?: string;
}) {
  const [returnTo, setReturnTo] = useState<string | null>(null);
  useEffect(() => { setReturnTo(libraryReturnPath(window.location.search)); }, []);
  const label = next ? (next.kind === "lesson" ? "Next lesson" : "Next study") : "Done";
  const href = next ? `${next.href}${returnTo ? `?${new URLSearchParams({ returnTo })}` : ""}` : returnTo ?? "/library/";
  return <>
    <button type="button" className="secondaryAction" onClick={onRetry}>{retryLabel}</button>
    <Link className="primaryAction lessonNextAction" href={href} aria-label={next ? `${label}: ${next.title}` : "Done"}>
      {label} <ArrowRight size={18} aria-hidden="true" />
    </Link>
  </>;
}
