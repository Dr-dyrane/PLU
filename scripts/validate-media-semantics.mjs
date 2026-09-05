import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { vanigliaPhoto } from "./batch06-external-photo.mjs";

import {
  allowedMime,
  hardBlockedTokens,
  knownBadMediaFiles,
  loadJsonRecords,
  mediaOverridesByCatalogId,
  normalize,
  productHeadGroups,
  queryAliasesByCatalogId,
  reviewedIdentityEvidenceByCatalogId,
  softBlockedTokens,
  words,
} from "./batch04/common.mjs";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));
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

function targetHead(item) {
  const title = new Set(words(item.title));
  const direct = productHeadGroups.find((group) => group.some((token) => title.has(token)));
  if (direct) return direct;
  const target = new Set([
    ...words(item.title),
    ...words(item.query),
    ...(queryAliasesByCatalogId[item.catalogId] ?? []).flatMap(words),
  ]);
  return productHeadGroups.find((group) => group.some((token) => target.has(token))) ?? [];
}

const rawSubjectTokens = new Set([
  "bunch", "corm", "corms", "fruit", "fruits", "market", "pod", "pods",
  "produce", "root", "roots", "stalk", "stalks", "tuber", "tubers",
  "vegetable", "vegetables", "whole",
]);
const metadataHardBlockExceptions = new Set([
  "bird", "garden", "label", "orchard", "plant", "price", "seed", "seeds", "tree",
]);
function validateMediaItem(item, label, { requireExactIdentity = false, review = null } = {}) {
  assert.ok(item.catalogId && item.title && item.file, `${label}: identity fields are required.`);
  assert.ok(!knownBadMediaFiles.has(item.file), `${label}: known incorrect image is still selected: ${item.file}`);
  assert.ok(allowedMime.has(item.mime), `${label}: unsupported image type ${item.mime}.`);
  assert.ok(Number(item.width) >= 360 && Number(item.height) >= 300, `${label}: source image is too small.`);
  if (["persimmons-vanilla", "persimmons-vanilla-case"].includes(item.catalogId)) {
    assert.equal(item.src, vanigliaPhoto.src, `${label}: only the exact reviewed research source is allowed.`);
    assert.equal(item.file, vanigliaPhoto.src);
    assert.equal(item.sourceSha256, vanigliaPhoto.sha256);
    assert.deepEqual(item.viewport, vanigliaPhoto.viewport);
  } else {
    assert.ok(typeof item.src === "string" && /^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(item.src),
      `${label}: image must resolve through Wikimedia's image host.`);
  }

  const filenameTokens = new Set(words(item.file));
  const sourceTokens = new Set(words(Object.values(item.sourceEvidence ?? {}).join(" ")));
  const sourceContextTokens = new Set(
    words([
      item.sourceEvidence?.title,
      item.sourceEvidence?.objectName,
      item.sourceEvidence?.categories,
    ].join(" ")),
  );
  assert.ok(sourceTokens.size > 0, `${label}: committed Commons source evidence is required.`);
  for (const token of hardBlockedTokens) {
    assert.ok(!filenameTokens.has(token), `${label}: filename contains blocked subject '${token}'.`);
    assert.ok(
      !sourceContextTokens.has(token) || metadataHardBlockExceptions.has(token),
      `${label}: Commons metadata contains blocked subject '${token}'.`,
    );
  }

  const target = new Set(
    [...(review?.contextTokens ?? []), ...(review?.recognitionMode === "label-assisted"
      ? Object.values(review.visibleIdentity).flatMap(words)
      : [
          ...words(item.title),
          ...words(item.query),
          ...(queryAliasesByCatalogId[item.catalogId] ?? []).flatMap(words),
        ])],
  );
  for (const token of softBlockedTokens) {
    assert.ok(
      !filenameTokens.has(token) || target.has(token),
      `${label}: image is a non-retail '${token}' view rather than the checkout item.`,
    );
    assert.ok(
      !sourceContextTokens.has(token) ||
        target.has(token) ||
        [...rawSubjectTokens].some((subject) => sourceContextTokens.has(subject)),
      `${label}: Commons metadata describes a non-retail '${token}' view without a checkout subject.`,
    );
  }

  assert.ok(
    ["strict-identity-match", "clean-family-fallback", "reviewed-override"].includes(item.match),
    `${label}: unreviewed media match mode ${item.match}.`,
  );
  if (requireExactIdentity) {
    assert.notEqual(
      item.match,
      "clean-family-fallback",
      `${label}: Batch 06 may only publish exact or explicitly reviewed identity evidence.`,
    );
  }

  const reviewedFile = review?.commonsFile ?? mediaOverridesByCatalogId[item.catalogId];
  if (reviewedFile) {
    assert.equal(item.match, "reviewed-override", `${label}: configured reviewed override was not used.`);
    assert.equal(item.file, reviewedFile, `${label}: incorrect reviewed override file.`);
    const head = targetHead(
      review?.recognitionMode === "label-assisted"
        ? {
            ...item,
            title: review.visibleIdentity.label,
            query: review.visibleIdentity.cue,
          }
        : item,
    );
    const headMatches = head.filter((token) => sourceTokens.has(token));
    const explicitEvidence = [...(reviewedIdentityEvidenceByCatalogId[item.catalogId] ?? []), ...(review?.identityEvidence ?? [])].find((phrase) => {
      const tokens = words(phrase);
      return tokens.length > 0 && tokens.every((token) => sourceTokens.has(token));
    });
    assert.ok(
      headMatches.length > 0 || explicitEvidence,
      `${label}: reviewed override has no committed product identity evidence.`,
    );
  } else {
    const head = targetHead(item);
    assert.ok(head.length > 0, `${label}: no product-head vocabulary is configured.`);
    assert.ok(
      head.some((token) => filenameTokens.has(token)),
      `${label}: filename does not identify the intended product family (${item.file}).`,
    );
  }

  if (item.match !== "reviewed-override") assert.ok(Number(item.score) >= 55, `${label}: resolver confidence is below 55.`);
  assert.ok(!/\b(18\d{2}|19[0-5]\d)\b/.test(normalize(item.file)), `${label}: historical scan selected.`);
}

