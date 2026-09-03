import batch01Raw from "@/data/batches/batch-01.json";
import { productStoryByCatalogId } from "@/data/stories";
import type { ProductBatch, ReadyBatchItem } from "@/types/batch";

export const batch01 = batch01Raw as ProductBatch;

export const batch01ReadyItems: ReadyBatchItem[] = batch01.items
  .filter((item) => item.status === "ready")
  .map((item) => {
    const story = productStoryByCatalogId.get(item.catalogId);
    if (!story) {
      throw new Error(`Ready batch item has no story: ${item.catalogId}`);
    }
    return { ...item, status: "ready", story };
  });
