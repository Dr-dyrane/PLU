import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

import { loadJsonRecords, normalize } from "./batch04/common.mjs";
import { loadRecovery, recoveredMediaSource } from "./batch06-recovery.mjs";
import { loadQueuedMedia } from "./batch06-queued-media.mjs";
import {
  excludedCatalogIds,
  familyRuleFor,
  inferredColor,
  inferredSoldBy,
  nonProduce,
  packageOrInventory,
  preserveSourceQualifiers,
  saleFormFor,
  titleFor,
} from "./prepare-batch05-candidates.mjs";

const EXPECTED_REMAINDER = 175;
const OUTPUT_URL = new URL("../data/batch-06-knowledge.json", import.meta.url);
const OVERRIDES_URL = new URL("../data/batch-06-knowledge-overrides.json", import.meta.url);
const MEDIA_URL = new URL("../public/media-resolution-batch06.json", import.meta.url);
const REVIEWED_MEDIA_URL = new URL("../data/batch-06-reviewed-media.json", import.meta.url);
const DISCOVERY_URL = new URL("../public/media-discovery-batch06.json", import.meta.url);
const MEDIA_DECISIONS_URL = new URL("../data/batch-06-media-review-decisions.json", import.meta.url);
const MAPPING_DECISIONS_URL = new URL("../data/batch-06-mapping-decisions.json", import.meta.url);
const MEDIA_REUSE_URL = new URL("../data/batch-06-media-reuse.json", import.meta.url);

const TARGET_OVERRIDE_IDS = [
  "artichokes-small-handwritten",
  "bartlett-orchard-run-first-word-obscured",
  "durian-frozen",
  "eddoes-handwritten",
  "gourds-ornamental",
  "jackfruit-cut-handwritten",
  "limes-key-1lb",
  "olives-green-case",
  "pistachios-bulk-nuts",
  "sweet-sop",
  "walnuts-bulk-nuts-handwritten",
];

const allowedOverrideKeys = new Set([
  "scope",
  "title",
  "family",
  "form",
  "color",
  "sale",
  "curationNote",
]);
const allowedSaleKeys = new Set(["saleForm", "soldBy"]);
const outsideProduceScope =
  /\b(baked goods|bag points|croissants?|donuts?|duck eggs?|ice|pastr(?:y|ies)|reusable bag|safety salt|water bottle)\b/i;
const identityReviewFlags = new Set(["handwritten", "obscured-label"]);
const packageSignalPattern =
  /\b(?:\d+(?:\.\d+)?\s*(?:ct|lb|lbs|kg|g|l|oz)|bag(?:ged)?|bin|bottle|box|bushel|case|carton|clamshell|crate|dome|mesh|orchard run|pack(?:age)?|pallet|pc|pint|tray|wire)\b/gi;

