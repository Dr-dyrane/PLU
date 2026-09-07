import { notFound } from "next/navigation";

import { LessonRouteShell } from "@/components/canon/LessonRouteShell";
import { ReferenceLesson } from "@/components/canon/ReferenceLesson";
import { referenceByCatalogId, referenceLessons } from "@/data/references";

import "@/app/styles/canon/reference.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return referenceLessons.map(({ catalogId }) => ({ catalogId }));
}

export default async function ReferencePage({ params }: { params: Promise<{ catalogId: string }> }) {
  const { catalogId } = await params;
  const lesson = referenceByCatalogId.get(catalogId);
  if (!lesson) notFound();
  return <LessonRouteShell><ReferenceLesson key={lesson.catalogId} lesson={lesson} /></LessonRouteShell>;
}
