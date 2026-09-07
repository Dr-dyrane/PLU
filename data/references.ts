import raw from "@/data/reference-lessons.json";
import type { ReferenceLessonData, ReferenceLessonSummary } from "@/types/reference";

export const referenceLessons = raw.items as ReferenceLessonData[];
export const referenceByCatalogId = new Map(referenceLessons.map(lesson => [lesson.catalogId, lesson]));

// The home feed does not need full source prose, photographs, or attribution.
export const referenceSummaries: ReferenceLessonSummary[] = referenceLessons.map(lesson => ({
  catalogId: lesson.catalogId,
  title: lesson.title,
  family: lesson.family,
  soldBy: lesson.soldBy,
  codeStatus: lesson.codeStatus,
  mediaKind: lesson.media.kind,
  revision: lesson.revision,
}));
