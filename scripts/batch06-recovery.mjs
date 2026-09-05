import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { words } from "./batch04/common.mjs";
import { validateExternalPhoto } from "./batch06-external-photo.mjs";

export const legacyRecoveryIds = new Set([
  "asparagus-organic", "dill-weed-pickling-herbs", "garlic-loose-bulk",
  "methileaf-herbs", "mushrooms-white-bulk-rcwc", "tomatoes-vine-ripe-field-bulk",
  "sweet-potatoes-white", "avocado-caribbean",
]);
export const recoveryIds = new Set([
  ...legacyRecoveryIds,
  "apples-lady-alice-pc", "blackberries-pint-12oz", "celery-hearts",
  "cucumbers-dill-case", "garlic-peeled-5lb", "melons-goldendew", "melons-honeykiss",
  "olives-green-case", "papayas-meridol", "pears-taylor-gold", "persimmons-vanilla",
  "persimmons-vanilla-case", "pistachios-bulk-nuts", "raspberries-red-half-pint-6oz",
  "raspberries-red-pint-12oz", "sher-li-hon", "strawberries-1lb", "strawberries-2lb",
  "tangerines-fall-glo", "watermelons-mickey-lee",
]);

// A bounded evidence decision can clear an old selection exclusion, never a
// handwritten source flag, missing code, or collision with another catalog row.
export function validateRecovery(document, catalog) {
  assert.equal(document.schemaVersion, 1, "Unsupported Batch 06 recovery schema.");
  assert.equal(document.batch, "06", "Recovery belongs to Batch 06.");
  assert.ok(Array.isArray(document.items), "Recovery decisions are missing.");
  assert.deepEqual(document.items.map((item) => item.catalogId).sort(), [...recoveryIds].sort(),
    "Recovery must account for the exact eight exclusions and twenty media cases.");
  const catalogById = new Map(catalog.map((record) => [record.id, record]));
  for (const item of document.items) {
    const record = catalogById.get(item.catalogId);
    const label = `Batch 06 recovery/${item.catalogId}`;
    assert.ok(record, `${label}: catalog source is missing.`);
    assert.ok(["approved", "unresolved"].includes(item.decision), `${label}: invalid decision.`);
    assert.ok(item.reviewBasis?.trim(), `${label}: evidence decision is required.`);
    assert.equal(item.sourceItem, record.item, `${label}: source label drifted.`);
    assert.equal(item.code, record.codeText, `${label}: source code drifted.`);
    assert.deepEqual(item.sourcePages, record.sourcePages, `${label}: source pages drifted.`);
    if (item.decision !== "approved") {
      assert.ok(!item.mediaReview && !item.clearsLegacyExclusion,
        `${label}: unresolved evidence cannot authorize publication.`);
      continue;
    }
    assert.deepEqual(record.codes, [item.code], `${label}: approval requires one exact source code.`);
    assert.ok(!record.flags?.some((flag) => ["handwritten", "obscured-label"].includes(flag)),
      `${label}: original source uncertainty cannot be cleared by this recovery pass.`);
    assert.equal(Boolean(item.clearsLegacyExclusion), legacyRecoveryIds.has(item.catalogId),
      `${label}: only the eight reviewed legacy exclusions can be cleared.`);
    assert.ok(item.mediaReview?.commonsFile && item.src && item.sourceUrl && item.license && item.author,
      `${label}: approved recovery requires reviewed photo provenance and rights.`);
    if (item.externalPhoto) validateExternalPhoto(item);
    else assert.match(item.src, /^https:\/\/(?:upload|thumb)\.wikimedia\.org\//,
      `${label}: recovery photo must have a supported media URL.`);
    assert.equal(item.mediaReview.catalogId, item.catalogId, `${label}: media target drifted.`);
    assert.equal(item.mediaReview.code, item.code, `${label}: media cannot change the checkout code.`);
    assert.ok(item.mediaReview.reviewBasis?.trim(), `${label}: pixel-review basis is missing.`);
    for (const token of item.mediaReview.contextTokens ?? []) {
      assert.ok(["garden", "tree", "plant", "orchard"].includes(token),
        `${label}: only reviewed growing-context terms may bypass an automatic context filter.`);
    }
    if (item.mediaReview.identityEvidence) {
      assert.ok(item.identitySources?.length > 0 && item.mediaReview.identityEvidence.every((phrase) => words(phrase).length > 0),
        `${label}: synonym evidence needs a cited identity source.`);
    }
    if (!item.externalPhoto) assert.match(item.sourceUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/,
      `${label}: attribution must link to the exact Commons file.`);
    const roles = new Set();
    for (const photo of item.reviewedPhotos ?? []) {
      assert.ok(["hero", "alternate", "context"].includes(photo.role) && !roles.has(photo.role),
        `${label}: reviewed photo roles must be supported and unique.`);
      roles.add(photo.role);
      assert.ok(photo.commonsFile && photo.author && photo.license && photo.reviewBasis,
        `${label}: every role photograph needs provenance and a pixel review.`);
      assert.match(photo.src, /^https:\/\/(?:upload|thumb)\.wikimedia\.org\//);
      assert.match(photo.sourceUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      if (photo.role === "hero") assert.equal(photo.commonsFile, item.mediaReview.commonsFile,
        `${label}: hero must match the primary reviewed photograph.`);
    }
    if (item.retailInterpretation) {
      assert.ok(item.retailInterpretation.reviewBasis?.trim(), `${label}: retail interpretation needs evidence.`);
      assert.ok(item.retailInterpretation.soldBy && item.retailInterpretation.saleForm,
        `${label}: retail interpretation is incomplete.`);
      assert.ok(["Weight", "Each"].includes(item.retailInterpretation.soldBy),
        `${label}: checkout unit must follow the existing Weight/Each contract.`);
      if (record.soldBy) assert.equal(item.retailInterpretation.soldBy, record.soldBy,
        `${label}: recovery cannot overwrite a recorded checkout unit.`);
    }
  }
  return new Map(document.items.map((item) => [item.catalogId, item]));
}

export async function loadRecovery(catalog) {
  const document = JSON.parse(await readFile(new URL("../data/batch-06-recovery-decisions.json", import.meta.url), "utf8"));
  return validateRecovery(document, catalog);
}

export function recoveredMediaSource(recovery) {
  if (recovery?.decision !== "approved") return null;
  return {
    provenance: "data/batch-06-recovery-decisions.json",
    file: recovery.mediaReview.commonsFile,
    url: recovery.src,
    match: "pixel-reviewed-candidate",
    recognitionMode: recovery.mediaReview.recognitionMode,
    reviewReason: recovery.mediaReview.reviewBasis,
    ...(recovery.mediaReview.labelClaims?.length ? { labelClaims: recovery.mediaReview.labelClaims } : {}),
  };
}
