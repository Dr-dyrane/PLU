import type { ProductStory } from "@/types/trace";

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
