import type { LessonDestination } from "@/types/lesson";

/** Follow catalog order once; finishing a sequence never loops or marks it learned. */
export function buildLessonSequence(destinations: LessonDestination[]) {
  const nextByHref = new Map<string, LessonDestination | null>();
  destinations.forEach((destination, index) => {
    if (nextByHref.has(destination.href)) throw new Error(`Duplicate lesson route: ${destination.href}`);
    nextByHref.set(destination.href, destinations[index + 1] ?? null);
  });
  return nextByHref;
}
