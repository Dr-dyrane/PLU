import { notFound } from "next/navigation";
import { LessonRouteShell } from "@/components/canon/LessonRouteShell";
import { RelationshipLesson } from "@/components/canon/RelationshipLesson";
import { relationshipLessons, relationshipByCatalogId } from "@/data/relationships";
import { nextLessonByHref } from "@/data/lesson-navigation";

export const dynamicParams = false;
export function generateStaticParams() {
  return relationshipLessons.map(({ catalogId }) => ({ catalogId }));
}
export default async function RelationshipPage({ params }: { params: Promise<{ catalogId: string }> }) {
  const { catalogId } = await params;
  const lesson = relationshipByCatalogId.get(catalogId);
  if (!lesson) notFound();
  return <LessonRouteShell><RelationshipLesson key={lesson.catalogId} lesson={lesson} nextLesson={nextLessonByHref.get(`/relationships/${lesson.catalogId}/`) ?? null} /></LessonRouteShell>;
}
