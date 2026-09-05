import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

import { loadJsonRecords, normalize, readJson } from "./batch04/common.mjs";
import { loadRecovery } from "./batch06-recovery.mjs";

const DISCOVERY_URL = new URL("../public/media-discovery-batch06.json", import.meta.url);
const KNOWLEDGE_URL = new URL("../data/batch-06-knowledge.json", import.meta.url);
const REVIEWED_MEDIA_URL = new URL("../data/batch-06-reviewed-media.json", import.meta.url);
const MEDIA_REUSE_URL = new URL("../data/batch-06-media-reuse.json", import.meta.url);
const DECISIONS_URL = new URL("../data/batch-06-media-review-decisions.json", import.meta.url);
const REVIEW_LANE_URLS = [
  new URL("../data/review-lanes/batch06-media-review-00-26.json", import.meta.url),
  new URL("../data/review-lanes/batch06-media-review-27-53.json", import.meta.url),
  new URL("../data/review-lanes/batch06-media-review-54-107.json", import.meta.url),
];

const FOUNDATION_IDS = new Set([
  "aloe",
  "bok-choy-shanghai-jr",
  "cherries-rwb-organic",
  "lettuce-iceberg-organic",
  "melons-cantaloupe-organic",
  "peppers-green-hh-bulk",
  "tomato-fm-on-the-vine-bulk",
  "tomato-hh-organic",
  "tomato-hh-red-bulk",
  "tomatoes-on-the-vine-hh-organic",
  "uchoy-sum",
  "yu-choy-jr",
]);

const discovery = await readJson(DISCOVERY_URL);
const knowledge = await readJson(KNOWLEDGE_URL);
const existingLedger = await readJson(REVIEWED_MEDIA_URL);
const mediaReuse = await readJson(MEDIA_REUSE_URL);
const recoveryById = await loadRecovery(await loadJsonRecords(new URL("../data/catalog/", import.meta.url)));
const recoveries = [...recoveryById.values()].filter((item) => item.decision === "approved");
const recoveryIds = new Set(recoveries.map((item) => item.catalogId));
const lanes = (await Promise.all(REVIEW_LANE_URLS.map(readJson))).flat().map((decision) => ({
  ...decision,
  decision: decision.decision === "approve"
    ? "approved"
    : decision.decision === "reject"
      ? "rejected"
      : decision.decision,
}));

assert.equal(discovery?.media?.length, 108, "The complete Batch 06 discovery report must contain 108 found candidates.");
assert.equal(knowledge?.items?.length, 175, "The Batch 06 knowledge overlay must cover all 175 rows.");
assert.equal(existingLedger?.schemaVersion, "1.0.0", "The Batch 06 reviewed-media ledger is malformed.");
assert.equal(mediaReuse?.schemaVersion, 1, "The Batch 06 media-reuse ledger is malformed.");
assert.equal(mediaReuse?.batch, "06", "The Batch 06 media-reuse ledger has the wrong batch.");
assert.equal(mediaReuse?.items?.length, 44, "The Batch 06 media-reuse ledger must contain the reviewed 44-row set.");
assert.equal(lanes.length, discovery.media.length, "Every discovered candidate needs one pixel-review decision.");

const discoveryById = new Map(discovery.media.map((item, reportIndex) => [item.catalogId, { ...item, reportIndex }]));
const knowledgeById = new Map(knowledge.items.map((item) => [item.catalogId, item]));
const decisionIds = new Set();
for (const decision of lanes) {
  const discovered = discovery.media[decision.reportIndex];
  assert.ok(discovered, `Review index ${decision.reportIndex} is outside the discovery report.`);
  assert.equal(decision.catalogId, discovered.catalogId, `${decision.catalogId}: review index/catalog mismatch.`);
  assert.ok(!decisionIds.has(decision.catalogId), `${decision.catalogId}: duplicate review decision.`);
  decisionIds.add(decision.catalogId);
  assert.ok(["approved", "rejected"].includes(decision.decision), `${decision.catalogId}: invalid review decision.`);
  assert.equal(decision.codeResolution, discovered.codeResolution, `${decision.catalogId}: code status drifted during review.`);
  assert.ok(typeof decision.reason === "string" && decision.reason.trim(), `${decision.catalogId}: review reason is required.`);
  const availableFiles = new Set([
    discovered.file,
    ...(discovered.alternatives ?? []).map((alternative) => alternative.file),
  ]);
  if (decision.decision === "approved") {
    assert.ok(availableFiles.has(decision.selectedFile), `${decision.catalogId}: selected file was not displayed for review.`);
  } else {
    assert.equal(decision.selectedFile, null, `${decision.catalogId}: rejected review must not select a file.`);
  }
}

