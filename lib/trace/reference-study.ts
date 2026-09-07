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

export const referenceCodeLabels = {
  recorded: "Code recorded",
  missing: "Code missing",
  conflicted: "Codes conflict",
  uncertain: "Source unclear",
} as const;

export const referenceCodeHints = {
  recorded: "Check the store listing before use.",
  missing: "No code is recorded for this item.",
  conflicted: "The recorded numbers need checking.",
  uncertain: "The original source needs checking.",
} as const;

/** Presentation only: complete wording and limitations remain in the item sheet. */
export function referenceVisualCue(lesson: Pick<ReferenceLessonData, "catalogId" | "visualCue">): string {
  const concise: Record<string, string> = {
    "durian-frozen": "Pale durian flesh with a hint of frost.",
    "cabbage-sour": "A whole head with pale-olive leaves.",
    "mangos-spice": "Yellow-orange skin with a green patch.",
    "pumpkins-jamaican": "Broad ribs, green skin, orange flesh.",
  };
  const cue = concise[lesson.catalogId] ?? lesson.visualCue
    .replace(/^Illustrated reference form: /, "")
    .replace(/^AI-generated teaching illustration of /, "")
    .split(";")[0];
  return cue.charAt(0).toUpperCase() + cue.slice(1).replace(/\.?$/, ".");
}

export interface ReferenceSourceChoice { id: string; text: string; status: "missing" | "conflicted" | "uncertain" }

/** Recall the source's existing uncertainty category, never guess a code. */
export function referenceSourceChoices(lesson: Pick<ReferenceLessonData, "catalogId" | "codeStatus">): ReferenceSourceChoice[] {
  const choices = (["missing", "conflicted", "uncertain"] as const).map(status => ({
    id: status === lesson.codeStatus ? "source" : status,
    status,
    text: referenceCodeLabels[status],
  }));
  const offset = Array.from(lesson.catalogId).reduce((sum, char) => sum + char.charCodeAt(0), 0) % choices.length;
  return [...choices.slice(offset), ...choices.slice(0, offset)];
}
