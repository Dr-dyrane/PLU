import batch01Raw from "@/data/batches/batch-01.json";
import batch02Raw from "@/data/batches/batch-02.json";
import { productStoryByCatalogId } from "@/data/stories";
import type { ProductBatch, ReadyBatchItem } from "@/types/batch";

export const batch01 = batch01Raw as ProductBatch;
export const batch02 = batch02Raw as ProductBatch;

function readyItems(batch: ProductBatch): ReadyBatchItem[] {
  return batch.items
    .filter((item) => item.status === "ready")
    .map((item) => {
      const story = productStoryByCatalogId.get(item.catalogId);
      if (!story) throw new Error(`Ready batch item has no story: ${item.catalogId}`);
      return { ...item, status: "ready", story };
    });
}

export const batch01ReadyItems = readyItems(batch01);
export const batch02ReadyItems = readyItems(batch02);

export const mustKnow50: ProductBatch = {
  schemaVersion: "0.5.0",
  id: "must-know-50",
  title: "Must Know 50",
  size: batch01.size + batch02.size,
  strategy: "Two completed high-frequency produce batches",
  items: [
    ...batch01.items,
    ...batch02.items.map((item) => ({ ...item, order: batch01.size + item.order })),
  ],
};

export const mustKnow50ReadyItems = readyItems(mustKnow50);
