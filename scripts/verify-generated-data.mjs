import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

import {
  loadJsonRecords,
  mediaOverridesByCatalogId,
  normalize,
  productHeadGroups,
  reviewedIdentityEvidenceByCatalogId,
  words,
} from "./batch04/common.mjs";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));
}

const reviewedOverridesText = await readFile(
  new URL("../data/batch-04-reviewed-overrides.json", import.meta.url),
  "utf8",
);
const reviewedOverrideKeys = [
  ...reviewedOverridesText.matchAll(/^\s*"([^"]+)"\s*:/gm),
].map((match) => match[1]);
assert.equal(
  new Set(reviewedOverrideKeys).size,
  reviewedOverrideKeys.length,
  "Reviewed media overrides must not contain duplicate catalog IDs.",
);

const batch01 = await readJson("../data/batches/batch-01.json");
const batch02 = await readJson("../data/batches/batch-02.json");
const batch03 = await readJson("../data/batches/batch-03.json");
const batch04 = await readJson("../data/batches/batch-04.json");
const batch05 = await readJson("../data/batches/batch-05.json");
const batch06 = await readJson("../data/batches/batch-06.json");
const seed04 = await readJson("../data/story-seeds/batch-04-generated.json");
const seed05 = await readJson("../data/story-seeds/batch-05-generated.json");
const seed06 = await readJson("../data/story-seeds/batch-06-generated.json");
const source05 = await readJson("../data/batch-05-source.json");
const source06 = await readJson("../data/batch-06-source.json");
const candidates05 = await readJson("../data/batch-05-candidates.json");
const candidates06 = await readJson("../data/batch-06-candidates.json");
const dispositions06 = await readJson("../data/batch-06-dispositions.json");
const knowledge06 = await readJson("../data/batch-06-knowledge.json");
const reviewedMedia06 = await readJson("../data/batch-06-reviewed-media.json");
const mappingDecisions06 = await readJson("../data/batch-06-mapping-decisions.json");
const mediaReuse06 = await readJson("../data/batch-06-media-reuse.json");
const report04 = await readJson("../public/media-resolution-batch04.json");
const report05 = await readJson("../public/media-resolution-batch05.json");
const report06 = await readJson("../public/media-resolution-batch06.json");
const catalogDirectory = new URL("../data/catalog/", import.meta.url);
const catalog = (
  await Promise.all(
    (await readdir(catalogDirectory))
      .filter((name) => name.endsWith(".json"))
      .sort()
      .map(async (name) => readJson(`../data/catalog/${name}`)),
  )
).flat();
const catalogById = new Map(catalog.map((record) => [record.id, record]));
const knowledge06ById = new Map((knowledge06.items ?? []).map((item) => [item.catalogId, item]));
const reviewedMedia06Ids = new Set((reviewedMedia06.items ?? []).map((review) => review.catalogId));
for (const [catalogId, file] of Object.entries(mediaOverridesByCatalogId)) {
  assert.ok(catalogById.has(catalogId), `Reviewed media override has an unknown catalog ID: ${catalogId}.`);
  assert.ok(typeof file === "string" && file.trim(), `${catalogId}: reviewed media filename is empty.`);
}
for (const [catalogId, phrases] of Object.entries(reviewedIdentityEvidenceByCatalogId)) {
  assert.ok(
    mediaOverridesByCatalogId[catalogId] || reviewedMedia06Ids.has(catalogId),
    `Reviewed identity evidence has no reviewed media mapping: ${catalogId}.`,
  );
  assert.ok(
    Array.isArray(phrases) && phrases.every((phrase) => typeof phrase === "string" && phrase.trim()),
    `${catalogId}: reviewed identity evidence must contain non-empty phrases.`,
  );
}
const storiesBeforeBatch05 = [
  ...(await loadJsonRecords(new URL("../data/stories/", import.meta.url))),
  ...(await loadJsonRecords(new URL("../data/story-batches/", import.meta.url))),
  ...(await loadJsonRecords(
    new URL("../data/story-seeds/", import.meta.url),
    (name) => !["batch-05-generated.json", "batch-06-generated.json"].includes(name),
  )),
];
const storiesBeforeBatch06 = [...storiesBeforeBatch05, ...seed05];
const allPublishedStories = [...storiesBeforeBatch06, ...seed06];
const publishedCodesBeforeBatch05 = new Set(
  storiesBeforeBatch05.map((story) => String(story.checkout?.code ?? "")).filter(Boolean),
);
const publishedTitlesBeforeBatch05 = new Set(
  storiesBeforeBatch05.map((story) => normalize(story.title)),
);
const publishedCodesBeforeBatch06 = new Set(
  storiesBeforeBatch06.map((story) => String(story.checkout?.code ?? "")).filter(Boolean),
);
const publishedTitlesBeforeBatch06 = new Set(
  storiesBeforeBatch06.map((story) => normalize(story.title)),
);
const catalogLabelsByCode = new Map();
const catalogCodesByLabel = new Map();
for (const record of catalog) {
  const label = normalize(record.item);
  const labelCodes = catalogCodesByLabel.get(label) ?? new Set();
  for (const rawCode of record.codes ?? []) {
    const code = String(rawCode);
    if (!/^\d+$/.test(code)) continue;
    labelCodes.add(code);
    const labels = catalogLabelsByCode.get(code) ?? new Set();
    labels.add(label);
    catalogLabelsByCode.set(code, labels);
  }
  catalogCodesByLabel.set(label, labelCodes);
}
const ambiguousCatalogCodes = new Set(
  [...catalogLabelsByCode].filter(([, labels]) => labels.size > 1).map(([code]) => code),
);
const ambiguousCatalogLabels = new Set(
  [...catalogCodesByLabel].filter(([, codes]) => codes.size > 1).map(([label]) => label),
);
const packageOrInventory =
  /\b(\d+(?:\.\d+)?\s*(?:ct|lb|lbs|kg|g|l|oz)|bag|bin|bottle|box|bushel|case|carton|clamshell|crate|dome|mesh|orchard run|pack|package|pallet|pc|pint|tray|wire)\b/i;

