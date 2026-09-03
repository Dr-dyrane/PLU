"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function LessonRouteShell({ children }: { children?: ReactNode }) {
  const router = useRouter();

  const goBack = () => {
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (referrer?.origin === window.location.origin) {
        router.back();
        return;
      }
    } catch {
      // A direct visit simply falls back to Home.
    }
    router.push("/");
  };

  return (
    <div className="lessonRouteShell">
      <nav className="lessonRouteNav" aria-label="Lesson navigation">
        <button className="lessonBackButton" type="button" aria-label="Back to products" onClick={goBack}>
          <ArrowLeft aria-hidden="true" />
        </button>
        <Link className="lessonRouteBrand" href="/" aria-label="PLU home">
          <img src="/icon.svg" alt="" aria-hidden="true" />
          <span><strong>PLU</strong><small>See it. Know it. Ring it.</small></span>
        </Link>
      </nav>
      {children}
    </div>
  );
}
