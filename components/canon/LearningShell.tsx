"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { HomeFooter } from "@/components/canon/HomeFooter";
import { LearningNavigation } from "@/components/canon/LearningNavigation";

/** Shared route layout: navigation stays mounted while only the content changes. */
export function LearningShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [pathname]);

  return (
    <div className="learningApp">
      <header className="learningHeader">
        <Link className="batchBrand" href="/" aria-label="PLU home">
          <img src="/icon.svg" alt="" aria-hidden="true" />
          <span><strong>PLU</strong><small>See it. Know it. Ring it.</small></span>
        </Link>
        <LearningNavigation />
      </header>
      <div className="learningContent" ref={contentRef}>{children}</div>
      <HomeFooter />
    </div>
  );
}