function assertSameCatalogIds(actual, expected, message) {
  assert.deepEqual(
    [...new Set(actual)].sort(),
    [...new Set(expected)].sort(),
    message,
  );
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

assert.equal(reviewedMedia06?.schemaVersion, "1.0.0", "Unsupported Batch 06 reviewed media schema.");
assert.equal(reviewedMedia06?.batch, "06", "Batch 06 reviewed media ledger has the wrong batch.");
assert.ok(Array.isArray(reviewedMedia06?.items), "Batch 06 reviewed media ledger is malformed.");
const candidate06ById = new Map(candidates06.map((item) => [item.catalogId, item]));
const resolvedMedia06ById = new Map(report06.media.map((item) => [item.catalogId, item]));
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
  assert.ok(candidate06ById.has(review.catalogId), `${label}: entry is not a strict candidate.`);
  assert.equal(
    String(candidate06ById.get(review.catalogId).code),
    String(review.code),
    `${label}: candidate code drifted.`,
  );
  const catalogRecord = catalogById.get(review.catalogId);
  assert.ok(catalogRecord, `${label}: catalog record is missing.`);
  assert.ok(catalogRecord.codes.includes(review.code), `${label}: reviewed code is absent from catalog.`);
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
      assert.equal(claim.basis, "workbook-label", `${label}: claim basis must be workbook-label.`);
      assert.equal(claim.sourceField, "catalog.item", `${label}: claim must cite catalog.item.`);
      assert.ok(
        Array.isArray(claim.sourcePages) &&
          claim.sourcePages.length > 0 &&
          claim.sourcePages.every((page) => Number.isInteger(page) && catalogPages.has(page)),
        `${label}: claim pages must be catalog source pages.`,
      );
      assert.ok(
        includesNormalizedPhrase(catalogRecord.item, normalizedClaim),
        `${label}: claim is absent from the catalog item.`,
      );
      assert.ok(
        !Object.values(review.visibleIdentity).some((value) =>
          includesNormalizedPhrase(value, normalizedClaim),
        ),
        `${label}: workbook-only claim leaked into the visible identity.`,
      );
    }
  }
  const resolved = resolvedMedia06ById.get(review.catalogId);
  assert.equal(resolved?.match, "reviewed-override", `${label}: unreviewed media cannot publish.`);
  assert.equal(resolved?.file, review.commonsFile, `${label}: resolved media differs from the ledger.`);
  assert.deepEqual(resolved?.mediaReview, review, `${label}: report review metadata drifted.`);
  reviewedMedia06ById.set(review.catalogId, review);
}
const priorMediaFiles = new Set(
  storiesBeforeBatch06.flatMap((story) =>
    (story.photos ?? []).map(referencedCommonsFile).filter(Boolean),
  ),
);
const reviewedMedia06ByFile = new Map();
for (const review of reviewedMedia06.items) {
  const reviews = reviewedMedia06ByFile.get(review.commonsFile) ?? [];
  reviews.push(review);
  reviewedMedia06ByFile.set(review.commonsFile, reviews);
}
const sharedReviewedFiles = new Set();
for (const [commonsFile, reviews] of reviewedMedia06ByFile) {
  if (reviews.length < 2 && !priorMediaFiles.has(commonsFile)) continue;
  assert.ok(
    reviews.every(
      (review) =>
        typeof review.sharedMediaBasis === "string" && review.sharedMediaBasis.trim().length > 0,
    ),
    `${commonsFile}: every reused reviewed file needs a shared-media basis.`,
  );
  sharedReviewedFiles.add(commonsFile);
}
assertSameCatalogIds(
  report06.media.map((item) => item.catalogId),
  reviewedMedia06ById.keys(),
  "Batch 06: unreviewed media cannot appear in the resolved report.",
);

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
  assert.ok(
    batch.items.every((item) => item.status === "ready"),
    `${label}: every generated item must remain ready.`,
  );
}

assert.equal(batch06.size, 175, "Batch 06: manifest must contain the 175-row catalog remainder.");
assert.equal(batch06.items?.length, 175, "Batch 06: generated item count must be 175.");
assert.deepEqual(
  batch06.items.map((item) => item.order),
  Array.from({ length: 175 }, (_, index) => index + 1),
  "Batch 06: generated order must be continuous.",
);
assert.equal(
  new Set(batch06.items.map((item) => item.catalogId)).size,
  175,
  "Batch 06: catalog IDs must be unique.",
);
assert.ok(
  batch06.items.every((item) => ["ready", "mapped", "queued", "excluded"].includes(item.status)),
  "Batch 06: every row must have a supported learning disposition.",
);

