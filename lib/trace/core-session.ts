import type { CoreSessionItem, CoreSessionProgress } from "@/types/session";

export const CORE_SESSION_KEY = "plu:session:core-25:v1";
export const CORE_SESSION_EVENT = "plu:session:core-25-change";
export const CORE_SESSION_LENGTH = 5;

export function sessionSignature(items: CoreSessionItem[]): string {
  return JSON.stringify([1, items.map(({ id, code }) => [id, code])]);
}

function validIds(ids: string[]): boolean {
  return ids.length === CORE_SESSION_LENGTH && new Set(ids).size === ids.length && ids.every(id => typeof id === "string" && id.length > 0);
}

function validPrefix(completedIds: unknown, ids: string[]): completedIds is string[] {
  return Array.isArray(completedIds) && completedIds.length <= ids.length && completedIds.every((id, index) => id === ids[index]);
}

function validTime(value: unknown, now: number): value is string {
  if (typeof value !== "string") return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && time <= now && new Date(time).toISOString() === value;
}

export function parseCoreSession(raw: string | null, signature: string, ids: string[], now = Date.now()): CoreSessionProgress | null {
  if (!raw || !signature || !validIds(ids)) return null;
  try {
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return null;
    if (Object.keys(saved).length !== 4 || !("version" in saved) || saved.version !== 1 || !("signature" in saved) || saved.signature !== signature || !("completedIds" in saved) || !validPrefix(saved.completedIds, ids) || !("updatedAt" in saved) || !validTime(saved.updatedAt, now)) return null;
    return { completedIds: [...saved.completedIds], updatedAt: saved.updatedAt };
  } catch {
    return null;
  }
}

/** Accept only the next exact item. Duplicate or out-of-order callbacks are no-ops. */
export function completeCoreSession(progress: CoreSessionProgress, ids: string[], id: string, updatedAt: string, now = Date.now()): CoreSessionProgress {
  if (!validIds(ids) || !validPrefix(progress.completedIds, ids) || !validTime(progress.updatedAt, now) || ids[progress.completedIds.length] !== id || !validTime(updatedAt, now) || Date.parse(updatedAt) < Date.parse(progress.updatedAt)) return progress;
  return { completedIds: [...progress.completedIds, id], updatedAt };
}
