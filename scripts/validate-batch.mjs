import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

const catalogDirectory = new URL("../data/catalog/", import.meta.url);
const catalogFiles = (await readdir(catalogDirectory)).filter((name) => /^\d+\.json$/.test(name)).sort();
const catalog = (await Promise.all(catalogFiles.map((name) => readJson(new URL(name, catalogDirectory))))).flat();

const batchDirectory = new URL("../data/batches/", import.meta.url);
const batchFiles = (await readdir(batchDirectory)).filter((name) => /^batch-\d+\.json$/.test(name)).sort();
const batches = await Promise.all(batchFiles.map((name) => readJson(new URL(name, batchDirectory))));

const storyDirectory = new URL("../data/stories/", import.meta.url);
const storyBatchDirectory = new URL("../data/story-batches/", import.meta.url);
const storyFiles = (await readdir(storyDirectory)).filter((name) => name.endsWith(".json")).sort();
const storyBatchFiles = (await readdir(storyBatchDirectory).catch(() => [])).filter((name) => name.endsWith(".json")).sort();
const stories = (
  await Promise.all([
    ...storyFiles.map(async (name) => {
      const value = await readJson(new URL(name, storyDirectory));
      return Array.isArray(value) ? value : [value];
    }),
    ...storyBatchFiles.map(async (name) => {
      const value = await readJson(new URL(name, storyBatchDirectory));
      return Array.isArray(value) ? value : [value];
    }),
  ])
).flat();

assert.ok(batches.length >= 2, "Expected at least two production batches.");

const catalogById = new Map(catalog.map((record) => [record.id, record]));
const storyByCatalogId = new Map(stories.map((story) => [story.catalogId, story]));
const allBatchMappings = [];
let expectedGlobalOrder = 1;

for (const [batchIndex, batch] of batches.entries()) {
  assert.equal(batch.size, 25, `${batch.id} must contain 25 products.`);
  assert.equal(batch.items.length, batch.size, `${batch.id}: size must match item count.`);
  assert.deepEqual(
    batch.items.map((item) => item.order),
    Array.from({ length: batch.size }, (_, index) => index + 1),
    `${batch.id}: item order must be continuous.`,
  );
  assert.equal(new Set(batch.items.map((item) => item.catalogId)).size, batch.size, `${batch.id}: catalog IDs must be unique.`);
  assert.equal(new Set(batch.items.map((item) => `${item.catalogId}:${item.code}`)).size, batch.size, `${batch.id}: mappings must be unique.`);

  for (const item of batch.items) {
    const record = catalogById.get(item.catalogId);
    assert.ok(record, `${batch.id}: missing catalog record ${item.catalogId}.`);
    assert.ok(record.codes.includes(item.code), `${item.title} must retain exact code ${item.code}.`);
    assert.equal(item.status, "ready", `${item.title} must be ready in a completed batch.`);

    const story = storyByCatalogId.get(item.catalogId);
    assert.ok(story, `${item.title} has no product story.`);
    assert.equal(story.checkout.code, item.code, `${item.title}: story code must match batch.`);
    assert.ok(story.title && story.title.length > 1, `${item.title}: story title is required.`);

    if (record.soldBy) {
      assert.equal(story.checkout.soldBy, record.soldBy, `${item.title}: checkout method must match catalog.`);
    } else {
      assert.ok(
        story.source?.flags?.includes("sold-by-curated"),
        `${item.title}: a curated checkout method requires the sold-by-curated source flag.`,
      );
    }

    allBatchMappings.push(`${item.catalogId}:${item.code}`);
    expectedGlobalOrder += 1;
  }

  if (batchIndex === 0) assert.equal(batch.id, "batch-01-core-25");
  if (batchIndex === 1) assert.equal(batch.id, "batch-02-must-know-25");
}

assert.equal(new Set(allBatchMappings).size, allBatchMappings.length, "Production batches may not duplicate product mappings.");
assert.equal(stories.length, allBatchMappings.length, "Every ready product must have exactly one canonical story.");
assert.equal(storyByCatalogId.size, allBatchMappings.length, "Story catalog IDs must be unique.");

console.log(
  `Validated ${batches.length} completed batches: ${allBatchMappings.length} exact mappings and ${stories.length} ready lessons.`,
);
