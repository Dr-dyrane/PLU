import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const catalogDirectory = new URL("../data/catalog/", import.meta.url);
const catalogFiles = (await readdir(catalogDirectory))
  .filter((name) => /^\d+\.json$/.test(name))
  .sort();
const catalog = (
  await Promise.all(
    catalogFiles.map(async (name) => JSON.parse(await readFile(new URL(name, catalogDirectory), "utf8"))),
  )
).flat();

const batch = JSON.parse(
  await readFile(new URL("../data/batches/batch-01.json", import.meta.url), "utf8"),
);
const storyDirectory = new URL("../data/stories/", import.meta.url);
const storyFiles = (await readdir(storyDirectory)).filter((name) => name.endsWith(".json"));
const stories = await Promise.all(
  storyFiles.map(async (name) => JSON.parse(await readFile(new URL(name, storyDirectory), "utf8"))),
);

assert.equal(batch.size, 25, "Batch 01 must contain 25 products.");
assert.equal(batch.items.length, batch.size, "Batch size must match item count.");
assert.deepEqual(batch.items.map((item) => item.order), Array.from({ length: 25 }, (_, index) => index + 1));
assert.equal(new Set(batch.items.map((item) => item.catalogId)).size, 25, "Catalog IDs must be unique.");
assert.equal(new Set(batch.items.map((item) => `${item.catalogId}:${item.code}`)).size, 25, "Batch mappings must be unique.");
assert.equal(new Set(stories.map((story) => story.id)).size, stories.length, "Story IDs must be unique.");
assert.equal(new Set(stories.map((story) => story.catalogId)).size, stories.length, "Story catalog IDs must be unique.");

const catalogById = new Map(catalog.map((record) => [record.id, record]));
const storyByCatalogId = new Map(stories.map((story) => [story.catalogId, story]));
const batchByCatalogId = new Map(batch.items.map((item) => [item.catalogId, item]));

for (const item of batch.items) {
  const record = catalogById.get(item.catalogId);
  assert.ok(record, `Batch item is missing from catalog: ${item.catalogId}`);
  assert.ok(record.codes.includes(item.code), `${item.title} must retain exact code ${item.code}.`);

  if (item.status === "ready") {
    const story = storyByCatalogId.get(item.catalogId);
    assert.ok(story, `Ready item has no product story: ${item.catalogId}`);
    assert.equal(story.checkout.code, item.code, `${item.title} story code must match the batch.`);
    assert.equal(story.title, item.title === "Green bell pepper" ? "Green pepper" : item.title);
    assert.ok(story.classificationPrompts.length >= 3, `${item.title} needs three identification decisions.`);
    assert.ok(story.similarItems?.length >= 3, `${item.title} needs a three-item comparison set.`);
  }
}

for (const story of stories) {
  const item = batchByCatalogId.get(story.catalogId);
  assert.ok(item, `Story is not assigned to Batch 01: ${story.catalogId}`);
  assert.equal(item.status, "ready", `Story must be marked ready in the batch: ${story.catalogId}`);
  assert.equal(story.checkout.code, item.code, `Story code must match batch: ${story.catalogId}`);
}

const readyItems = batch.items.filter((item) => item.status === "ready");
assert.equal(
  readyItems.length,
  stories.length,
  "Every ready batch item must have exactly one story and every story must be ready.",
);

console.log(
  `Validated Batch 01: ${batch.size} locked products, ${readyItems.length} ready lessons, ${batch.size - readyItems.length} queued.`,
);
