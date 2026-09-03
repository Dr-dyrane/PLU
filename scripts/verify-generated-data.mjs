import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));
}

const batch04 = await readJson("../data/batches/batch-04.json");
const batch05 = await readJson("../data/batches/batch-05.json");
const seed04 = await readJson("../data/story-seeds/batch-04-generated.json");
const seed05 = await readJson("../data/story-seeds/batch-05-generated.json");
const source05 = await readJson("../data/batch-05-source.json");
const report04 = await readJson("../public/media-resolution-batch04.json");
const report05 = await readJson("../public/media-resolution-batch05.json");

for (const [label, batch, seeds, report] of [
  ["Batch 04", batch04, seed04, report04],
  ["Batch 05", batch05, seed05, report05],
]) {
  assert.equal(batch.size, 100, `${label}: generated batch size must be 100.`);
  assert.equal(batch.items?.length, 100, `${label}: generated item count must be 100.`);
  assert.equal(seeds?.length, 100, `${label}: generated story count must be 100.`);
  assert.equal(report.media?.length, 100, `${label}: generated media count must be 100.`);
  assert.deepEqual(
    batch.items.map((item) => item.order),
    Array.from({ length: 100 }, (_, index) => index + 1),
    `${label}: generated order must be continuous.`,
  );
  assert.equal(
    new Set(batch.items.map((item) => item.catalogId)).size,
    100,
    `${label}: generated catalog IDs must be unique.`,
  );
  assert.equal(
    new Set(seeds.map((story) => story.catalogId)).size,
    100,
    `${label}: generated stories must map to unique catalog IDs.`,
  );
}

assert.equal(source05.length, 100, "Batch 05 accepted source must contain exactly 100 records.");
assert.equal(
  new Set([...batch04.items, ...batch05.items].map((item) => item.catalogId)).size,
  200,
  "Batch 04 and Batch 05 may not reuse a catalog ID.",
);

console.log(
  "Verified locked Batch 04 and Batch 05 generated data: 200 lessons, 200 stories, and 200 media selections.",
);
