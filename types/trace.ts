export type KeypadLayoutName = "calculator" | "phone";
export type TraceStage =
  | "meet"
  | "resolve"
  | "attach"
  | "trace"
  | "recall"
  | "repair"
  | "complete";

export type EvidenceBasis =
  | "workbook"
  | "reference-sheet"
  | "curated-visual"
  | "derived";

export type ProductPriority = "must-know" | "common" | "specialty" | "rare";
export type VariantScope =
  | "primary"
  | "package"
  | "case"
  | "listed-bulk"
  | "organic"
  | "store-specific";

export type ProductPhotoRole = "hero" | "alternate" | "context" | "detail";

export interface ProductPhotoSource {
  label: string;
  author: string;
  license: string;
  url: string;
}

export interface ProductPhotoViewport {
  x: number;
  y: number;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
}

export interface ProductPhoto {
  id: string;
  src: string;
  alt: string;
  role: ProductPhotoRole;
  focus?: string;
  viewport?: ProductPhotoViewport;
  source: ProductPhotoSource;
}

export interface ProductIdentity {
  family: string;
  form: string;
  color: string;
  variant: string;
}

export interface CheckoutIdentity {
  code: string;
  soldBy: "Weight" | "Each";
  saleForm: string;
  codeScope: string;
  summary: string;
}

export interface StoryBeat {
  id: string;
  label: string;
  value: string;
  copy: string;
  basis: EvidenceBasis;
}

export interface ClassificationChoice {
  id: string;
  label: string;
}

export interface ClassificationPrompt {
  id: string;
  question: string;
  support: string;
  answer: string;
  choices: ClassificationChoice[];
}

export interface RetailVariant {
  id: string;
  name: string;
  code: string;
  soldBy: "Weight" | "Each" | null;
  scope: VariantScope;
  note: string;
  sourcePages: number[];
}

export interface CodeRelation {
  kind: "observed-cluster" | "exception" | "shared-prefix" | "shared-suffix";
  title: string;
  copy: string;
}

export interface NearestConfusion {
  name: string;
  code: string;
  cue: string;
  color?: string;
}

export interface ProductStorySource {
  primaryPages: number[];
  relatedPages: number[];
  checkedOnReference: boolean;
  flags: string[];
  confidence: string;
}

export interface ProductStory {
  schemaVersion: string;
  id: string;
  catalogId: string;
  title: string;
  shortTitle: string;
  family: string;
  priority: ProductPriority;
  image: string;
  alt: string;
  photos: ProductPhoto[];
  identity: ProductIdentity;
  checkout: CheckoutIdentity;
  visualCues: string[];
  storyBeats: StoryBeat[];
  classificationPrompts: ClassificationPrompt[];
  retailVariants: RetailVariant[];
  codeRelations: CodeRelation[];
  nearestConfusion: NearestConfusion;
  similarItems?: NearestConfusion[];
  source: ProductStorySource;
}

export interface KeyPoint {
  digit: string;
  x: number;
  y: number;
  index: number;
  chunkIndex: number;
}

export interface PathSegment {
  chunk: string;
  chunkIndex: number;
  points: KeyPoint[];
}

export interface CheckoutPath {
  code: string;
  digits: string[];
  chunks: string[];
  layout: KeypadLayoutName;
  points: KeyPoint[];
  segments: PathSegment[];
  rhythm: number[];
  signature: string;
}

export interface LearningState {
  stage: TraceStage;
  identityAttempts: number;
  identityCorrect: number;
  identityMisses: number;
  traceAttempts: number;
  traceMisses: number;
  recallAttempts: number;
  recallMisses: number;
  supportUses: number;
  firstTryRecall: boolean | null;
  completed: boolean;
  processedEventIds: string[];
}

export type LearningEvent =
  | { id: string; type: "START" }
  | { id: string; type: "IDENTITY_RESPONSE"; correct: boolean }
  | { id: string; type: "IDENTITY_COMPLETE" }
  | { id: string; type: "BEGIN_TRACE" }
  | { id: string; type: "TRACE_RESPONSE"; correct: boolean }
  | { id: string; type: "RECALL_RESPONSE"; correct: boolean }
  | { id: string; type: "RETRY" }
  | { id: string; type: "SUPPORT_OPENED" }
  | { id: string; type: "RESET" };

export type CompetenceOutcome = "clean" | "guided" | "recovered";
