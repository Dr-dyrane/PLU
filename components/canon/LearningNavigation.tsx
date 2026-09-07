"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Sun } from "lucide-react";

export function LearningNavigation() {
  const active = usePathname().startsWith("/library") ? "library" : "today";
  return <nav className="learningNavigation" aria-label="Main navigation">
    <Link href="/" aria-current={active === "today" ? "page" : undefined}><Sun aria-hidden="true" />Today</Link>
    <Link href="/library/" aria-current={active === "library" ? "page" : undefined}><BookOpen aria-hidden="true" />Library</Link>
  </nav>;
}
