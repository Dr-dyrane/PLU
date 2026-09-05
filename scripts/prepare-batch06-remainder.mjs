import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

import { loadJsonRecords, normalize, readJson, slugify } from "./batch04/common.mjs";
import {
  excludedCatalogIds,
  familyRuleFor,
  nonProduce,
  packageOrInventory,
  preserveSourceQualifiers,
  titleFor,
  uncertain,
} from "./prepare-batch05-candidates.mjs";

const CANDIDATES_URL = new URL("../data/batch-06-candidates.json", import.meta.url);
const DISPOSITIONS_URL = new URL("../data/batch-06-dispositions.json", import.meta.url);
const KNOWLEDGE_URL = new URL("../data/batch-06-knowledge.json", import.meta.url);
const REVIEWED_MEDIA_URL = new URL("../data/batch-06-reviewed-media.json", import.meta.url);
const EXPECTED_REMAINDER = 175;

const outsideProduceScope =
  /\b(baked goods|bag points|croissants?|donuts?|duck eggs?|ice|pastr(?:y|ies)|reusable bag|safety salt|water bottle)\b/i;

const reasonLabels = {
  "missing-code": "Missing verified checkout code",
  "multiple-codes": "Multiple source codes need one primary mapping",
  "outside-produce-scope": "Outside the produce-learning scope",
  "store-barcode-not-plu": "Store code type needs confirmation",
  "uncertain-source": "Source identity or code is marked uncertain",
  "package-evidence-required": "Package or case evidence is required",
  "duplicate-label-codes": "The same source label has competing codes",
  "conflicting-code": "The code is attached to another source identity",
  "already-taught-code": "The code is already taught by another lesson",
  "competing-label-number": "The source label contains a competing number",
  "duplicate-lesson-title": "The learner title already exists",
  "source-identity-review": "Source identity needs manual adjudication",
  "unclassified-product": "The product family is not yet verified",
  "strict-admission-review": "The row needs manual source review",
};

function numericCodes(record) {
  return (record.codes ?? []).map(String).filter((code) => /^\d+$/.test(code));
}

function generatedIdentity(record) {
  const rule = familyRuleFor(record.item);
  if (!rule) return { rule: null, title: record.item };
  const title = preserveSourceQualifiers(record.item, titleFor(record, rule))
    .replace(/\s+/g, " ")
    .trim();
  return { rule, title };
}

const catalog = await loadJsonRecords(new URL("../data/catalog/", import.meta.url));
const catalogById = new Map(catalog.map((record) => [record.id, record]));
const publishedStories = [
  ...(await loadJsonRecords(new URL("../data/stories/", import.meta.url))),
  ...(await loadJsonRecords(new URL("../data/story-batches/", import.meta.url))),
  ...(await loadJsonRecords(
    new URL("../data/story-seeds/", import.meta.url),
    (name) => name !== "batch-06-generated.json",
  )),
];
const publishedIds = new Set(publishedStories.map((story) => story.catalogId));
const publishedCodes = new Set(
  publishedStories.map((story) => String(story.checkout?.code ?? "")).filter(Boolean),
);
const publishedTitles = new Set(publishedStories.map((story) => normalize(story.title)));
const remainder = catalog.filter((record) => !publishedIds.has(record.id));
const knowledge = await readJson(KNOWLEDGE_URL);
const reviewedMedia = await readJson(REVIEWED_MEDIA_URL);
assert.equal(knowledge?.schemaVersion, 1, "Batch 06 knowledge must use schema version 1.");
assert.equal(reviewedMedia?.schemaVersion, "1.0.0", "Batch 06 media reviews must use schema version 1.0.0.");
assert.ok(Array.isArray(knowledge.items), "Batch 06 knowledge items are missing.");
assert.ok(Array.isArray(reviewedMedia.items), "Batch 06 media review items are missing.");