const decisions = [...lanes].sort((left, right) => left.reportIndex - right.reportIndex);
assert.deepEqual(
  decisions.map((decision) => decision.reportIndex),
  Array.from({ length: discovery.media.length }, (_, index) => index),
  "Discovery review indexes must be continuous.",
);

const qualifierPatterns = [
  /\bOrchard Run\b/gi,
  /\bOrchard Bin\b/gi,
  /\bHalf Bushel\b/gi,
  /\bunlabelled row,\s*(?:1st|2nd)\b/gi,
  /\b\d+(?:\.\d+)?\s*(?:ct|lb|lbs|kg|g|l|oz)\b/gi,
  /\b(?:Organic|HH|FM|Jr|PC|RCWC|Bulk|Case|Bagged|Bag|Bin|Box|Bushel|Carton|Clamshell|Crate|Dome|Mesh|Pallet|Pint|Tray|Wire)\b/gi,
];

function labelQualifiers(record, evidence) {
  const values = [];
  for (const pattern of qualifierPatterns) {
    values.push(...(record.item.match(pattern) ?? []));
  }
  values.push(...(evidence.retailEvidence?.packageSignals ?? []));
  const unique = [...new Map(values.map((value) => [normalize(value), value.trim()])).values()];
  return unique.filter(
    (value) => !unique.some(
      (other) => other !== value && normalize(other).includes(normalize(value)),
    ),
  );
}

function stripLabelQualifiers(value, qualifiers) {
  let result = String(value);
  for (const qualifier of [...qualifiers].sort((left, right) => right.length - left.length)) {
    const escaped = qualifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "gi"), " ");
  }
  if (qualifiers.some((qualifier) => /\d/.test(qualifier))) {
    result = result.replace(/\b\d+(?:\.\d*)?\b/g, " ");
  }
  return result
    .replace(/[().]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/(?:\s*[-–—,.;:])+\s*$/g, "")
    .trim();
}

const foundation = existingLedger.items.filter((review) => FOUNDATION_IDS.has(review.catalogId));
assert.equal(foundation.length, FOUNDATION_IDS.size, "The reviewed foundation set is incomplete.");
const generated = [];
for (const decision of decisions) {
  if (decision.decision !== "approved" || FOUNDATION_IDS.has(decision.catalogId) || recoveryIds.has(decision.catalogId)) continue;
  const discovered = discoveryById.get(decision.catalogId);
  const evidence = knowledgeById.get(decision.catalogId);
  assert.ok(discovered && evidence, `${decision.catalogId}: review evidence is missing.`);

  const permittedBlockers = new Set([
    "duplicate-lesson-title",
    "media-evidence-required",
    "retail-package-evidence-required",
  ]);
  const blockerCodes = (evidence.publishability?.blockers ?? []).map((blocker) => blocker.code);
  const eligible =
    evidence.scope?.status === "in-scope" &&
    evidence.identityEvidence?.status === "interpreted" &&
    evidence.codeEvidence?.resolution === "catalog-supported" &&
    Boolean(evidence.codeEvidence?.primaryCode) &&
    blockerCodes.every((code) => permittedBlockers.has(code));
  if (!eligible) continue;

  const record = evidence.catalogEvidence;
  let qualifiers = labelQualifiers(record, evidence);
  if (
    !qualifiers.length &&
    (evidence.retailEvidence?.status === "package-evidence-required" || blockerCodes.includes("duplicate-lesson-title"))
  ) {
    qualifiers = [record.item];
  }
  const labelAssisted = qualifiers.length > 0;
  const visibleLabel = stripLabelQualifiers(evidence.identityEvidence.title.value, qualifiers) ||
    evidence.identityEvidence.title.value;
  assert.ok(
    !/\s[.,;:]|[-–—,.;:]\s*$/.test(visibleLabel),
    `${decision.catalogId}: visible label contains stray punctuation (${visibleLabel}).`,
  );
  const visibleForm = evidence.identityEvidence.form.value;
  const visibleColor = evidence.identityEvidence.color.value;
  const entry = {
    catalogId: decision.catalogId,
    code: String(evidence.codeEvidence.primaryCode),
    commonsFile: decision.selectedFile,
    recognitionMode: labelAssisted ? "label-assisted" : "product-and-loose-form",
    ...(labelAssisted
      ? {
          visibleIdentity: {
            label: visibleLabel,
            form: visibleForm,
            color: visibleColor,
            cue: `The reviewed photograph clearly shows ${visibleLabel.toLowerCase()} in ${visibleForm.toLowerCase()} form.`,
          },
          labelClaims: qualifiers.map((value) => ({
            value,
            basis: "workbook-label",
            sourceField: "catalog.item",
            sourcePages: record.sourcePages,
          })),
        }
      : {}),
    sharedMediaBasis:
      "The reviewed photograph anchors the visible produce identity; any store-only qualifier or retail-unit detail is read from the workbook label.",
    reviewBasis: labelAssisted
      ? `${decision.reason} Store-only or package qualifiers remain workbook-label claims and are not inferred from pixels.`
      : decision.reason,
  };
  generated.push(entry);
}

