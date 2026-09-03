import type {
  CheckoutIdentity,
  ProductIdentity,
  ProductPhoto,
  ProductStory,
} from "@/types/trace";

export type BatchItemStatus = "ready" | "queued";

export interface BatchItem {
  order: number;
  catalogId: string;
  title: string;
  code: string;
  family: string;
  status: BatchItemStatus;
}

export interface ProductBatch {
  schemaVersion: string;
  id: string;
  title: string;
  size: number;
  strategy: string;
  items: BatchItem[];
}

export interface ReadyBatchItem extends BatchItem {
  status: "ready";
  story: ProductStory;
}

/** Lightweight home-card shape. Full story data stays on lesson routes. */
export interface BatchStorySummary {
  id: string;
  catalogId: string;
  title: string;
  shortTitle: string;
  family: string;
  identity: ProductIdentity;
  checkout: CheckoutIdentity;
  hero: ProductPhoto;
}
