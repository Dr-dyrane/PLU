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
  { id: "batch-04-next-100", size: 100 },
  { id: "batch-05-next-100", size: 100 },
  { id: "batch-06-catalog-remainder-175", size: 175 },
];

assert.equal(batches.length, expected.length, "Expected six production batches covering the catalog.");

const catalogById = new Map(catalog.map((record) => [record.id, record]));
const storyByCatalogId = new Map(stories.map((story) => [story.catalogId, story]));
const storyIds = new Set(stories.map((story) => story.id));
const mappings = [];
const checkoutCodes = [];
const assignedCatalogIds = [];
let readyCount = 0;
let queuedCount = 0;

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
    const catalogRecord = catalogById.get(item.catalogId);
    assert.ok(catalogRecord, `${batch.id}/${item.title}: catalog record is missing.`);
    assert.ok(
      ["ready", "queued"].includes(item.status),
      `${batch.id}/${item.title}: status must be ready or queued.`,
    );
    assert.ok(
      typeof item.title === "string" && item.title.trim().length > 1,
      `${batch.id}: batch display title is required.`,
    );
    assert.ok(
      typeof item.family === "string" && item.family.trim().length > 1,
      `${batch.id}/${item.title}: product family is required.`,
    );
    assignedCatalogIds.push(item.catalogId);

    if (item.status === "queued") {
      assert.equal(
        batch.id,
        "batch-06-catalog-remainder-175",
        `${batch.id}/${item.title}: only the catalog-remainder batch may contain queued rows.`,
      );
      assert.ok(
        typeof item.queueReason === "string" && item.queueReason.trim().length > 0,
        `${batch.id}/${item.title}: queued row requires a reason.`,
      );
      if (item.queueReasonCodes != null) {
        assert.ok(
          Array.isArray(item.queueReasonCodes) &&
            item.queueReasonCodes.length > 0 &&
            item.queueReasonCodes.every(
              (reason) => typeof reason === "string" && reason.trim().length > 0,
            ),
          `${batch.id}/${item.title}: queue reason codes must be non-empty strings.`,
        );
      }
      assert.ok(
        !storyByCatalogId.has(item.catalogId),
        `${batch.id}/${item.title}: queued row may not publish a learning story.`,
      );
      queuedCount += 1;
      continue;
    }

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
    if (["batch-04-next-100", "batch-05-next-100", "batch-06-catalog-remainder-175"].includes(batch.id)) {
      assert.equal(story.title, item.title, `${batch.id}/${item.title}: story and batch titles differ.`);
    }
    assert.ok(
      typeof story.title === "string" && story.title.trim().length > 1,
      `${batch.id}/${item.title}: story title is required.`,
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
    checkoutCodes.push(String(item.code));
    readyCount += 1;
  }
}

const priorCatalogIds = new Set(
  batches
    .slice(0, -1)
    .flatMap((batch) => batch.items.map((item) => item.catalogId)),
);
const batch06CatalogIds = new Set(batches.at(-1).items.map((item) => item.catalogId));
const batch06ReadyIds = batches
  .at(-1)
  .items.filter((item) => item.status === "ready")
  .map((item) => item.catalogId)
  .sort();
const expectedRemainderIds = catalog
  .filter((record) => !priorCatalogIds.has(record.id))
  .map((record) => record.id)
  .sort();
assert.deepEqual(
  [...batch06CatalogIds].sort(),
  expectedRemainderIds,
  "Batch 06 must contain the exact 175-row remainder after Batches 01–05.",
);
assert.deepEqual(
  batch06ReadyIds,
  ["aloe", "tomato-hh-red-bulk"],
  "Batch 06 must preserve the exact human-reviewed ready set.",
);
assert.equal(
  assignedCatalogIds.length,
  catalog.length,
  "The six batch manifests must assign every catalog row.",
);
assert.equal(
  new Set(assignedCatalogIds).size,
  catalog.length,
  "The six batch manifests must cover every catalog ID exactly once.",
);
assert.deepEqual(
  [...new Set(assignedCatalogIds)].sort(),
  [...catalogById.keys()].sort(),
  "Batch coverage must match the source catalog exactly.",
);

assert.equal(
  new Set(mappings).size,
  mappings.length,
  "Published batches may not duplicate exact product mappings.",
);
assert.equal(
  new Set(checkoutCodes).size,
  checkoutCodes.length,
  "Published lessons may not reuse a primary checkout code.",
);
assert.equal(
  stories.length,
  readyCount,
  "Every ready item must have exactly one story, while queued rows must have none.",
);
assert.equal(mappings.length, readyCount, "Every ready item must have one exact catalog/code mapping.");
assert.equal(readyCount + queuedCount, catalog.length, "Every catalog row must be ready or queued.");

console.log(
  `Validated ${batches.length} batches covering ${catalog.length} catalog rows: ${readyCount} exact ready lessons and ${queuedCount} evidence-gated rows.`,
);