const ready06 = batch06.items.filter((item) => item.status === "ready");
const mapped06 = batch06.items.filter((item) => item.status === "mapped");
const queued06 = batch06.items.filter((item) => item.status === "queued");
const excluded06 = batch06.items.filter((item) => item.status === "excluded");
assert.equal(mappingDecisions06?.schemaVersion, 1, "Batch 06 mapping decisions must use schema version 1.");
assert.equal(mappingDecisions06?.batch, "06", "Batch 06 mapping decisions have the wrong batch.");
assert.equal(mappingDecisions06?.items?.length, 61, "Batch 06 mapping decisions must contain 61 rows.");
const allowedMappingKinds = new Set(["single", "same-label-different-codes", "shared-code"]);
const mappingDecisions06ById = new Map();
for (const mapping of mappingDecisions06.items) {
  const label = `Batch 06 mapping/${mapping?.catalogId ?? "unknown"}`;
  assert.ok(mapping.catalogId && !mappingDecisions06ById.has(mapping.catalogId), `${label}: duplicate catalog ID.`);
  assert.ok(allowedMappingKinds.has(mapping.relationKind), `${label}: unsupported relation kind.`);
  assert.ok(typeof mapping.reviewBasis === "string" && mapping.reviewBasis.trim(), `${label}: review basis is required.`);
  assert.ok(catalogById.has(mapping.catalogId), `${label}: catalog row is missing.`);
  const knowledgeMapping = knowledge06ById.get(mapping.catalogId)?.mappingDecision;
  assert.equal(knowledgeMapping?.status, "mapped", `${label}: knowledge mapping is missing.`);
  assert.equal(knowledgeMapping?.relationKind, mapping.relationKind, `${label}: knowledge relation kind drifted.`);
  assert.equal(knowledgeMapping?.reviewBasis, mapping.reviewBasis, `${label}: knowledge review basis drifted.`);
  assert.equal(knowledgeMapping?.lessonTitle, mapping.lessonTitle, `${label}: knowledge lesson title drifted.`);
  mappingDecisions06ById.set(mapping.catalogId, mapping);
}
const ready06IdSet = new Set(ready06.map((item) => item.catalogId));
const mapped06IdSet = new Set(mapped06.map((item) => item.catalogId));
assertSameCatalogIds(
  mapped06.map((item) => item.catalogId),
  mappingDecisions06.items
    .filter((mapping) => !ready06IdSet.has(mapping.catalogId))
    .map((mapping) => mapping.catalogId),
  "Batch 06: mapped rows must be the curated mapping set minus promoted ready singles.",
);
for (const mapping of mappingDecisions06.items) {
  const status = ready06IdSet.has(mapping.catalogId) ? "ready" : mapped06IdSet.has(mapping.catalogId) ? "mapped" : null;
  assert.ok(status, `${mapping.catalogId}: curated mapping must be ready or mapped.`);
  if (status === "ready") {
    assert.equal(mapping.relationKind, "single", `${mapping.catalogId}: only a single mapping may become a lesson.`);
  } else {
    const batchItem = mapped06.find((item) => item.catalogId === mapping.catalogId);
    assert.equal(batchItem.mappingKind, mapping.relationKind, `${mapping.catalogId}: manifest mapping kind drifted.`);
    assert.equal(batchItem.mappingReason, mapping.reviewBasis, `${mapping.catalogId}: manifest mapping reason drifted.`);
  }
}

