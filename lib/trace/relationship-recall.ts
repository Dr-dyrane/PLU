import type { RelationshipLessonData } from "@/types/relationship";

export function relationshipSignature(lesson: Pick<RelationshipLessonData, "catalogId" | "title" | "codes" | "sourcePages" | "soldBy" | "relationKind">): string {
  return JSON.stringify([lesson.catalogId, lesson.title, [...lesson.codes].sort(), lesson.sourcePages, lesson.soldBy, lesson.relationKind]);
}

export function isSavedRelationshipStudy(raw: string | null, signature: string): boolean {
  try {
    const saved: unknown = raw ? JSON.parse(raw) : null;
    return Boolean(saved && typeof saved === "object" && "version" in saved && saved.version === 1 && "signature" in saved && saved.signature === signature && "completedAt" in saved && typeof saved.completedAt === "string" && Number.isFinite(Date.parse(saved.completedAt)));
  } catch { return false; }
}

export type ParsedRelationshipCodes =
  | { valid: true; codes: string[] }
  | { valid: false; reason: "empty" | "malformed" | "duplicate" };

/** Codes are identifiers: keep leading zeros, and never silently discard duplicates. */
export function parseRelationshipCodes(input: string): ParsedRelationshipCodes {
  const value = input.trim();
  if (!value) return { valid: false, reason: "empty" };
  if (!/^\d+(?:(?:\s*,\s*|\s+)\d+)*$/.test(value)) {
    return { valid: false, reason: "malformed" };
  }
  const codes = value.split(/[\s,]+/);
  if (new Set(codes).size !== codes.length) return { valid: false, reason: "duplicate" };
  return { valid: true, codes };
}

export type RelationshipRecallResult =
  | { correct: true }
  | { correct: false; reason: "empty" | "malformed" | "duplicate" | "incomplete" | "wrong" | "invalid-target" };

/** The COMPLETE target-row set is required; no member or synthetic primary is accepted. */
export function validateRelationshipRecall(input: string, expectedCodes: readonly string[]): RelationshipRecallResult {
  if (!expectedCodes.length || expectedCodes.some((code) => !/^\d+$/.test(code)) || new Set(expectedCodes).size !== expectedCodes.length) {
    return { correct: false, reason: "invalid-target" };
  }
  const parsed = parseRelationshipCodes(input);
  if (!parsed.valid) return { correct: false, reason: parsed.reason };
  const expected = new Set(expectedCodes);
  if (parsed.codes.some((code) => !expected.has(code))) return { correct: false, reason: "wrong" };
  if (parsed.codes.length !== expected.size) return { correct: false, reason: "incomplete" };
  return { correct: true };
}
