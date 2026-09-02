import { calculateNextReview } from "@/lib/scheduler";
import type { ProgressRecord, ReviewRating } from "@/types/plu";

const prefix = "plu-progress:v2:";

function keyFor(lessonId: string): string {
  return `${prefix}${lessonId}`;
}

export function readProgress(lessonId: string): ProgressRecord {
  if (typeof window === "undefined") {
    return { attempts: 0, correct: 0, misses: 0 };
  }

  try {
    const stored = window.localStorage.getItem(keyFor(lessonId));
    return stored
      ? (JSON.parse(stored) as ProgressRecord)
      : { attempts: 0, correct: 0, misses: 0 };
  } catch {
    return { attempts: 0, correct: 0, misses: 0 };
  }
}

function writeProgress(lessonId: string, record: ProgressRecord): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(keyFor(lessonId), JSON.stringify(record));
  } catch {
    // The learning session remains usable when browser storage is restricted.
  }
}

export function recordAttempt(lessonId: string, wasCorrect: boolean): void {
  const stored = readProgress(lessonId);
  writeProgress(lessonId, {
    ...stored,
    attempts: stored.attempts + 1,
    correct: stored.correct + (wasCorrect ? 1 : 0),
    misses: stored.misses + (wasCorrect ? 0 : 1),
    updatedAt: new Date().toISOString(),
  });
}

export function scheduleReview(
  lessonId: string,
  rating: ReviewRating,
): ProgressRecord {
  const stored = readProgress(lessonId);
  const next: ProgressRecord = {
    ...stored,
    lastRating: rating,
    nextReviewAt: calculateNextReview(rating).toISOString(),
    mastered: rating === "good" || rating === "easy",
    updatedAt: new Date().toISOString(),
  };

  writeProgress(lessonId, next);
  return next;
}

export function resetProgress(lessonId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(keyFor(lessonId));
  } catch {
    // Ignore restricted storage.
  }
}