const batch06 = await readJson("../data/batches/batch-06.json");
const reviewedMedia06 = await readJson("../data/batch-06-reviewed-media.json");
const report04 = await readJson("../public/media-resolution-batch04.json");
const report05 = await readJson("../public/media-resolution-batch05.json");
const report06 = await readJson("../public/media-resolution-batch06.json");
const catalog = await loadJsonRecords(new URL("../data/catalog/", import.meta.url));
const catalogById = new Map(catalog.map((record) => [record.id, record]));
const storiesBeforeBatch06 = [
  ...(await loadJsonRecords(new URL("../data/stories/", import.meta.url))),
  ...(await loadJsonRecords(new URL("../data/story-batches/", import.meta.url))),
  ...(await loadJsonRecords(
    new URL("../data/story-seeds/", import.meta.url),
    (name) => name !== "batch-06-generated.json",
  )),
];
const ready06 = batch06.items.filter((item) => item.status === "ready");
assert.equal(reviewedMedia06?.schemaVersion, "1.0.0", "Unsupported Batch 06 reviewed media schema.");
assert.equal(reviewedMedia06?.batch, "06", "Batch 06 reviewed media ledger has the wrong batch.");
assert.ok(Array.isArray(reviewedMedia06?.items), "Batch 06 reviewed media ledger is malformed.");
const ready06ById = new Map(ready06.map((item) => [item.catalogId, item]));
const report06ById = new Map(report06.media.map((item) => [item.catalogId, item]));
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
  assert.equal(String(ready06ById.get(review.catalogId)?.code), String(review.code), `${label}: code drifted.`);
  const resolved = report06ById.get(review.catalogId);
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
for (const [commonsFile, reviews] of reviewedMedia06ByFile) {
  if (reviews.length < 2 && !priorMediaFiles.has(commonsFile)) continue;
  assert.ok(
    reviews.every(
      (review) =>
        typeof review.sharedMediaBasis === "string" && review.sharedMediaBasis.trim().length > 0,
    ),
    `${commonsFile}: every reused reviewed file needs a shared-media basis.`,
  );
}
assert.deepEqual(
  ready06.map((item) => item.catalogId).sort(),
  [...reviewedMedia06ById.keys()].sort(),
  "Batch 06 ready rows must match the committed reviewed-media ledger.",
);
assert.deepEqual(
  report06.media.map((item) => item.catalogId).sort(),
  [...reviewedMedia06ById.keys()].sort(),
  "Batch 06 resolved media must match the committed reviewed-media ledger.",
);
const reports = [
  {
    label: "Batch 04",
    report: report04,
    expectedCount: 100,
    requireExactIdentity: false,
  },
  {
    label: "Batch 05",
    report: report05,
    expectedCount: 100,
    requireExactIdentity: false,
  },
  {
    label: "Batch 06",
    report: report06,
    expectedCount: ready06.length,
    requireExactIdentity: true,
    reviews: reviewedMedia06ById,
  },
];

const exactMappings = new Set();
let validated = 0;
for (const { label: batchLabel, report, expectedCount, requireExactIdentity, reviews } of reports) {
  assert.equal(
    report.media?.length,
    expectedCount,
    `${batchLabel}: media selections must equal the ready lesson count.`,
  );
  for (const item of report.media) {
    const label = `${batchLabel}/${item.order}/${item.title}`;
    validateMediaItem(item, label, {
      requireExactIdentity,
      review: reviews?.get(item.catalogId) ?? null,
    });
    const mapping = `${item.catalogId}:${item.storyId}`;
    assert.ok(!exactMappings.has(mapping), `${label}: duplicate image audit mapping.`);
    exactMappings.add(mapping);
    validated += 1;
  }
}

assert.deepEqual(
  reports.at(-1).report.media.map((item) => item.catalogId).sort(),
  ready06.map((item) => item.catalogId).sort(),
  "Batch 06 media must map exactly to its ready manifest items.",
);

console.log(
  `Validated ${validated} Batch 04–06 ready media selections for product-head identity, safe subject matter, dimensions, source host, and reviewed overrides.`,
);
