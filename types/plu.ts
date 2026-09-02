export type SoldBy = "Weight" | "Each";
export type PepperShape = "bell" | "long";
export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface CatalogItem {
  id: string;
  item: string;
  codeText: string;
  codes: string[];
  soldBy: SoldBy | null;
  sourcePages: number[];
  flags: string[];
}

export interface MnemonicPeg {
  code: string;
  peg: string;
}

export interface MemoryHook {
  label: string;
  chunks: MnemonicPeg[];
  story: string;
}

export interface ContrastItem {
  name: string;
  code: string;
  color: string;
  shape: PepperShape;
  current?: boolean;
}

export interface PluLesson {
  id: string;
  sequence: number;
  deckSize: number;
  level: string;
  name: string;
  shortName: string;
  code: string;
  soldBy: SoldBy;
  soldByShort: "wt" | "ea";
  family: string;
  image: string;
  alt: string;
  visualAnchors: string[];
  recognitionHint: string;
  memoryHook: MemoryHook;
  contrast: ContrastItem[];
}

export interface ProgressRecord {
  attempts: number;
  correct: number;
  misses: number;
  updatedAt?: string;
  lastRating?: ReviewRating;
  nextReviewAt?: string;
  mastered?: boolean;
}