const knowledgeById = new Map(knowledge.items.map((item) => [item.catalogId, item]));
const reviewedIds = new Set();
const candidates = reviewedMedia.items.map((review, reviewIndex) => {
  assert.ok(review.catalogId, `Batch 06 media review ${reviewIndex + 1} has no catalog ID.`);
  assert.ok(!reviewedIds.has(review.catalogId), `Duplicate Batch 06 media review: ${review.catalogId}.`);
  reviewedIds.add(review.catalogId);

  const record = catalogById.get(review.catalogId);
  const evidence = knowledgeById.get(review.catalogId);
  assert.ok(record, `${review.catalogId}: reviewed media has no catalog row.`);
  assert.ok(evidence, `${review.catalogId}: reviewed media has no knowledge row.`);
  assert.equal(evidence.scope?.status, "in-scope", `${review.catalogId}: only in-scope produce may become a lesson.`);
  assert.equal(evidence.publishability?.status, "ready", `${review.catalogId}: reviewed media cannot bypass unresolved recall blockers.`);
  assert.equal(
    evidence.codeEvidence?.resolution,
    "catalog-supported",
    `${review.catalogId}: reviewed media cannot override an unresolved code.`,
  );
  assert.equal(
    String(review.code),
    String(evidence.codeEvidence.primaryCode),
    `${review.catalogId}: media-review code must equal the immutable catalog code.`,
  );

  const visible = review.visibleIdentity ?? {};
  const family = evidence.identityEvidence?.family?.value;
  const form = visible.form ?? evidence.identityEvidence?.form?.value;
  const color = visible.color ?? evidence.identityEvidence?.color?.value;
  const title = review.lessonTitle ?? (
    review.recognitionMode === "label-assisted"
      ? record.item
      : evidence.identityEvidence?.title?.value
  );
  const soldBy = evidence.retailEvidence?.soldBy?.value;
  const saleForm = evidence.retailEvidence?.saleForm?.value;
  assert.ok(title && family && form && color && soldBy && saleForm, `${review.catalogId}: reviewed candidate is incomplete.`);

  const flags = [
    ...(record.flags ?? []),
    ...(!record.soldBy ? ["sold-by-curated"] : []),
    ...((evidence.retailEvidence?.packageSignals ?? []).length ? ["retail-form-specific"] : []),
  ];
  return {
    catalogId: review.catalogId,
    title,
    code: String(review.code),
    family,
    soldBy,
    saleForm,
    form,
    color,
    imageQuery: `${visible.label ?? title} raw produce`,
    cue: visible.cue ?? `${title} is identified by its ${String(color).toLowerCase()} appearance and ${String(form).toLowerCase()}.`,
    group: slugify(family),
    sourcePages: record.sourcePages,
    ...(flags.length ? { flags: [...new Set(flags)] } : {}),
    sourceItem: record.item,
    sourceOrder: evidence.sourceOrder,
  };
});
const candidateTitles = new Set();
for (const candidate of candidates) {
  const titleKey = normalize(candidate.title);
  assert.ok(!publishedTitles.has(titleKey), `${candidate.catalogId}: reviewed lesson title is already published (${candidate.title}).`);
  assert.ok(!candidateTitles.has(titleKey), `${candidate.catalogId}: reviewed lesson title is duplicated (${candidate.title}).`);
  candidateTitles.add(titleKey);
}
 candidates.sort((left, right) => left.sourceOrder - right.sourceOrder);
const candidateById = new Map(candidates.map((candidate) => [candidate.catalogId, candidate]));

assert.equal(remainder.length, EXPECTED_REMAINDER, "Catalog remainder must contain exactly 175 rows.");
assert.equal(candidates.length, reviewedMedia.items.length, "Every reviewed Batch 06 row must become one candidate.");

const labelsByCode = new Map();
const codesByLabel = new Map();
for (const record of catalog) {
  const label = normalize(record.item);
  const codes = codesByLabel.get(label) ?? new Set();
  for (const code of numericCodes(record)) {
    codes.add(code);
    const labels = labelsByCode.get(code) ?? new Set();
    labels.add(label);
    labelsByCode.set(code, labels);
  }
  codesByLabel.set(label, codes);
}
const ambiguousCodes = new Set(
  [...labelsByCode].filter(([, labels]) => labels.size > 1).map(([code]) => code),
);
const ambiguousLabels = new Set(
  [...codesByLabel].filter(([, codes]) => codes.size > 1).map(([label]) => label),
);

