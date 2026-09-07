export type ReferenceCodeStatus = "recorded" | "missing" | "conflicted" | "uncertain";

export interface ReferenceMedia {
  kind: "reviewed-photo" | "generated-illustration";
  src: string;
  alt: string;
  author: string;
  sourceUrl: string;
  license: string;
  licenseUrl?: string;
  claimBoundary: string;
}

/** A source-reading study aid, never checkout approval or a ProductStory. */
export interface ReferenceLessonData {
  catalogId: string;
  title: string;
  family: string;
  sourcePages: number[];
  soldBy: "Weight" | "Each" | null;
  /** Exact source values, including "?". Never turn these into an inferred code. */
  codes: string[];
  sourceCodeText: string;
  codeStatus: ReferenceCodeStatus;
  /** Changes whenever the study content changes; separate from checkout mastery. */
  revision: string;
  visualCue: string;
  identityNote: string;
  checkoutCaveat: string;
  sourceIssue: string;
  media: ReferenceMedia;
  evidenceSources: Array<{ title: string; url: string }>;
}

export type ReferenceLessonSummary = Pick<ReferenceLessonData,
  "catalogId" | "title" | "family" | "soldBy" | "codeStatus" | "revision"
> & { mediaKind: ReferenceMedia["kind"] };