assert.equal(mediaReuse06?.schemaVersion, 1, "Batch 06 media reuse must use schema version 1.");
assert.equal(mediaReuse06?.batch, "06", "Batch 06 media reuse has the wrong batch.");
assert.equal(mediaReuse06?.items?.length, 44, "Batch 06 media reuse must contain 44 rows.");
const mediaReuse06ById = new Map();
for (const reuse of mediaReuse06.items) {
  const label = `Batch 06 reuse/${reuse?.catalogId ?? "unknown"}`;
  assert.ok(reuse.catalogId && !mediaReuse06ById.has(reuse.catalogId), `${label}: duplicate target.`);
  assert.notEqual(reuse.catalogId, reuse.sourceCatalogId, `${label}: source and target must differ.`);
  assert.ok(typeof reuse.commonsFile === "string" && reuse.commonsFile.trim(), `${label}: Commons file is required.`);
  assert.ok(typeof reuse.sharedMediaBasis === "string" && reuse.sharedMediaBasis.trim(), `${label}: shared-media basis is required.`);
  mediaReuse06ById.set(reuse.catalogId, reuse);
}
const priorStoryByCatalogId = new Map(storiesBeforeBatch06.map((story) => [story.catalogId, story]));
for (const reuse of mediaReuse06.items) {
  const label = `Batch 06 reuse/${reuse.catalogId}`;
  assert.ok(!mediaReuse06ById.has(reuse.sourceCatalogId), `${label}: reuse source may not be another reuse target.`);
  const priorStory = priorStoryByCatalogId.get(reuse.sourceCatalogId);
  const currentReview = reviewedMedia06ById.get(reuse.sourceCatalogId);
  assert.ok(priorStory || currentReview, `${label}: reviewed source is missing.`);
  assert.ok(
    priorStory
      ? priorStory.photos?.some((photo) => referencedCommonsFile(photo) === reuse.commonsFile)
      : currentReview.commonsFile === reuse.commonsFile,
    `${label}: source/file relationship drifted.`,
  );
  const mapping = mappingDecisions06ById.get(reuse.catalogId);
  if (mapping?.relationKind === "single") {
    assert.ok(ready06IdSet.has(reuse.catalogId), `${label}: reviewed single reuse must be ready.`);
    const targetReview = reviewedMedia06ById.get(reuse.catalogId);
    assert.ok(targetReview, `${label}: promoted target review is missing.`);
    assert.equal(targetReview.commonsFile, reuse.commonsFile, `${label}: promoted file drifted.`);
    assert.equal(targetReview.reuseSourceCatalogId, reuse.sourceCatalogId, `${label}: promoted source drifted.`);
    for (const [field, value] of Object.entries(reuse)) {
      if (field === "sourceCatalogId") continue;
      assert.deepEqual(targetReview[field], value, `${label}: promoted ${field} drifted.`);
    }
  } else if (mapping) {
    assert.ok(mapped06IdSet.has(reuse.catalogId), `${label}: ambiguous mapped reuse must not become ready.`);
  } else {
    assert.ok(queued06.some((item) => item.catalogId === reuse.catalogId), `${label}: unresolved reuse must remain queued.`);
  }
}
assert.equal(
  mediaReuse06.items.filter((reuse) => mappingDecisions06ById.get(reuse.catalogId)?.relationKind === "single").length,
  22,
  "Batch 06 must promote the reviewed 22-row single-mapping reuse set.",
);
assert.deepEqual(
  ready06.map((item) => item.catalogId).sort(),
  [...reviewedMedia06ById.keys()].sort(),
  "Batch 06: ready rows must match the committed reviewed-media ledger.",
);
assert.equal(seed06.length, ready06.length, "Batch 06: story count must equal ready items.");
assert.equal(source06.length, ready06.length, "Batch 06: accepted source count must equal ready items.");
assert.equal(report06.media?.length, ready06.length, "Batch 06: media count must equal ready items.");
assert.equal(report06.sourceCount, ready06.length, "Batch 06: report source count must equal ready items.");
assert.equal(report06.candidateCount, candidates06.length, "Batch 06: report candidate count drifted.");
assert.equal(report06.mapped?.length, mapped06.length, "Batch 06: report must account for every mapped row.");
assert.equal(report06.queued?.length, queued06.length, "Batch 06: report must account for every queued row.");
assert.equal(report06.excluded?.length, excluded06.length, "Batch 06: report must account for every excluded row.");

for (const item of mapped06) {
  const label = `Batch 06 mapped/${item.catalogId}`;
  assert.ok(
    ["single", "same-label-different-codes", "shared-code"].includes(item.mappingKind),
    `${label}: mapping kind is invalid.`,
  );
  assert.ok(
    typeof item.mappingReason === "string" && item.mappingReason.trim().length > 0,
    `${label}: mapping reason is required.`,
  );
}

for (const item of queued06) {
  const label = `Batch 06 queued/${item.catalogId}`;
  assert.ok(
    typeof item.queueReason === "string" && item.queueReason.trim().length > 0,
    `${label}: queue reason is required.`,
  );
  assert.ok(
    Array.isArray(item.queueReasonCodes) &&
      item.queueReasonCodes.length > 0 &&
      item.queueReasonCodes.every(
        (reason) => typeof reason === "string" && reason.trim().length > 0,
      ),
    `${label}: queue reason codes must be non-empty strings.`,
  );
}

for (const item of excluded06) {
  const label = `Batch 06 excluded/${item.catalogId}`;
  assert.ok(
    typeof item.queueReason === "string" && item.queueReason.trim().length > 0,
    `${label}: exclusion reason is required.`,
  );
  assert.ok(
    Array.isArray(item.queueReasonCodes) && item.queueReasonCodes.includes("outside-produce-scope"),
    `${label}: catalog-only rows must record the scope reason.`,
  );
}

const ready06Ids = ready06.map((item) => item.catalogId);
const queued06Ids = queued06.map((item) => item.catalogId);
assertSameCatalogIds(
  seed06.map((story) => story.catalogId),
  ready06Ids,
  "Batch 06: stories must map exactly to ready rows.",
);
assertSameCatalogIds(
  source06.map((item) => item.catalogId),
  ready06Ids,
  "Batch 06: accepted sources must map exactly to ready rows.",
);
assertSameCatalogIds(
  report06.media.map((item) => item.catalogId),
  ready06Ids,
  "Batch 06: media must map exactly to ready rows.",
);
assertSameCatalogIds(
  report06.queued.map((item) => item.catalogId),
  queued06Ids,
  "Batch 06: media report queue must match the manifest queue.",
);
assertSameCatalogIds(
  report06.mapped.map((item) => item.catalogId),
  mapped06.map((item) => item.catalogId),
  "Batch 06: media report mappings must match the manifest mappings.",
);
assertSameCatalogIds(
  report06.excluded.map((item) => item.catalogId),
  excluded06.map((item) => item.catalogId),
  "Batch 06: media report exclusions must match the manifest exclusions.",
);