const dispositions = remainder.map((record, sourceIndex) => {
  const candidate = candidateById.get(record.id);
  const evidence = knowledgeById.get(record.id);
  const { rule, title } = generatedIdentity(record);
  if (candidate) {
    return {
      sourceOrder: sourceIndex + 1,
      catalogId: record.id,
      sourceItem: record.item,
      title: candidate.title,
      code: candidate.code,
      family: candidate.family,
      sourcePages: record.sourcePages,
      decision: "candidate",
      reasonCodes: [],
      reason: "Passed exact-code and loose-produce admission; media review required.",
    };
  }

  if (evidence?.publishability?.status === "excluded") {
    return {
      sourceOrder: sourceIndex + 1,
      catalogId: record.id,
      sourceItem: record.item,
      title: record.item,
      code: numericCodes(record).length ? numericCodes(record).join(" / ") : "Code needed",
      family: rule?.family ?? "Catalog only",
      sourcePages: record.sourcePages,
      decision: "excluded",
      reasonCodes: ["outside-produce-scope"],
      reason: reasonLabels["outside-produce-scope"],
      flags: record.flags ?? [],
    };
  }

  if (evidence?.publishability?.status === "mapped") {
    const mapping = evidence.mappingDecision;
    return {
      sourceOrder: sourceIndex + 1,
      catalogId: record.id,
      sourceItem: record.item,
      title: mapping?.lessonTitle ?? record.item,
      code: numericCodes(record).length ? numericCodes(record).join(" / ") : "Code needed",
      family: rule?.family ?? evidence.identityEvidence?.family?.value ?? "Mapped reference",
      sourcePages: record.sourcePages,
      decision: "mapped",
      mappingKind: mapping.relationKind,
      reasonCodes: [],
      reason: mapping.reviewBasis,
      flags: record.flags ?? [],
    };
  }

  const codes = numericCodes(record);
  const reasons = [];
  const sourceText = `${record.item} ${(record.flags ?? []).join(" ")}`;
  if (!codes.length) reasons.push("missing-code");
  if (codes.length > 1) reasons.push("multiple-codes");
  if (nonProduce.test(record.item) || outsideProduceScope.test(record.item)) {
    reasons.push("outside-produce-scope");
  }
  if ((record.flags ?? []).includes("barcode-or-long-store-code") || codes.some((code) => code.length > 6)) {
    reasons.push("store-barcode-not-plu");
  }
  if (uncertain.test(sourceText) || (record.flags ?? []).includes("handwritten")) {
    reasons.push("uncertain-source");
  }
  if (packageOrInventory.test(record.item)) reasons.push("package-evidence-required");
  if (ambiguousLabels.has(normalize(record.item))) reasons.push("duplicate-label-codes");
  if (codes.some((code) => ambiguousCodes.has(code))) reasons.push("conflicting-code");
  if (codes.some((code) => publishedCodes.has(code))) reasons.push("already-taught-code");
  const sourceNumbers = record.item.match(/\b\d{3,6}\b/g) ?? [];
  if (sourceNumbers.some((sourceNumber) => !codes.includes(sourceNumber))) {
    reasons.push("competing-label-number");
  }
  if (publishedTitles.has(normalize(title))) reasons.push("duplicate-lesson-title");
  if (excludedCatalogIds.has(record.id)) reasons.push("source-identity-review");
  if (!rule) reasons.push("unclassified-product");
  if (!reasons.length) reasons.push("strict-admission-review");

  const reasonCodes = [...new Set(reasons)];
  return {
    sourceOrder: sourceIndex + 1,
    catalogId: record.id,
    sourceItem: record.item,
    title: record.item,
    code: codes.length ? codes.join(" / ") : "Code needed",
    family: rule?.family ?? "Source review",
    sourcePages: record.sourcePages,
    decision: "queued",
    reasonCodes,
    reason: reasonLabels[reasonCodes[0]],
    flags: record.flags ?? [],
  };
});

assert.equal(dispositions.length, EXPECTED_REMAINDER);
assert.equal(new Set(dispositions.map((item) => item.catalogId)).size, EXPECTED_REMAINDER);
assert.equal(dispositions.filter((item) => item.decision === "candidate").length, candidates.length);
assert.equal(
  dispositions.filter((item) => ["candidate", "mapped", "queued", "excluded"].includes(item.decision)).length,
  EXPECTED_REMAINDER,
);

await writeFile(CANDIDATES_URL, `${JSON.stringify(candidates, null, 2)}\n`, "utf8");
await writeFile(DISPOSITIONS_URL, `${JSON.stringify(dispositions, null, 2)}\n`, "utf8");

console.log(
  `Prepared all ${dispositions.length} remaining catalog rows: ${candidates.length} lesson candidates, ${dispositions.filter((item) => item.decision === "mapped").length} mapped references, ${dispositions.filter((item) => item.decision === "queued").length} evidence-gated rows, and ${dispositions.filter((item) => item.decision === "excluded").length} catalog-only rows.`,
);
