import type { ReferenceLessonData } from "@/types/reference";

/** Reference study never writes ready-lesson or relationship completion. */
export const REFERENCE_STUDY_EVENT = "plu:reference-change";
export const referenceStorageKey = (catalogId: string): string => `plu:reference:${catalogId}`;

export function referenceSignature(lesson: Pick<ReferenceLessonData, "catalogId" | "revision">): string {
  return JSON.stringify([lesson.catalogId, lesson.revision]);
}

export function isSavedReferenceStudy(raw: string | null, signature: string): boolean {
  try {
    const saved: unknown = raw ? JSON.parse(raw) : null;
    return Boolean(saved && typeof saved === "object" && "version" in saved && saved.version === 1 && "signature" in saved && saved.signature === signature && "completedAt" in saved && typeof saved.completedAt === "string" && Number.isFinite(Date.parse(saved.completedAt)));
  } catch {
    return false;
  }
}

/** Source flags win over the presence of digits. An uncertain code is never an answer. */
export function canRecallReferenceCode(lesson: Pick<ReferenceLessonData, "codeStatus" | "codes">): boolean {
  return lesson.codeStatus === "recorded" && lesson.codes.length === 1 && /^\d+$/.test(lesson.codes[0]);
}

export type ReferenceRecallResult =
  | { correct: true }
  | { correct: false; reason: "unverified" | "empty" | "malformed" | "wrong" };

export function validateReferenceCodeRecall(input: string, lesson: Pick<ReferenceLessonData, "codeStatus" | "codes">): ReferenceRecallResult {
  if (!canRecallReferenceCode(lesson)) return { correct: false, reason: "unverified" };
  const value = input.trim();
  if (!value) return { correct: false, reason: "empty" };
  if (!/^\d+$/.test(value)) return { correct: false, reason: "malformed" };
  return value === lesson.codes[0] ? { correct: true } : { correct: false, reason: "wrong" };
}

export interface ReferenceSourceChoice { id: string; text: string }

/** Recall the actual unresolved source note, not an invented product fact or code. */
export function referenceSourceChoices(lesson: Pick<ReferenceLessonData, "catalogId" | "sourceIssue">): ReferenceSourceChoice[] {
  const choices = [
    { id: "verified", text: "The exact checkout code and store identity are already confirmed." },
    { id: "source", text: lesson.sourceIssue },
    { id: "visual", text: "The picture is enough to establish its exact store variety and sale unit." },
  ];
  const offset = Array.from(lesson.catalogId).reduce((sum, char) => sum + char.charCodeAt(0), 0) % choices.length;
  return [...choices.slice(offset), ...choices.slice(0, offset)];
}