const source06ById = new Map(source06.map((item) => [item.catalogId, item]));
const seed06ById = new Map(seed06.map((item) => [item.catalogId, item]));
const media06ById = new Map(report06.media.map((item) => [item.catalogId, item]));
for (const batchItem of ready06) {
  const review = reviewedMedia06ById.get(batchItem.catalogId);
  const source = source06ById.get(batchItem.catalogId);
  const seed = seed06ById.get(batchItem.catalogId);
  const media = media06ById.get(batchItem.catalogId);
  const label = `Batch 06 ready/${batchItem.catalogId}`;
  assert.ok(review && source && seed && media, `${label}: review, source, story, and media must all be present.`);
  assert.equal(String(batchItem.code), String(review.code), `${label}: manifest/review code drifted.`);
  assert.equal(media.file, review.commonsFile, `${label}: media/review file drifted.`);
  assert.equal(media.match, "reviewed-override", `${label}: unreviewed media cannot publish.`);
  assert.equal(batchItem.order, media.order, `${label}: manifest/media order drifted.`);
  assert.equal(batchItem.title, source.title, `${label}: manifest/source title drifted.`);
  assert.equal(seed.title, source.title, `${label}: seed/source title drifted.`);
  assert.equal(media.title, source.title, `${label}: media/source title drifted.`);
  assert.equal(String(batchItem.code), String(source.code), `${label}: manifest/source code drifted.`);
  assert.equal(String(seed.checkout?.code), String(source.code), `${label}: seed/source code drifted.`);
  assert.equal(media.storyId, seed.id, `${label}: media/seed story ID drifted.`);
  assert.deepEqual(source.mediaReview, review, `${label}: accepted-source review metadata drifted.`);
  assert.deepEqual(media.mediaReview, review, `${label}: media-report review metadata drifted.`);
  const flags = new Set(seed.source?.flags ?? []);
  assert.equal(
    flags.has("media-shared-reviewed"),
    sharedReviewedFiles.has(review.commonsFile),
    `${label}: shared reviewed-media flag drifted.`,
  );
  if (review.recognitionMode === "label-assisted") {
    assert.ok(flags.has("media-label-assisted"), `${label}: label-assisted media flag is required.`);
    assert.ok(flags.has("qualifier-workbook-label"), `${label}: workbook-label flag is required.`);
    assert.equal(seed.identity?.form, review.visibleIdentity.form, `${label}: visible form drifted.`);
    assert.equal(seed.identity?.color, review.visibleIdentity.color, `${label}: visible color drifted.`);
    assert.equal(seed.visualCues?.[0], review.visibleIdentity.cue, `${label}: visible cue drifted.`);
    assert.equal(seed.photos?.length, 3, `${label}: label-assisted seed needs three reviewed photo roles.`);
    const [heroPhoto, alternatePhoto, contextPhoto] = seed.photos;
    assert.ok(
      includesNormalizedPhrase(heroPhoto.alt, review.visibleIdentity.label) &&
        includesNormalizedPhrase(heroPhoto.alt, review.visibleIdentity.cue),
      `${label}: hero alt text must describe the reviewed visible label and cue.`,
    );
    assert.ok(
      includesNormalizedPhrase(alternatePhoto.alt, review.visibleIdentity.label) &&
        includesNormalizedPhrase(alternatePhoto.alt, review.visibleIdentity.form),
      `${label}: alternate alt text must describe the reviewed visible label and form.`,
    );
    assert.ok(
      includesNormalizedPhrase(contextPhoto.alt, review.visibleIdentity.label) &&
        includesNormalizedPhrase(contextPhoto.alt, review.visibleIdentity.color),
      `${label}: context alt text must describe the reviewed visible label and color.`,
    );
    const photoAltText = seed.photos.map((photo) => photo.alt).join(" ");
    const visibleCueText = normalize(seed.visualCues?.[0] ?? "");
    const disclosureText = normalize(seed.visualCues?.[1] ?? "");
    const labelMatchCue = seed.visualCues?.[2] ?? "";
    assert.ok(
      /store label/i.test(labelMatchCue) &&
        includesNormalizedPhrase(labelMatchCue, seed.title) &&
        includesNormalizedPhrase(labelMatchCue, seed.checkout?.code),
      `${label}: final cue must bind the exact listing and code to the store label.`,
    );
    const labelClaimNames = review.labelClaims.map((claim) => claim.value).join(" and ");
    const labelClaimCopula = review.labelClaims.length === 1 ? "is" : "are";
    const labelRelation = (seed.relations ?? []).find(
      (relation) => relation.title === "The store label selects this listing",
    );
    assert.ok(labelRelation, `${label}: workbook-label disclosure relation is required.`);
    const relationText = normalize(labelRelation.copy);
    for (const claim of review.labelClaims) {
      const normalizedClaim = normalize(claim.value);
      assert.ok(!includesNormalizedPhrase(photoAltText, normalizedClaim), `${label}: label claim leaked into photo alt text.`);
      assert.ok(!includesNormalizedPhrase(visibleCueText, normalizedClaim), `${label}: label claim leaked into visible cue.`);
      assert.ok(includesNormalizedPhrase(disclosureText, normalizedClaim), `${label}: cue disclosure omits ${claim.value}.`);
      assert.ok(includesNormalizedPhrase(relationText, normalizedClaim), `${label}: relation disclosure omits ${claim.value}.`);
    }
    assert.match(
      disclosureText,
      /workbook label.*not appearance/,
      `${label}: cue must distinguish workbook-label truth from appearance.`,
    );
    assert.ok(
      disclosureText.includes(normalize(`${labelClaimNames} ${labelClaimCopula} from`)),
      `${label}: cue uses incorrect label-claim number agreement.`,
    );
    assert.match(
      relationText,
      /workbook label.*not inferred from appearance/,
      `${label}: relation must distinguish workbook-label truth from appearance.`,
    );
    assert.ok(
      relationText.includes(normalize(`${labelClaimNames} ${labelClaimCopula} copied`)),
      `${label}: relation uses incorrect label-claim number agreement.`,
    );
  } else {
    assert.ok(!flags.has("media-label-assisted"), `${label}: exact visual review has label-assisted flag.`);
    assert.ok(!flags.has("qualifier-workbook-label"), `${label}: exact visual review has workbook-label flag.`);
  }
}

