import raw from "@/data/relationship-lessons.json";
import type { RelationshipLessonData } from "@/types/relationship";
import { relationshipSignature } from "@/lib/trace/relationship-recall";

export const relationshipLessons = raw.items as RelationshipLessonData[];
export const relationshipByCatalogId = new Map(relationshipLessons.map(lesson => [lesson.catalogId, lesson]));

// Keep full evidence and photographs on the lesson route, not in every home card.
export const relationshipSummaries = relationshipLessons.map(lesson => ({ catalogId: lesson.catalogId, relationKind: lesson.relationKind, soldBy: lesson.soldBy, signature: relationshipSignature(lesson) }));
