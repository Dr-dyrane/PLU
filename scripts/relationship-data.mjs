import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadJsonRecords, normalize } from "./batch04/common.mjs";

export const relationshipIds = [
  "apples-gala", "apples-red-delicious-2", "apples-royal-gala-2", "apricots-2",
  "carrots-chinese-jumbo", "cherimoya", "cherimoya-2", "grapefruit-bin", "mangoes",
  "mangos-red-case", "oranges-navel-large", "oranges-navel-medium", "parsley-curley-herbs",
  "pears-asian-yellow-2", "pears-bosc-large", "pears-forelle-2", "pumpkins-large",
  "pumpkins-large-2", "yams-white",
];
export async function readJson(path) {
  return JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
}
export async function loadRelationshipInputs() {
  const [decisions, catalog, knowledge, reviews, reuses, batches] = await Promise.all([
    readJson("data/batch-06-relationship-decisions.json"),
    loadJsonRecords(new URL("../data/catalog/", import.meta.url)),
    readJson("data/batch-06-knowledge.json"),
    readJson("data/batch-06-media-review-decisions.json"),
    readJson("data/batch-06-media-reuse.json"),
    loadJsonRecords(new URL("../data/batches/", import.meta.url)),
  ]);
  return { decisions, catalog, knowledge, reviews, reuses, batches };
}
export function validateRelationshipDecisions({ decisions, catalog, knowledge, reviews, reuses, batches }) {
  assert.equal(decisions.schemaVersion, 1);
  assert.deepEqual(decisions.items.map(x => x.catalogId).sort(), [...relationshipIds].sort(), "Exact 19 relationship records required.");
  const byId = new Map(catalog.map(x => [x.id, x]));
  const statuses = new Map(batches.flatMap(x => x.items).map(x => [x.catalogId, x.status]));
  for (const decision of decisions.items) {
    const source = byId.get(decision.catalogId);
    const item = knowledge.items.find(x => x.catalogId === decision.catalogId);
    assert.equal(statuses.get(source.id), "mapped", `${source.id}: relationship study cannot promote checkout readiness.`);
    assert.equal(item.publishability.status, "mapped");
    assert.equal(decision.relationKind, item.mappingDecision.relationKind);
    for (const [field, value] of Object.entries({ sourceItem: source.item, codeText: source.codeText, codes: source.codes, sourcePages: source.sourcePages, soldBy: source.soldBy, flags: source.flags })) {
      assert.deepEqual(decision[field], value, `${source.id}: source ${field} drifted.`);
    }
    assert.ok(source.codes.every(code => /^\d+$/.test(code)));
    assert.ok(!source.flags.some(flag => ["handwritten", "obscured-label", "unverified-code"].includes(flag)));
    const neighbors = catalog.filter(x => x.id !== source.id && (normalize(x.item) === normalize(source.item) || x.codes.some(code => source.codes.includes(code))));
    assert.deepEqual([...decision.relatedCatalogIds].sort(), neighbors.map(x => x.id).sort(), `${source.id}: a source relationship is missing.`);
    assert.deepEqual(decision.relatedRecords.map(x => x.catalogId).sort(), [...decision.relatedCatalogIds].sort());
    for (const member of decision.relatedRecords) {
      const record = byId.get(member.catalogId);
      for (const [field, value] of Object.entries({ sourceItem: record.item, codeText: record.codeText, codes: record.codes, sourcePages: record.sourcePages, soldBy: record.soldBy, flags: record.flags, status: statuses.get(record.id) })) {
        assert.deepEqual(member[field], value, `${source.id}/${record.id}: neighbor ${field} drifted.`);
      }
    }
    assert.deepEqual(decision.learningContract.answerCodes, source.codes);
    assert.equal(decision.learningContract.answerPolicy, source.codes.length === 1 ? "exact-single" : "complete-unordered-set");
    assert.equal(decision.learningContract.sourceContextRequired, true);
    assert.equal(decision.learningContract.checkoutSelectionResolved, false);
    assert.equal(decision.learningContract.completionKind, "relationship-study");
    assert.ok(decision.checkoutCaveat.trim() && decision.reviewBasis.trim());
    const media = decision.mediaEvidence;
    const review = reviews.items.find(x => x.catalogId === source.id && x.decision === "approved");
    const reuse = reuses.items.find(x => x.catalogId === source.id);
    const originalFile = media.replacementReview?.replacesCommonsFile ?? media.commonsFile;
    assert.equal(originalFile, item.mediaPlan.source.file, `${source.id}: media selection drifted.`);
    assert.ok(review?.selectedFile === originalFile || reuse?.commonsFile === originalFile, `${source.id}: no approved recognition evidence.`);
    if (media.replacementReview) {
      assert.equal(source.id, "pears-bosc-large", "Only the inspected broken Bosc reference may be replaced here.");
      assert.equal(originalFile, "Bosc Pear.jpg");
      assert.equal(media.commonsFile, "Bosc pear.jpg");
      assert.equal(media.replacementReview.sourceUrl, "https://commons.wikimedia.org/wiki/File:Bosc_pear.jpg");
      assert.ok(media.replacementReview.author && media.replacementReview.license && media.replacementReview.reviewBasis);
    }
    assert.ok(media.visibleIdentity.cue && media.reviewBasis);
  }
}
export function makeRelationshipLesson(decision, photo) {
  return {
    catalogId: decision.catalogId,
    title: decision.sourceItem,
    relationKind: decision.relationKind,
    codes: decision.codes,
    sourcePages: decision.sourcePages,
    soldBy: decision.soldBy,
    photo,
    visualCue: decision.mediaEvidence.visibleIdentity.cue,
    qualifierNote: decision.mediaEvidence.labelClaims.length
      ? `${decision.mediaEvidence.labelClaims.map(x => x.value).join(", ")} comes from the workbook label, not the photograph.`
      : "The photograph supports produce recognition, not selection of a checkout code.",
    reviewBasis: decision.reviewBasis,
    checkoutCaveat: decision.checkoutCaveat,
    members: decision.relatedRecords.map(x => ({
      catalogId: x.catalogId, item: x.sourceItem, codes: x.codes, sourcePages: x.sourcePages,
      soldBy: x.soldBy, flags: x.flags, status: x.status,
    })),
  };
}
export function validateRelationshipLessons(document, inputs) {
  validateRelationshipDecisions(inputs);
  assert.equal(document.schemaVersion, 1);
  assert.deepEqual(document.items.map(x => x.catalogId).sort(), [...relationshipIds].sort());
  for (const decision of inputs.decisions.items) {
    const item = document.items.find(x => x.catalogId === decision.catalogId);
    assert.deepEqual(item, makeRelationshipLesson(decision, item.photo), `${item.catalogId}: generated relationship data drifted.`);
    assert.equal(item.photo.role, "hero");
    assert.match(item.photo.src, /^https:\/\/(?:upload|thumb)\.wikimedia\.org\//);
    assert.equal(decodeURIComponent(new URL(item.photo.source.url).pathname).replaceAll("_", " "), `/wiki/File:${decision.mediaEvidence.commonsFile.replaceAll("_", " ")}`);
    assert.ok(item.photo.source.author?.trim() && item.photo.source.license?.trim() && item.photo.alt?.trim());
    assert.match(item.photo.source.license, /^(?:CC|Public domain|GFDL)/i);
    if (decision.mediaEvidence.replacementReview) {
      assert.equal(item.photo.source.author, decision.mediaEvidence.replacementReview.author);
      assert.equal(item.photo.source.license, decision.mediaEvidence.replacementReview.license);
    }
  }
}