const seenMediaFiles = new Set(priorMediaFiles);
for (const media of [...report06.media].sort((left, right) => left.order - right.order)) {
  assert.equal(
    Boolean(media.sharedAcrossProducts),
    seenMediaFiles.has(media.file),
    `Batch 06 ready/${media.catalogId}: resolved shared-media state drifted.`,
  );
  seenMediaFiles.add(media.file);
}

const disposition06Ids = dispositions06.map((item) => item.catalogId);
assert.equal(dispositions06.length, 175, "Batch 06: disposition ledger must contain 175 rows.");
assert.equal(new Set(disposition06Ids).size, 175, "Batch 06: disposition IDs must be unique.");
assert.ok(
  dispositions06.every((item) => ["candidate", "mapped", "queued", "excluded"].includes(item.decision)),
  "Batch 06: every disposition must be candidate, mapped, queued, or excluded.",
);
for (const item of dispositions06.filter((item) => item.decision === "queued")) {
  const label = `Batch 06 disposition/${item.catalogId}`;
  assert.ok(
    typeof item.reason === "string" && item.reason.trim().length > 0,
    `${label}: queued disposition reason is required.`,
  );
  assert.ok(
    Array.isArray(item.reasonCodes) &&
      item.reasonCodes.length > 0 &&
      item.reasonCodes.every(
        (reason) => typeof reason === "string" && reason.trim().length > 0,
      ),
    `${label}: queued disposition reason codes must be non-empty strings.`,
  );
}
assertSameCatalogIds(
  batch06.items.map((item) => item.catalogId),
  disposition06Ids,
  "Batch 06: manifest must cover the full disposition ledger.",
);
const candidate06Ids = candidates06.map((item) => item.catalogId);
assert.equal(
  new Set(candidate06Ids).size,
  candidates06.length,
  "Batch 06: strict candidates must use unique catalog IDs.",
);
assertSameCatalogIds(
  dispositions06.filter((item) => item.decision === "candidate").map((item) => item.catalogId),
  candidate06Ids,
  "Batch 06: strict candidates must match candidate dispositions.",
);
const rejected06Ids = report06.rejected.map((item) => item.catalogId);
assert.equal(
  new Set(rejected06Ids).size,
  rejected06Ids.length,
  "Batch 06: rejected candidate IDs must be unique.",
);
assertSameCatalogIds(
  candidate06Ids,
  [...ready06Ids, ...rejected06Ids],
  "Batch 06: every strict candidate must be ready or explicitly rejected.",
);
assert.ok(
  rejected06Ids.every((catalogId) => queued06Ids.includes(catalogId)),
  "Batch 06: every media-rejected candidate must remain queued.",
);
assert.ok(
  ready06Ids.every((catalogId) => !rejected06Ids.includes(catalogId)),
  "Batch 06: a strict candidate may not be both ready and rejected.",
);

const disposition06ById = new Map(dispositions06.map((item) => [item.catalogId, item]));
for (const item of batch06.items) {
  const disposition = disposition06ById.get(item.catalogId);
  assert.ok(disposition, `Batch 06/${item.catalogId}: disposition is missing.`);
  assert.equal(item.title, disposition.title, `Batch 06/${item.catalogId}: disposition title drifted.`);
  assert.equal(String(item.code), String(disposition.code), `Batch 06/${item.catalogId}: disposition code drifted.`);
  assert.equal(item.family, disposition.family, `Batch 06/${item.catalogId}: disposition family drifted.`);
}

const priorCatalogIds = [batch01, batch02, batch03, batch04, batch05]
  .flatMap((batch) => batch.items.map((item) => item.catalogId));
const priorCatalogIdSet = new Set(priorCatalogIds);
const expectedRemainderIds = catalog
  .filter((record) => !priorCatalogIdSet.has(record.id))
  .map((record) => record.id);
assertSameCatalogIds(
  batch06.items.map((item) => item.catalogId),
  expectedRemainderIds,
  "Batch 06: manifest must be the exact remainder after Batches 01–05.",
);
const allBatchCatalogIds = [...priorCatalogIds, ...batch06.items.map((item) => item.catalogId)];
assert.equal(allBatchCatalogIds.length, catalog.length, "All six batches must assign 475 catalog rows.");
assert.equal(
  new Set(allBatchCatalogIds).size,
  catalog.length,
  "All six batches must cover every catalog ID exactly once.",
);
assertSameCatalogIds(
  allBatchCatalogIds,
  catalog.map((record) => record.id),
  "Six-batch coverage must equal the source catalog.",
);

