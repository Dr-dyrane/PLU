import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

import {
  normalize,
  productHeadGroups,
  words,
} from "./batch04/common.mjs";

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

async function loadJsonRecords(directoryUrl, filter = () => true) {
  const files = (await readdir(directoryUrl).catch(() => []))
    .filter((name) => name.endsWith(".json") && filter(name))
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

function referencedCommonsFile(photo) {
  if (typeof photo?.file === "string" && photo.file.trim()) return photo.file;
  if (typeof photo?.source?.url !== "string") return null;
  try {
    const pathname = new URL(photo.source.url).pathname;
    const marker = "/wiki/File:";
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    return decodeURIComponent(pathname.slice(markerIndex + marker.length)).replaceAll("_", " ");
  } catch {
    return null;
  }
}

function includesNormalizedPhrase(value, phrase) {
  return ` ${normalize(value)} `.includes(` ${normalize(phrase)} `);
}

function visibleLabelMatchesCatalog(visibleLabel, catalogItem) {
  const visibleTokens = new Set(words(visibleLabel));
  const catalogTokens = new Set(words(catalogItem));
  if ([...visibleTokens].some((token) => catalogTokens.has(token))) return true;
  return productHeadGroups.some(
    (group) =>
      group.some((token) => visibleTokens.has(token)) &&
      group.some((token) => catalogTokens.has(token)),
  );
}

const catalog = await loadJsonRecords(new URL("../data/catalog/", import.meta.url));
const reviewedMedia06 = await readJson(
  new URL("../data/batch-06-reviewed-media.json", import.meta.url),
);
const report06 = await readJson(
  new URL("../public/media-resolution-batch06.json", import.meta.url),
);
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
const storiesBeforeBatch06 = [
  ...(await loadJsonRecords(new URL("../data/stories/", import.meta.url))),
  ...(await loadJsonRecords(new URL("../data/story-batches/", import.meta.url))),
  ...(await loadJsonRecords(
    new URL("../data/story-seeds/", import.meta.url),
    (name) => name !== "batch-06-generated.json",
  )),
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
assert.equal(reviewedMedia06?.schemaVersion, "1.0.0", "Unsupported Batch 06 reviewed media schema.");
assert.equal(reviewedMedia06?.batch, "06", "Batch 06 reviewed media ledger has the wrong batch.");
assert.ok(Array.isArray(reviewedMedia06?.items), "Batch 06 reviewed media ledger is malformed.");
const reviewedMedia06ById = new Map();
const allowedRecognitionModes = new Set([
  "product-and-loose-form",
  "family-color-and-loose-form",
  "label-assisted",
]);
for (const review of reviewedMedia06.items) {
  const label = `Batch 06 reviewed media/${review?.catalogId ?? "unknown"}`;
  const requiredFields = ["catalogId", "code", "commonsFile", "recognitionMode", "reviewBasis"];
  assert.ok(
    requiredFields.every(
      (field) => typeof review?.[field] === "string" && review[field].trim().length > 0,
    ),
    `${label}: catalog ID, code, Commons file, recognition mode, and review basis are required.`,
  );
  assert.ok(!reviewedMedia06ById.has(review.catalogId), `${label}: duplicate catalog ID.`);
  assert.ok(allowedRecognitionModes.has(review.recognitionMode), `${label}: unsupported recognition mode.`);
  assert.ok(catalogById.has(review.catalogId), `${label}: catalog record is missing.`);
  const catalogRecord = catalogById.get(review.catalogId);
  assert.ok(
    catalogRecord.codes.includes(review.code),
    `${label}: reviewed code is not in the catalog record.`,
  );
  if (review.recognitionMode === "label-assisted") {
    const visibleFields = ["label", "form", "color", "cue"];
    assert.ok(
      visibleFields.every(
        (field) =>
          typeof review.visibleIdentity?.[field] === "string" &&
          review.visibleIdentity[field].trim().length > 0,
      ),
      `${label}: label-assisted media needs a complete visible identity.`,
    );
    assert.ok(
      Array.isArray(review.labelClaims) && review.labelClaims.length > 0,
      `${label}: label-assisted media needs workbook label claims.`,
    );
    assert.ok(
      visibleLabelMatchesCatalog(review.visibleIdentity.label, catalogRecord.item),
      `${label}: visible identity must be anchored to the catalog item.`,
    );
    const catalogPages = new Set(catalogRecord.sourcePages ?? []);
    const claimValues = new Set();
    for (const claim of review.labelClaims) {
      const normalizedClaim = normalize(claim?.value ?? "");
      assert.ok(normalizedClaim, `${label}: label claim value is required.`);
      assert.ok(!claimValues.has(normalizedClaim), `${label}: duplicate label claim ${claim.value}.`);
      claimValues.add(normalizedClaim);
      assert.equal(claim.basis, "workbook-label", `${label}: label claim basis must be workbook-label.`);
      assert.equal(claim.sourceField, "catalog.item", `${label}: label claim must cite catalog.item.`);
      assert.ok(
        Array.isArray(claim.sourcePages) &&
          claim.sourcePages.length > 0 &&
          claim.sourcePages.every((page) => Number.isInteger(page) && catalogPages.has(page)),
        `${label}: label claim pages must be catalog source pages.`,
      );
      assert.ok(
        includesNormalizedPhrase(catalogRecord.item, normalizedClaim),
        `${label}: label claim is absent from the catalog item.`,
      );
      assert.ok(
        !Object.values(review.visibleIdentity).some((value) =>
          includesNormalizedPhrase(value, normalizedClaim),
        ),
        `${label}: workbook-only claim leaked into the visible identity.`,
      );
    }
  }
  reviewedMedia06ById.set(review.catalogId, review);
}
const priorReviewedFiles = new Set(
  storiesBeforeBatch06.flatMap((story) =>
    (story.photos ?? []).map(referencedCommonsFile).filter(Boolean),
  ),
);
const reviewedMedia06ByFile = new Map();
for (const review of reviewedMedia06.items) {
  const fileReviews = reviewedMedia06ByFile.get(review.commonsFile) ?? [];
  fileReviews.push(review);
  reviewedMedia06ByFile.set(review.commonsFile, fileReviews);
}
const sharedReviewedFiles = new Set();
for (const [commonsFile, reviews] of reviewedMedia06ByFile) {
  if (reviews.length < 2 && !priorReviewedFiles.has(commonsFile)) continue;
  assert.ok(
    reviews.every(
      (review) =>
        typeof review.sharedMediaBasis === "string" && review.sharedMediaBasis.trim().length > 0,
    ),
    `${commonsFile}: every reused reviewed file needs a shared-media basis.`,
  );
  sharedReviewedFiles.add(commonsFile);
}
const storyByCatalogId = new Map(stories.map((story) => [story.catalogId, story]));
const storyIds = new Set(stories.map((story) => story.id));
const mappings = [];
const checkoutCodes = [];
const assignedCatalogIds = [];
let readyCount = 0;
let mappedCount = 0;
let queuedCount = 0;
let excludedCount = 0;

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
      ["ready", "mapped", "queued", "excluded"].includes(item.status),
      `${batch.id}/${item.title}: unsupported batch status.`,
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

    if (item.status !== "ready") {
      assert.equal(
        batch.id,
        "batch-06-catalog-remainder-175",
        `${batch.id}/${item.title}: only the catalog-remainder batch may contain non-ready rows.`,
      );
      assert.ok(
        !storyByCatalogId.has(item.catalogId),
        `${batch.id}/${item.title}: non-ready row may not publish a learning story.`,
      );
      if (item.status === "mapped") {
        assert.ok(
          ["single", "same-label-different-codes", "shared-code"].includes(item.mappingKind),
          `${batch.id}/${item.title}: mapped row requires a supported mapping kind.`,
        );
        assert.ok(
          typeof item.mappingReason === "string" && item.mappingReason.trim().length > 0,
          `${batch.id}/${item.title}: mapped row requires a review reason.`,
        );
        mappedCount += 1;
        continue;
      }
      assert.ok(
        typeof item.queueReason === "string" && item.queueReason.trim().length > 0,
        `${batch.id}/${item.title}: ${item.status} row requires a reason.`,
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
      if (item.status === "queued") queuedCount += 1;
      else excludedCount += 1;
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
  [...reviewedMedia06ById.keys()].sort(),
  "Batch 06 ready rows must match the committed reviewed-media ledger.",
);
const batch06ById = new Map(batches.at(-1).items.map((item) => [item.catalogId, item]));
const report06ById = new Map(report06.media.map((item) => [item.catalogId, item]));
assert.deepEqual(
  [...report06ById.keys()].sort(),
  [...reviewedMedia06ById.keys()].sort(),
  "Batch 06 resolved media must match the committed reviewed-media ledger.",
);
for (const [catalogId, review] of reviewedMedia06ById) {
  const batchItem = batch06ById.get(catalogId);
  const media = report06ById.get(catalogId);
  const story = storyByCatalogId.get(catalogId);
  assert.equal(String(batchItem?.code), String(review.code), `${catalogId}: ledger/manifest code drifted.`);
  assert.equal(media?.match, "reviewed-override", `${catalogId}: unreviewed media cannot publish.`);
  assert.equal(media?.file, review.commonsFile, `${catalogId}: resolved media differs from the ledger.`);
  assert.deepEqual(media?.mediaReview, review, `${catalogId}: report review metadata drifted.`);
  if (sharedReviewedFiles.has(review.commonsFile)) {
    assert.ok(
      story?.source?.flags?.includes("media-shared-reviewed"),
      `${catalogId}: shared reviewed media flag is required.`,
    );
  }
  if (review.recognitionMode === "label-assisted") {
    assert.ok(
      story?.source?.flags?.includes("media-label-assisted") &&
        story.source.flags.includes("qualifier-workbook-label"),
      `${catalogId}: label-assisted provenance flags are required.`,
    );
  }
}
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
  "Every ready item must have exactly one story, while non-ready rows must have none.",
);
assert.equal(mappings.length, readyCount, "Every ready item must have one exact catalog/code mapping.");
assert.equal(
  readyCount + mappedCount + queuedCount + excludedCount,
  catalog.length,
  "Every catalog row must have one explicit learning disposition.",
);

console.log(
  `Validated ${batches.length} batches covering ${catalog.length} catalog rows: ${readyCount} ready lessons, ${mappedCount} mapped references, ${queuedCount} evidence-gated rows, and ${excludedCount} catalog-only rows.`,
);
