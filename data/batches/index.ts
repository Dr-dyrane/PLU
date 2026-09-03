import batch01Raw from "@/data/batches/batch-01.json";
import batch02Raw from "@/data/batches/batch-02.json";
import batch03Raw from "@/data/batches/batch-03.json";
import { productStoryByCatalogId } from "@/data/stories";
import type { ProductBatch, ReadyBatchItem } from "@/types/batch";

export const batch01 = batch01Raw as ProductBatch;
export const batch02 = batch02Raw as ProductBatch;
export const batch03 = batch03Raw as ProductBatch;

function readyItems(batch: ProductBatch): ReadyBatchItem[] {
  return batch.items
    .filter((item) => item.status === "ready")
    .map((item) => {
      const story = productStoryByCatalogId.get(item.catalogId);
      if (!story) throw new Error(`Ready batch item has no story: ${item.catalogId}`);
      return { ...item, status: "ready", story };
    });
}

function combineBatches(
  id: string,
  title: string,
  strategy: string,
  batches: ProductBatch[],
): ProductBatch {
  let offset = 0;
  const items = batches.flatMap((batch) => {
    const ordered = batch.items.map((item) => ({ ...item, order: offset + item.order }));
    offset += batch.size;
    return ordered;
  });

  return {
    schemaVersion: "0.6.0",
    id,
    title,
    size: items.length,
    strategy,
    items,
  };
}

export const batch01ReadyItems = readyItems(batch01);
export const batch02ReadyItems = readyItems(batch02);
export const batch03ReadyItems = readyItems(batch03);

export const mustKnow50 = combineBatches(
  "must-know-50",
  "Must Know 50",
  "Two completed high-frequency produce batches",
  [batch01, batch02],
);

export const mustKnow100 = combineBatches(
  "must-know-100",
  "Must Know 100",
  "Three completed recognition-first produce batches",
  [batch01, batch02, batch03],
);

export const mustKnow50ReadyItems = readyItems(mustKnow50);
export const mustKnow100ReadyItems = readyItems(mustKnow100);
