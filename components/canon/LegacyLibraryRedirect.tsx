"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Keep previously shared home search/filter URLs pointing at the same collection. */
export function LegacyLibraryRedirect() {
  const router = useRouter();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (["q", "category", "sold", "learning"].some((key) => params.has(key))) {
      router.replace(`/library/?${params.toString()}`);
    }
  }, [router]);
  return null;
}
