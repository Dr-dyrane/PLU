import { catalog475, catalog475ReadyItems } from "@/data/batches";
import { referenceByCatalogId } from "@/data/references";
import { relationshipByCatalogId } from "@/data/relationships";
import { buildLessonSequence } from "@/lib/trace/lesson-sequence";
import type { LessonDestination } from "@/types/lesson";

// Keep code lessons, relationship studies, and reference studies independent.
// Full catalog/story data stays on the server; routes pass one destination only.
const codeLessons: LessonDestination[] = catalog475ReadyItems.map(({ story }) => ({
  href: `/learn/${story.id}/`, title: story.title, kind: "lesson",
}));
const relationshipStudies: LessonDestination[] = catalog475.items.flatMap(({ catalogId }) => {
  const lesson = relationshipByCatalogId.get(catalogId);
  return lesson ? [{ href: `/relationships/${catalogId}/`, title: lesson.title, kind: "study" as const }] : [];
});
const referenceStudies: LessonDestination[] = catalog475.items.flatMap(({ catalogId }) => {
  const lesson = referenceByCatalogId.get(catalogId);
  return lesson ? [{ href: `/reference/${catalogId}/`, title: lesson.title, kind: "study" as const }] : [];
});

export const nextLessonByHref = new Map([
  ...buildLessonSequence(codeLessons),
  ...buildLessonSequence(relationshipStudies),
  ...buildLessonSequence(referenceStudies),
]);
