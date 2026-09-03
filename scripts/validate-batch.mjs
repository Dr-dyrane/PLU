import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

async function loadJsonRecords(directoryUrl) {
  const files = (await readdir(directoryUrl).catch(() => []))
    .filter((name) => name.endsWith(".json"))
    .sort();

  return (
    await Promise.all(
      files.map(async (name) => {
        const value = await readJson(new URL(name, directoryUrl));
        return Array.isArray(value) ? value : [value];
      }),
    )
  ).flat();
}

const catalog = await loadJsonRecords(new URL("../data/catalog/", import.meta.url));
const batchDirectory = new URL("../data/batches/", import.meta.url);
const batchFiles = (await readdir(batchDirectory))
  .filter((name) => /^batch-\d+\.json$/.test(name))
  .sort();
const batches = await Promise.all(
  batchFiles.map((name) => readJson(new URL(name, batchDirectory))),
);
const stories = [
  ...(await loadJsonRecords(new URL("../data/stories/", import.meta.url))),
  ...(await loadJsonRecords(new URL("../data/story-batches/", import.meta.url))),
  ...(await loadJsonRecords(new URL("../data/story-seeds/", import.meta.url))),
];

const expected = [
  { id: "batch-01-core-25", size: 25 },
  { id: "batch-02-must-know-25", size: 25 },
  { id: "batch-03-next-50", size: 50 },
];

assert.equal(batches.length, expected.length, "Expected three completed production batches.");

const catalogById = new Map(catalog.map((record) => [record.id, record]));
const storyByCatalogId = new Map(stories.map((story) => [story.catalogId, story]));
const storyIds = new Set(stories.map((story) => story.id));
const mappings = [];

assert.equal(storyIds.size, stories.length, "Story IDs must be unique.");
assert.equal(storyByCatalogId.size, stories.length, "Story catalog IDs must be unique.");

for (const [index, batch] of batches.entries()) {
  const requirement = expected[index];
  assert.equal(batch.id, requirement.id, `Unexpected batch at position ${index + 1}.`);
  assert.equal(batch.size, requirement.size, `${batch.id}: incorrect declared size.`);
  assert.equal(batch.items.length, requirement.size, `${batch.id}: item count must match size.`);
  assert.deepEqual(
    batch.items.map((item) => item.order),
    Array.from({ length: requirement.size }, (_, itemIndex) => itemIndex + 1),
    `${batch.id}: order must be continuous.`,
  );
  assert.equal(
    new Set(batch.items.map((item) => item.catalogId)).size,
    requirement.size,
    `${batch.id}: catalog IDs must be unique within the batch.`,
  );

  for (const item of batch.items) {
    assert.equal(item.status, "ready", `${batch.id}/${item.title}: every published lesson must be ready.`);

    const catalogRecord = catalogById.get(item.catalogId);
    assert.ok(catalogRecord, `${batch.id}/${item.title}: catalog record is missing.`);
    assert.ok(
      catalogRecord.codes.includes(item.code),
      `${batch.id}/${item.title}: ${item.code} is not in the source record.`,
    );

    const story = storyByCatalogId.get(item.catalogId);
    assert.ok(story, `${batch.id}/${item.title}: product story is missing.`);
    assert.equal(
      story.checkout?.code,
      item.code,
      `${batch.id}/${item.title}: story and batch codes differ.`,
    );
    assert.ok(
      typeof story.title === "string" && story.title.trim().length > 1,
      `${batch.id}/${item.title}: story title is required.`,
    );
    assert.ok(
      typeof item.title === "string" && item.title.trim().length > 1,
      `${batch.id}: batch display title is required.`,
    );

    if (catalogRecord.soldBy) {
      assert.equal(
        story.checkout?.soldBy,
        catalogRecord.soldBy,
        `${batch.id}/${item.title}: checkout method differs from the catalog.`,
      );
    } else {
      assert.ok(
        story.source?.flags?.includes("sold-by-curated"),
        `${batch.id}/${item.title}: a curated checkout method requires the sold-by-curated flag.`,
      );
    }

    mappings.push(`${item.catalogId}:${item.code}`);
  }
}

assert.equal(
  new Set(mappings).size,
  mappings.length,
  "Published batches may not duplicate exact product mappings.",
);
assert.equal(mappings.length, 100, "The published Must Know collection must contain 100 lessons.");
assert.equal(stories.length, 100, "Every published mapping must have exactly one story or story seed.");

console.log(
  `Validated ${batches.length} completed batches, ${mappings.length} exact mappings, and ${stories.length} learning stories.`,
);
