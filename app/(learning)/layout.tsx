import type { ReactNode } from "react";
import { LearningShell } from "@/components/canon/LearningShell";

export default function LearningLayout({ children }: { children: ReactNode }) {
  return <LearningShell>{children}</LearningShell>;
}