assert.equal(source05.length, 100, "Batch 05 accepted source must contain exactly 100 records.");
for (let index = 0; index < 100; index += 1) {
  const source = source05[index];
  const batchItem = batch05.items[index];
  const seed = seed05[index];
  const media = report05.media[index];
  const label = `Batch 05 item ${index + 1}`;
  assert.equal(batchItem.order, index + 1, `${label}: manifest order drifted.`);
  assert.equal(media.order, index + 1, `${label}: media order drifted.`);
  assert.equal(batchItem.catalogId, source.catalogId, `${label}: manifest/source catalog ID drifted.`);
  assert.equal(seed.catalogId, source.catalogId, `${label}: seed/source catalog ID drifted.`);
  assert.equal(media.catalogId, source.catalogId, `${label}: media/source catalog ID drifted.`);
  assert.equal(batchItem.title, source.title, `${label}: manifest/source title drifted.`);
  assert.equal(seed.title, source.title, `${label}: seed/source title drifted.`);
  assert.equal(media.title, source.title, `${label}: media/source title drifted.`);
  assert.equal(String(batchItem.code), String(source.code), `${label}: manifest/source code drifted.`);
  assert.equal(String(seed.checkout?.code), String(source.code), `${label}: seed/source code drifted.`);
  assert.equal(media.storyId, seed.id, `${label}: media/seed story ID drifted.`);
}
assert.equal(
  new Set(source05.map((item) => String(item.code))).size,
  source05.length,
  "Batch 05 accepted source must use 100 unique checkout codes.",
);
const allLessonCodes = allPublishedStories
  .map((story) => String(story.checkout?.code ?? ""))
  .filter(Boolean);
assert.equal(
  new Set(allLessonCodes).size,
  allLessonCodes.length,
  "All ready lessons must use unique primary checkout codes.",
);
const totalReadyItems = [batch01, batch02, batch03, batch04, batch05, batch06]
  .flatMap((batch) => batch.items)
  .filter((item) => item.status === "ready");
assert.equal(
  allPublishedStories.length,
  totalReadyItems.length,
  "Published story count must equal the dynamic ready-item count.",
);
assertSameCatalogIds(
  allPublishedStories.map((story) => story.catalogId),
  totalReadyItems.map((item) => item.catalogId),
  "Published stories must map exactly to all ready batch items.",
);

function validateStrictCandidate(item, publishedCodes, publishedTitles, batchLabel) {
  const catalogRecord = catalogById.get(item.catalogId);
  const reviewedBatch06 = batchLabel === "Batch 06"
    ? reviewedMedia06ById.get(item.catalogId)
    : null;
  const evidenceBatch06 = batchLabel === "Batch 06"
    ? knowledge06ById.get(item.catalogId)
    : null;
  assert.ok(catalogRecord, `${batchLabel} source record is missing: ${item.catalogId}.`);
  assert.equal(item.sourceItem, catalogRecord.item, `${item.catalogId}: source identity drifted from the catalog.`);
  assert.ok(catalogRecord.codes.map(String).includes(String(item.code)), `${item.catalogId}: code drifted from the catalog.`);
  if (packageOrInventory.test(item.sourceItem)) {
    assert.equal(
      reviewedBatch06?.recognitionMode,
      "label-assisted",
      `${item.catalogId}: a packaged or inventory-specific row requires label-assisted review.`,
    );
  }
  assert.ok(
    !ambiguousCatalogLabels.has(normalize(item.sourceItem)),
    `${item.catalogId}: identical catalog label has competing codes.`,
  );
  assert.ok(
    !ambiguousCatalogCodes.has(String(item.code)),
    `${item.catalogId}: catalog code maps to competing product labels.`,
  );
  assert.ok(
    !publishedCodes.has(String(item.code)),
    `${item.catalogId}: code is already taught in a prior batch.`,
  );
  assert.ok(
    !publishedTitles.has(normalize(item.title)),
    `${item.catalogId}: learner title collides with a prior lesson.`,
  );
  const sourceNumbers = item.sourceItem.match(/\b\d{3,6}\b/g) ?? [];
  assert.ok(
    sourceNumbers.every((sourceNumber) => sourceNumber === String(item.code)),
    `${item.catalogId}: source label contains a competing number.`,
  );

  const expectedSaleForm = evidenceBatch06?.retailEvidence?.saleForm?.value ?? (
    /\bcuts?\b/i.test(item.sourceItem)
      ? "Cut"
      : /\bbunch\b/i.test(item.sourceItem)
        ? "Bunch"
        : /\bhead\b/i.test(item.sourceItem) && ["Broccoli", "Brassicas", "Cabbages", "Cauliflower", "Lettuce"].includes(item.family)
          ? "Head"
          : /\bstalk\b/i.test(item.sourceItem)
            ? "Stalk"
            : /\bcluster|on the vine\b/i.test(item.sourceItem)
              ? "Cluster"
              : item.soldBy === "Each"
                ? "Single"
                : "Loose"
  );
  if (evidenceBatch06) {
    assert.equal(
      item.soldBy,
      evidenceBatch06.retailEvidence?.soldBy?.value,
      `${item.catalogId}: sold-by value drifted from the reviewed knowledge overlay.`,
    );
  }
  assert.equal(item.saleForm, expectedSaleForm, `${item.catalogId}: sale form drifted from the source identity.`);
}

for (const item of [...candidates05, ...source05]) {
  validateStrictCandidate(
    item,
    publishedCodesBeforeBatch05,
    publishedTitlesBeforeBatch05,
    "Batch 05",
  );
}
for (const item of [...candidates06, ...source06]) {
  validateStrictCandidate(
    item,
    publishedCodesBeforeBatch06,
    publishedTitlesBeforeBatch06,
    "Batch 06",
  );
}
assert.equal(
  new Set(candidates05.map((item) => item.code)).size,
  candidates05.length,
  "Batch 05 candidates must use unique checkout codes.",
);
assert.equal(
  new Set(candidates06.map((item) => item.code)).size,
  candidates06.length,
  "Batch 06 candidates must use unique checkout codes.",
);

