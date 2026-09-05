import type { ProductPhoto } from "@/types/trace";

/** A source-row study, never a single-answer ProductStory or checkout approval. */
export interface RelationshipLessonData {
  catalogId: string;
  title: string;
  relationKind: "shared-code" | "same-label-different-codes";
  codes: string[];
  sourcePages: number[];
  soldBy: "Weight" | "Each" | null;
  photo: ProductPhoto;
  visualCue: string;
  qualifierNote: string;
  reviewBasis: string;
  checkoutCaveat: string;
  members: Array<{
    catalogId: string;
    item: string;
    codes: string[];
    sourcePages: number[];
    soldBy: "Weight" | "Each" | null;
    flags: string[];
    status: string;
  }>;
}