const reused = [];
for (const reuse of mediaReuse.items) {
  if (recoveryIds.has(reuse.catalogId)) continue;
  const evidence = knowledgeById.get(reuse.catalogId);
  assert.ok(evidence, `${reuse.catalogId}: media-reuse knowledge evidence is missing.`);
  if (
    evidence.mappingDecision?.relationKind !== "single" ||
    evidence.scope?.status !== "in-scope" ||
    evidence.identityEvidence?.status !== "interpreted" ||
    evidence.codeEvidence?.resolution !== "catalog-supported" ||
    !evidence.codeEvidence?.primaryCode ||
    evidence.publishability?.status !== "ready"
  ) {
    continue;
  }
  const { sourceCatalogId, ...review } = reuse;
  reused.push({
    ...review,
    code: String(evidence.codeEvidence.primaryCode),
    reuseSourceCatalogId: sourceCatalogId,
  });
}

const sourceOrderById = new Map(knowledge.items.map((item) => [item.catalogId, item.sourceOrder]));
for (const recovery of recoveries) {
  const evidence = knowledgeById.get(recovery.catalogId);
  assert.equal(evidence?.publishability?.status, "ready", `${recovery.catalogId}: recovery has unresolved admission blockers.`);
  assert.equal(evidence?.codeEvidence?.resolution, "catalog-supported", `${recovery.catalogId}: recovery cannot resolve a code conflict.`);
}
const finalLedgerItems = [...foundation, ...generated, ...reused, ...recoveries.map((item) => item.mediaReview)].sort(
  (left, right) => sourceOrderById.get(left.catalogId) - sourceOrderById.get(right.catalogId),
);
assert.equal(
  new Set(finalLedgerItems.map((review) => review.catalogId)).size,
  finalLedgerItems.length,
  "Final reviewed-media ledger contains duplicate catalog IDs.",
);

const decisionDocument = {
  schemaVersion: 1,
  batch: "06",
  method: "Pixel review of every primary and alternative returned by the full 163-identity discovery pass.",
  summary: {
    discovered: decisions.length,
    approved: decisions.filter((decision) => decision.decision === "approved").length,
    rejected: decisions.filter((decision) => decision.decision === "rejected").length,
    codeSupportedApproved: decisions.filter(
      (decision) => decision.decision === "approved" && decision.codeResolution === "catalog-supported",
    ).length,
    promotedFromReview: generated.length,
    promotedFromReuse: reused.length,
    promotedFromRecovery: recoveries.length,
  },
  items: decisions,
};
const ledgerDocument = {
  schemaVersion: "1.0.0",
  batch: "06",
  items: finalLedgerItems,
};

await writeFile(DECISIONS_URL, `${JSON.stringify(decisionDocument, null, 2)}\n`, "utf8");
await writeFile(REVIEWED_MEDIA_URL, `${JSON.stringify(ledgerDocument, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ ...decisionDocument.summary, finalReadyReviews: finalLedgerItems.length }, null, 2));