function readJson(url) {
  return readFile(url, "utf8").then(JSON.parse);
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

function numericCodes(record) {
  return (record.codes ?? []).map(String).filter((code) => /^\d+$/.test(code));
}

function claim(value, basis, sourceFields, confidence = "interpreted") {
  if (value === null || value === undefined || value === "") return null;
  return { value, basis, sourceFields, confidence };
}

function unique(values) {
  return [...new Set(values)];
}

function packageSignals(item) {
  return unique(item.match(packageSignalPattern)?.map((value) => value.trim()) ?? []);
}

function blocker(domain, code, detail) {
  return { domain, code, detail };
}

function nextActionFor(blockers) {
  const codes = new Set(blockers.map((entry) => entry.code));
  if (codes.has("outside-produce-learning-scope")) {
    return {
      type: "keep-out-of-produce-lessons",
      description: "Retain the catalog row for auditability, but do not build a produce lesson from it.",
    };
  }
  if (codes.has("identity-source-review") || codes.has("identity-adjudication-required")) {
    return {
      type: "adjudicate-source-identity",
      description: "Resolve the exact source wording and product identity before changing code or media state.",
    };
  }
  if (codes.has("missing-checkout-code")) {
    return {
      type: "capture-checkout-code-evidence",
      description: "Obtain a legible register, scale, label, or authoritative catalog source that binds this exact retail item to a code.",
    };
  }
  if (
    codes.has("multiple-source-codes") ||
    codes.has("conflicting-code-mapping") ||
    codes.has("competing-label-number")
  ) {
    return {
      type: "reconcile-code-mapping",
      description: "Adjudicate the competing numbers against the exact product and retail unit; do not select one by plausibility.",
    };
  }
  if (codes.has("store-barcode-not-plu")) {
    return {
      type: "separate-store-barcode-from-plu",
      description: "Confirm whether the catalog value is a store barcode, an internal lookup code, or a learner-facing produce code.",
    };
  }
  if (codes.has("retail-package-evidence-required")) {
    return {
      type: "verify-retail-unit-and-code",
      description: "Capture the exact package, case, bin, or quantity and verify that its code belongs to that retail unit.",
    };
  }
  if (codes.has("retail-unit-evidence-required")) {
    return {
      type: "verify-sold-by",
      description: "Confirm how the item is sold at checkout before using the interpreted sale form.",
    };
  }
  if (codes.has("duplicate-lesson-title")) {
    return {
      type: "decide-lesson-deduplication",
      description: "Determine whether this is a distinct retail lesson or another code/form of an existing lesson.",
    };
  }
  if (codes.has("media-evidence-required")) {
    return {
      type: "source-and-review-recognition-media",
      description: "Find a rights-compatible image whose metadata and visible retail form match this exact identity, then review it before admission.",
    };
  }
  return {
    type: "none",
    description: "All current identity, code, retail, and media gates are satisfied.",
  };
}

const overrideDocument = await readJson(OVERRIDES_URL);
const overrides = overrideDocument.overrides ?? {};
assert.equal(overrideDocument.schemaVersion, 1, "Knowledge overrides must use schema version 1.");
assert.deepEqual(
  Object.keys(overrides).sort(),
  [...TARGET_OVERRIDE_IDS].sort(),
  "Knowledge overrides must contain the exact reviewed taxonomy gap set.",
);
for (const [catalogId, override] of Object.entries(overrides)) {
  assert.deepEqual(
    Object.keys(override).filter((key) => !allowedOverrideKeys.has(key)),
    [],
    `${catalogId}: an override may not contain code or media fields.`,
  );
  assert.equal(override.scope, "in-scope", `${catalogId}: targeted produce identity must be in scope.`);
  assert.ok(override.title && override.family && override.form && override.color);
  assert.ok(override.sale && typeof override.sale === "object");
  assert.deepEqual(
    Object.keys(override.sale).filter((key) => !allowedSaleKeys.has(key)),
    [],
    `${catalogId}: sale overrides may contain only saleForm and soldBy.`,
  );
}

const catalog = await loadJsonRecords(new URL("../data/catalog/", import.meta.url));
const recoveryById = await loadRecovery(catalog);
const queuedMediaById = await loadQueuedMedia(catalog);
const publishedStories = [
  ...(await loadJsonRecords(new URL("../data/stories/", import.meta.url))),
  ...(await loadJsonRecords(new URL("../data/story-batches/", import.meta.url))),
  ...(await loadJsonRecords(
    new URL("../data/story-seeds/", import.meta.url),
    (name) => name !== "batch-06-generated.json",
  )),
];
const publishedIds = new Set(publishedStories.map((story) => story.catalogId));
const publishedTitles = new Set(publishedStories.map((story) => normalize(story.title)));
const publishedByCode = new Map();
for (const story of publishedStories) {
  const code = String(story.checkout?.code ?? "");
  if (!code) continue;
  const catalogIds = publishedByCode.get(code) ?? [];
  catalogIds.push(story.catalogId);
  publishedByCode.set(code, catalogIds);
}

const remainder = catalog.filter((record) => !publishedIds.has(record.id));
assert.equal(remainder.length, EXPECTED_REMAINDER, "Catalog remainder must contain exactly 175 rows.");
assert.equal(new Set(remainder.map((record) => record.id)).size, EXPECTED_REMAINDER);
for (const catalogId of TARGET_OVERRIDE_IDS) {
  assert.ok(remainder.some((record) => record.id === catalogId), `${catalogId}: override target is not in Batch 06.`);
}

const mappingDocument = await readJson(MAPPING_DECISIONS_URL);
assert.equal(mappingDocument.schemaVersion, 1, "Batch 06 mapping decisions must use schema version 1.");
assert.equal(mappingDocument.batch, "06", "Batch 06 mapping decisions have the wrong batch.");
assert.ok(Array.isArray(mappingDocument.items), "Batch 06 mapping decisions are missing.");
const allowedMappingKinds = new Set(["single", "same-label-different-codes", "shared-code"]);
const mappingById = new Map();
for (const mapping of mappingDocument.items) {
  assert.ok(mapping.catalogId && !mappingById.has(mapping.catalogId), `Duplicate mapping decision: ${mapping.catalogId}.`);
  assert.ok(allowedMappingKinds.has(mapping.relationKind), `${mapping.catalogId}: unsupported mapping kind.`);
  assert.ok(
    typeof mapping.reviewBasis === "string" && mapping.reviewBasis.trim(),
    `${mapping.catalogId}: mapping review basis is required.`,
  );
  assert.ok(remainder.some((record) => record.id === mapping.catalogId), `${mapping.catalogId}: mapping target is not in Batch 06.`);
  mappingById.set(mapping.catalogId, mapping);
}
assert.equal(mappingById.size, 61, "Batch 06 must preserve the reviewed 61-row mapping set.");

const reuseDocument = await readJson(MEDIA_REUSE_URL);
assert.equal(reuseDocument.schemaVersion, 1, "Batch 06 media reuse must use schema version 1.");
assert.equal(reuseDocument.batch, "06", "Batch 06 media reuse has the wrong batch.");
assert.ok(Array.isArray(reuseDocument.items), "Batch 06 media reuse items are missing.");
const reviewedMediaDocument = await readJson(REVIEWED_MEDIA_URL);
assert.equal(reviewedMediaDocument.schemaVersion, "1.0.0", "Batch 06 reviewed media must use schema version 1.0.0.");
assert.equal(reviewedMediaDocument.batch, "06", "Batch 06 reviewed media has the wrong batch.");
const reviewedLedgerByCatalogId = new Map(
  reviewedMediaDocument.items.map((review) => [review.catalogId, review]),
);
const publishedStoryByCatalogId = new Map(publishedStories.map((story) => [story.catalogId, story]));
const reuseById = new Map();
for (const reuse of reuseDocument.items) {
  assert.ok(reuse.catalogId && !reuseById.has(reuse.catalogId), `Duplicate media reuse: ${reuse.catalogId}.`);
  const record = remainder.find((candidate) => candidate.id === reuse.catalogId);
  const sourceStory = publishedStoryByCatalogId.get(reuse.sourceCatalogId);
  const sourceReview = reviewedLedgerByCatalogId.get(reuse.sourceCatalogId);
  assert.ok(record, `${reuse.catalogId}: media reuse target is not in Batch 06.`);
  assert.ok(sourceStory || sourceReview, `${reuse.catalogId}: media reuse source is missing.`);
  assert.ok(
    sourceStory
      ? sourceStory.photos?.some((photo) => referencedCommonsFile(photo) === reuse.commonsFile)
      : sourceReview.commonsFile === reuse.commonsFile,
    `${reuse.catalogId}: reused Commons file is absent from ${reuse.sourceCatalogId}.`,
  );
  assert.ok(
    ["product-and-loose-form", "label-assisted"].includes(reuse.recognitionMode),
    `${reuse.catalogId}: unsupported reuse recognition mode.`,
  );
  assert.ok(typeof reuse.reviewBasis === "string" && reuse.reviewBasis.trim(), `${reuse.catalogId}: reuse review basis is required.`);
  if (reuse.recognitionMode === "label-assisted") {
    assert.ok(reuse.visibleIdentity && Array.isArray(reuse.labelClaims) && reuse.labelClaims.length, `${reuse.catalogId}: label-assisted reuse is incomplete.`);
  }
  reuseById.set(reuse.catalogId, reuse);
}
assert.equal(reuseById.size, 44, "Batch 06 must preserve the reviewed 44-row media-reuse set.");

const catalogIdsByCode = new Map();
const labelsByCode = new Map();
const codesByLabel = new Map();
for (const record of catalog) {
  const label = normalize(record.item);
  const labelCodes = codesByLabel.get(label) ?? new Set();
  for (const code of numericCodes(record)) {
    labelCodes.add(code);
    const ids = catalogIdsByCode.get(code) ?? [];
    ids.push(record.id);
    catalogIdsByCode.set(code, ids);
    const labels = labelsByCode.get(code) ?? new Set();
    labels.add(label);
    labelsByCode.set(code, labels);
  }
  codesByLabel.set(label, labelCodes);
}

const mediaDocument = await readJson(MEDIA_URL);
const reviewedMediaById = new Map((mediaDocument.media ?? []).map((entry) => [entry.catalogId, entry]));
assert.equal(reviewedMediaById.size, mediaDocument.media?.length ?? 0, "Reviewed media IDs must be unique.");
const discoveryDocument = await readJson(DISCOVERY_URL);
const mediaDecisionDocument = await readJson(MEDIA_DECISIONS_URL);
const approvedMediaDecisions = new Map(
  (mediaDecisionDocument.items ?? [])
    .filter((decision) => decision.decision === "approved")
    .map((decision) => [decision.catalogId, decision]),
);
const discoveryById = new Map((discoveryDocument.media ?? []).map((entry) => [entry.catalogId, entry]));
assert.equal(mediaDecisionDocument?.summary?.discovered, discoveryDocument.media?.length ?? 0);

function discoveredMediaSource(catalogId) {
  const decision = approvedMediaDecisions.get(catalogId);
  const discovery = discoveryById.get(catalogId);
  if (!decision || !discovery) return null;
  const selected = [discovery, ...(discovery.alternatives ?? [])]
    .find((entry) => entry.file === decision.selectedFile);
  assert.ok(selected?.src, `${catalogId}: approved discovery media source is missing.`);
  return {
    provenance: "data/batch-06-media-review-decisions.json",
    file: decision.selectedFile,
    url: selected.src,
    match: "pixel-reviewed-candidate",
    reviewReason: decision.reason,
  };
}

function reusedMediaSource(catalogId) {
  const reuse = reuseById.get(catalogId);
  if (!reuse) return null;
  const sourceStory = publishedStoryByCatalogId.get(reuse.sourceCatalogId);
  const sourceReview = reviewedLedgerByCatalogId.get(reuse.sourceCatalogId);
  const photo = sourceStory?.photos.find(
    (candidate) => referencedCommonsFile(candidate) === reuse.commonsFile,
  ) ?? (sourceReview?.commonsFile === reuse.commonsFile ? { file: sourceReview.commonsFile } : null);
  assert.ok(photo, `${catalogId}: reused photo source is missing.`);
  const sourceUrl = photo.src ?? photo.source?.url ??
    `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(reuse.commonsFile.replaceAll(" ", "_"))}?width=1600`;
  return {
    provenance: "data/batch-06-media-reuse.json",
    file: reuse.commonsFile,
    url: sourceUrl,
    match: "reviewed-reuse-candidate",
    recognitionMode: reuse.recognitionMode,
    reviewReason: reuse.reviewBasis,
    ...(reuse.labelClaims?.length ? { labelClaims: reuse.labelClaims } : {}),
  };
}

const items = remainder.map((record, sourceIndex) => {
  const override = overrides[record.id] ?? null;
  const recovery = recoveryById.get(record.id);
  const approvedRecovery = recovery?.decision === "approved" ? recovery : null;
  const mapping = mappingById.get(record.id) ?? null;
  const mediaReuse = reuseById.get(record.id) ?? null;
  const reviewedMedia = reviewedMediaById.get(record.id) ?? null;
  const reviewedCandidateMedia = recoveredMediaSource(recovery) ?? queuedMediaById.get(record.id) ?? reusedMediaSource(record.id) ?? discoveredMediaSource(record.id);
  const recognitionMode =
    approvedRecovery?.mediaReview.recognitionMode ?? reviewedMedia?.mediaReview?.recognitionMode ?? mediaReuse?.recognitionMode ?? null;
  const labelAssisted = recognitionMode === "label-assisted";
  const rule = familyRuleFor(record.item);
  const family = override?.family ?? rule?.family ?? null;
  const generatedTitle = rule
    ? preserveSourceQualifiers(record.item, titleFor(record, rule)).replace(/\s+/g, " ").trim()
    : record.item;
  const title =
    approvedRecovery?.lessonTitle ??
    reviewedMedia?.title ??
    mediaReuse?.lessonTitle ??
    mapping?.lessonTitle ??
    override?.title ??
    generatedTitle;
  const form = approvedRecovery?.mediaReview.visibleIdentity?.form ?? override?.form ?? rule?.form ?? null;
  const color = approvedRecovery?.mediaReview.visibleIdentity?.color ?? override?.color ?? (rule ? inferredColor(title, rule.color) : null);
  const identityBasis = approvedRecovery || override ? "curated-knowledge" : rule ? "taxonomy-helper" : "catalog-label";
  const identityConfidence = approvedRecovery || override ? "curated-interpretation" : rule ? "derived" : "unresolved";

  const isOutsideScope = nonProduce.test(record.item) || outsideProduceScope.test(record.item);
  const scopeStatus = override?.scope ?? (isOutsideScope ? "out-of-scope" : rule ? "in-scope" : "needs-review");
  const scopeBasis = override ? "curated-knowledge" : isOutsideScope ? "scope-rule" : rule ? "taxonomy-helper" : "unresolved";
  const sourceFlags = record.flags ?? [];
  const unresolvedLegacyExclusion = excludedCatalogIds.has(record.id) && !approvedRecovery?.clearsLegacyExclusion;
  const needsIdentityReview =
    sourceFlags.some((flag) => identityReviewFlags.has(flag)) || unresolvedLegacyExclusion;
  const identityGaps = [
    !family && "family",
    !form && "form",
    !color && "color",
  ].filter(Boolean);

  const codes = numericCodes(record);
  const sourceNumbers = record.item.match(/\b\d{3,11}\b/g) ?? [];
  const competingNumbers = unique(sourceNumbers.filter((value) => !codes.includes(value)));
  const conflictingCatalogIds = unique(
    codes.flatMap((code) => {
      if ((labelsByCode.get(code)?.size ?? 0) < 2) return [];
      return (catalogIdsByCode.get(code) ?? []).filter((catalogId) => catalogId !== record.id);
    }),
  );
  const alreadyPublishedAs = unique(
    codes.flatMap((code) => (publishedByCode.get(code) ?? []).filter((catalogId) => catalogId !== record.id)),
  );
  const duplicateLabelCodes = (codesByLabel.get(normalize(record.item))?.size ?? 0) > 1;
  const storeBarcode =
    sourceFlags.includes("barcode-or-long-store-code") || codes.some((code) => code.length > 6);
  const codePresence = codes.length === 0 ? "missing" : codes.length === 1 ? "single" : "multiple";
  let codeResolution = "catalog-supported";
  if (!codes.length) codeResolution = "source-required";
  else if (codes.length > 1 || duplicateLabelCodes) codeResolution = "primary-code-required";
  else if (storeBarcode) codeResolution = "code-kind-required";
  else if (conflictingCatalogIds.length || alreadyPublishedAs.length || competingNumbers.length) {
    codeResolution = "conflict-review-required";
  }

  const signals = packageSignals(record.item);
  const helperSaleForm = saleFormFor(record.item, record.soldBy, family ?? "Source review");
  const saleForm = approvedRecovery?.retailInterpretation?.saleForm ?? override?.sale?.saleForm ?? helperSaleForm;
  const helperSoldBy = inferredSoldBy(record, saleForm);
  const soldBy = approvedRecovery?.retailInterpretation?.soldBy ?? override?.sale?.soldBy ?? helperSoldBy;
  const soldByBasis = record.soldBy
    ? "immutable-catalog"
    : approvedRecovery?.retailInterpretation?.soldBy || override?.sale?.soldBy
      ? "curated-knowledge"
      : "sale-helper";
  const saleFormBasis = approvedRecovery?.retailInterpretation || override?.sale?.saleForm ? "curated-knowledge" : "sale-helper";
  const needsPackageEvidence = packageOrInventory.test(record.item) || /\b(?:frozen|preserved|salted)\b/i.test(record.item);
  const retailStatus = needsPackageEvidence
    ? "package-evidence-required"
    : record.soldBy
      ? "catalog-supported"
      : "interpreted";

  const mediaStatus = scopeStatus === "out-of-scope"
    ? "not-applicable"
    : reviewedMedia
      ? "reviewed-source"
      : mediaReuse
        ? "reviewed-reuse-candidate"
        : reviewedCandidateMedia
          ? "reviewed-candidate"
        : "source-required";

  const blockers = [];
  if (scopeStatus === "out-of-scope") {
    blockers.push(blocker("scope", "outside-produce-learning-scope", "The row is not a produce-learning identity."));
  } else if (scopeStatus === "needs-review") {
    blockers.push(blocker("scope", "scope-review-required", "The product has not yet been classified as in or out of scope."));
  }
  if (scopeStatus === "in-scope" && identityGaps.length) {
    blockers.push(blocker("identity", "identity-knowledge-required", `Missing interpreted ${identityGaps.join(", ")}.`));
  }
  if (scopeStatus === "in-scope" && needsIdentityReview) {
    blockers.push(blocker("identity", "identity-source-review", "Handwritten, obscured, or separately excluded source wording needs adjudication."));
  }
  if (scopeStatus === "in-scope" && unresolvedLegacyExclusion) {
    blockers.push(blocker("identity", "identity-adjudication-required", "This catalog identity is on the explicit source-review list."));
  }
  if (scopeStatus === "in-scope" && !codes.length) {
    blockers.push(blocker("code", "missing-checkout-code", "The immutable catalog contains no numeric code for this row."));
  }
  if (scopeStatus === "in-scope" && (codes.length > 1 || duplicateLabelCodes)) {
    blockers.push(blocker("code", "multiple-source-codes", "The source label does not resolve to one unambiguous code."));
  }
  if (scopeStatus === "in-scope" && storeBarcode) {
    blockers.push(blocker("code", "store-barcode-not-plu", "The source has a long or flagged store code whose checkout role is not confirmed."));
  }
  if (scopeStatus === "in-scope" && (conflictingCatalogIds.length || alreadyPublishedAs.length)) {
    blockers.push(blocker("code", "conflicting-code-mapping", "The same code is attached to another catalog identity or published lesson."));
  }
  if (scopeStatus === "in-scope" && competingNumbers.length) {
    blockers.push(blocker("code", "competing-label-number", "The source label contains a number that is not the catalog code."));
  }
  if (scopeStatus === "in-scope" && needsPackageEvidence && !labelAssisted) {
    blockers.push(blocker("retail", "retail-package-evidence-required", "The named package, case, bin, quantity, or processed form needs exact retail evidence."));
  }
  if (scopeStatus === "in-scope" && publishedTitles.has(normalize(title))) {
    blockers.push(blocker("publishability", "duplicate-lesson-title", "A published lesson already uses this normalized title."));
  }
  if (scopeStatus === "in-scope" && !reviewedMedia && !reviewedCandidateMedia) {
    blockers.push(blocker("media", "media-evidence-required", "No human-reviewed recognition source is attached to this exact row."));
  }

  return {
    sourceOrder: sourceIndex + 1,
    catalogId: record.id,
    catalogEvidence: {
      item: record.item,
      codeText: record.codeText,
      codes: record.codes ?? [],
      soldBy: record.soldBy,
      sourcePages: record.sourcePages,
      flags: sourceFlags,
      provenance: "data/catalog/*.json",
    },
    scope: {
      status: scopeStatus,
      claim: claim(scopeStatus, scopeBasis, ["catalog.item", "catalog.flags"]),
    },
    identityEvidence: {
      status: identityGaps.length ? "incomplete" : needsIdentityReview ? "source-review-required" : "interpreted",
      title: claim(title, identityBasis, ["catalog.item"], identityConfidence),
      family: claim(family, identityBasis, ["catalog.item"], identityConfidence),
      form: claim(form, identityBasis, ["catalog.item"], identityConfidence),
      color: claim(color, identityBasis, ["catalog.item"], identityConfidence),
      curationNote: override?.curationNote ?? null,
      ...(approvedRecovery?.clearsLegacyExclusion ? {
        adjudication: {
          provenance: "data/batch-06-recovery-decisions.json",
          scope: "legacy-batch05-exclusion",
          reviewBasis: approvedRecovery.reviewBasis,
        },
      } : {}),
      evidenceGaps: identityGaps,
    },
    codeEvidence: {
      presence: codePresence,
      resolution: codeResolution,
      claims: codes.map((code) =>
        claim(code, "immutable-catalog", ["catalog.codes", "catalog.sourcePages"], "source-recorded"),
      ),
      primaryCode: codes.length === 1 ? codes[0] : null,
      codeKind: storeBarcode ? "store-barcode-or-long-code" : codes.length ? "checkout-code" : "unknown",
      duplicateLabelCodes,
      conflictingCatalogIds,
      alreadyPublishedAs,
      competingLabelNumbers: competingNumbers,
    },
    retailEvidence: {
      status: retailStatus,
      catalogSoldBy: record.soldBy,
      soldBy: claim(soldBy, soldByBasis, record.soldBy ? ["catalog.soldBy"] : ["catalog.item"]),
      saleForm: claim(saleForm, saleFormBasis, ["catalog.item", "catalog.soldBy"]),
      packageSignals: signals,
      ...(approvedRecovery?.retailInterpretation ? {
        interpretation: {
          provenance: "data/batch-06-recovery-decisions.json",
          reviewBasis: approvedRecovery.retailInterpretation.reviewBasis,
        },
      } : {}),
    },
    mediaPlan: {
      status: mediaStatus,
      query: scopeStatus === "in-scope" ? `${title} ${form ?? family ?? "produce"}` : null,
      target: scopeStatus === "in-scope"
        ? {
            identity: title,
            visibleForm: form,
            color,
            retailForm: saleForm,
          }
        : null,
      source: reviewedMedia
        ? {
            provenance: "public/media-resolution-batch06.json",
            file: reviewedMedia.file,
            url: reviewedMedia.src,
            match: reviewedMedia.match,
            recognitionMode,
            ...(reviewedMedia.mediaReview?.labelClaims?.length
              ? { labelClaims: reviewedMedia.mediaReview.labelClaims }
              : {}),
          }
        : reviewedCandidateMedia,
      acceptance: scopeStatus === "in-scope"
        ? [
            "Metadata must identify the exact product or a reviewed synonym.",
            "Visible form and identity-bearing modifiers must match the learner title.",
            "Rights and source URL must be recorded before admission.",
          ]
        : [],
    },
    mappingDecision: mapping
      ? {
          status: "mapped",
          relationKind: mapping.relationKind,
          reviewBasis: mapping.reviewBasis,
          ...(mapping.lessonTitle ? { lessonTitle: mapping.lessonTitle } : {}),
        }
      : null,
    publishability: {
      status:
        scopeStatus === "out-of-scope"
          ? "excluded"
          : blockers.length
            ? mapping
              ? "mapped"
              : "blocked"
            : "ready",
      blockers,
      nextAction: nextActionFor(blockers),
    },
  };
});

assert.equal(items.length, EXPECTED_REMAINDER);
assert.equal(new Set(items.map((item) => item.catalogId)).size, EXPECTED_REMAINDER);
for (const item of items) {
  const record = remainder.find((candidate) => candidate.id === item.catalogId);
  assert.ok(record);
  assert.deepEqual(item.catalogEvidence.codes, record.codes ?? [], `${item.catalogId}: catalog codes drifted.`);
  assert.deepEqual(
    item.codeEvidence.claims.map((entry) => entry.value),
    numericCodes(record),
    `${item.catalogId}: code evidence must be copied only from the immutable catalog.`,
  );
  if (numericCodes(record).length === 0) {
    assert.equal(item.codeEvidence.primaryCode, null, `${item.catalogId}: a missing code may not be invented.`);
  }
  const reviewedMedia = reviewedMediaById.get(item.catalogId);
  const reviewedCandidateMedia = recoveredMediaSource(recoveryById.get(item.catalogId)) ?? queuedMediaById.get(item.catalogId) ?? reusedMediaSource(item.catalogId) ?? discoveredMediaSource(item.catalogId);
  if (!reviewedMedia && !reviewedCandidateMedia) {
    assert.equal(item.mediaPlan.source, null, `${item.catalogId}: an unreviewed media source may not be invented.`);
  } else {
    const expectedSource = reviewedMedia
      ? { url: reviewedMedia.src, file: reviewedMedia.file }
      : reviewedCandidateMedia;
    assert.equal(item.mediaPlan.source?.url, expectedSource.url, `${item.catalogId}: media URL drifted.`);
    assert.equal(item.mediaPlan.source?.file, expectedSource.file, `${item.catalogId}: media file drifted.`);
  }
}

const countBy = (values) =>
  Object.fromEntries(
    [...new Set(values)].sort().map((value) => [value, values.filter((candidate) => candidate === value).length]),
  );
const summary = {
  total: items.length,
  overridesApplied: items.filter((item) => overrides[item.catalogId]).length,
  scope: countBy(items.map((item) => item.scope.status)),
  codePresence: countBy(items.map((item) => item.codeEvidence.presence)),
  codeResolution: countBy(items.map((item) => item.codeEvidence.resolution)),
  retail: countBy(items.map((item) => item.retailEvidence.status)),
  media: countBy(items.map((item) => item.mediaPlan.status)),
  publishability: countBy(items.map((item) => item.publishability.status)),
  nextActions: countBy(items.map((item) => item.publishability.nextAction.type)),
};

assert.equal(summary.overridesApplied, TARGET_OVERRIDE_IDS.length);
for (const item of items) {
  if (item.publishability.status === "ready") {
    assert.ok(item.mediaPlan.source, `${item.catalogId}: a ready row requires reviewed media.`);
    assert.equal(item.publishability.blockers.length, 0, `${item.catalogId}: a ready row cannot retain blockers.`);
  }
  if (item.publishability.status === "mapped") {
    assert.ok(mappingById.has(item.catalogId), `${item.catalogId}: mapped status requires an explicit mapping decision.`);
  }
  if (item.publishability.status === "excluded") {
    assert.equal(item.scope.status, "out-of-scope", `${item.catalogId}: only out-of-scope rows may be excluded.`);
  }
}
assert.deepEqual(
  items.filter((item) => item.mappingDecision).map((item) => item.catalogId).sort(),
  [...mappingById.keys()].sort(),
  "Knowledge mapping decisions must match the curated mapping set.",
);

const output = {
  schemaVersion: 1,
  batch: "06",
  policy: {
    authority: "Catalog codes and source pages are immutable evidence; knowledge claims are explicit interpretations.",
    admissionOrder: ["scope", "identity", "code", "retail", "media", "publishability"],
    prohibition: "Knowledge overrides may not create checkout codes or media sources.",
  },
  summary,
  items,
};

await writeFile(OUTPUT_URL, `${JSON.stringify(output, null, 2)}\n`, "utf8");

console.log(`Prepared claim-level knowledge for ${summary.total} Batch 06 rows.`);
console.log(JSON.stringify(summary, null, 2));