const identityRegressions = new Map([
  ["watercress-herbs", { family: "Leafy Greens", title: "Watercress" }],
  ["squash-banana", { family: "Squash", title: "Banana squash" }],
  ["plums-cherry-plum-handwritten", { family: "Plums", title: "Cherry Plum" }],
  ["swiss-chard-red", { family: "Leafy Greens", title: "Red Swiss chard" }],
  ["granadilla", { family: "Tropical Fruit", title: "Granadilla" }],
  ["grapefruit-red-large", { family: "Citrus", title: "Red Large grapefruit" }],
  ["pumpkins-pie", { family: "Squash", title: "Pie pumpkin" }],
  ["tamarillo-red", { family: "Tomatoes", title: "Red tamarillo" }],
  ["potato-white-baby-bulk", { family: "Potatoes", title: "White Baby potato" }],
  ["taro-root-medium", { family: "Roots", title: "Medium taro root" }],
  ["bean-sprouts", { family: "Sprouts", form: "Tender sprouted stems" }],
  ["peas-sugar-pea-tips-ethnic-veg", { family: "Leafy Greens", title: "Sugar Pea Tips", form: "Tender leafy pea shoots" }],
  ["watermelon-red-seedless-cuts", { family: "Watermelons", title: "Red seedless watermelon cuts", form: "Cut watermelon pieces", saleForm: "Cut" }],
  ["watermelons-mickey-lee", { family: "Watermelons", title: "Mickey Lee watermelon" }],
  ["quince", { family: "Quince", title: "Quince" }],
  ["arrow-head-tsee-goo", { title: "Arrow Head (Tsee Goo)" }],
  ["don-gua-winter-melon", { title: "Don Gua (Winter Melon)" }],
  ["methi-leaf-fenugreek", { title: "Methi Leaf (Fenugreek)" }],
  ["malagna-root-cocoes", { title: "Malagna Root (Cocoes)" }],
  ["pears-bartlett-organic", { title: "Organic Bartlett pear" }],
  ["lettuce-iceberg-organic", { title: "Organic Iceberg lettuce" }],
  ["tomatoes-on-the-vine-hh-organic", { title: "Organic On The Vine HH tomato" }],
  ["tomato-hh-organic", { title: "Organic HH tomato" }],
  ["melons-cantaloupe-organic", { title: "Organic Cantaloupe melon" }],
  ["cherries-rwb-organic", { title: "Organic RWB cherries" }],
  ["almonds-bulk-nuts", { family: "Nuts", title: "Almonds" }],
  ["chestnuts-bulk-nuts", { family: "Nuts", title: "Chestnuts" }],
  ["filberts-bulk-nuts", { family: "Nuts", title: "Filberts" }],
  ["drumstick", { family: "Pod Vegetables", title: "Drumstick (moringa pod)", form: "Long angular green pod" }],
  ["onions-yellow-bulk", { title: "Bulk yellow onion" }],
]);
const candidatesById = new Map(candidates05.map((item) => [item.catalogId, item]));
for (const [catalogId, expectedIdentity] of identityRegressions) {
  const candidate = candidatesById.get(catalogId);
  assert.ok(candidate, `${catalogId}: identity regression candidate is missing.`);
  for (const [field, expectedValue] of Object.entries(expectedIdentity)) {
    assert.equal(candidate[field], expectedValue, `${catalogId}: ${field} identity regressed.`);
  }
}

for (const catalogId of [
  "asparagus-organic",
  "tomatoes-roma-plum-box-half-bushel",
  "prickly-pears-tray-case",
  "peppers-green-4ct-bag",
  "garlic-1kg-bagged",
  "bananas-case",
  "apples-red-delicious-2",
  "apples-royal-gala-2",
  "apricots-2",
  "cherimoya",
  "pumpkins-large",
  "pears-red-4415",
  "bananas-baby-bananas-mini-4186",
  "onions-sweet-4166-59914",
  "cherries-white-ranier-264497",
  "methileaf-herbs",
  "avocado-caribbean",
  "cabbage-sour",
  "dill-weed-pickling-herbs",
  "garlic-loose-bulk",
  "kohlrabi-note-on-sheet-kohlrabi-1692-handwritten",
  "mushrooms-white-bulk-rcwc",
  "mangos-spice",
  "plumcots-handwritten",
  "pumpkins-jamaican",
  "sweet-potatoes-white",
  "tomatoes-vine-ripe-field-bulk",
]) {
  assert.ok(!candidatesById.has(catalogId), `${catalogId}: packaged inventory row entered the curriculum.`);
}

const pricklyPear = seed04.find((item) => item.catalogId === "prickly-pears-bulk");
assert.equal(pricklyPear?.family, "Tropical Fruit", "Prickly pear must not be classified as a pear.");
assert.equal(pricklyPear?.title, "Prickly pear", "Prickly pear learner identity regressed.");
assert.equal(
  new Set([...batch04.items, ...batch05.items].map((item) => item.catalogId)).size,
  200,
  "Batch 04 and Batch 05 may not reuse a catalog ID.",
);

console.log(
  `Verified locked Batch 04–05 data plus Batch 06's full 175-row disposition: ${ready06.length} ready lessons, ${mapped06.length} mapped references, ${queued06.length} queued rows, and ${excluded06.length} catalog-only rows.`,
);
