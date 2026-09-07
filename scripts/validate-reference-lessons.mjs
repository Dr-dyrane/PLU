import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { REFERENCE_IDS, loadReferenceInputs, makeReferenceLesson, referenceRevision } from "./prepare-reference-lessons.mjs";

const document = JSON.parse(await readFile(new URL("../data/reference-lessons.json", import.meta.url), "utf8"));
const inputs = await loadReferenceInputs();
assert.equal(document.schemaVersion, 1);
assert.deepEqual(document.items.map(item => item.catalogId).sort(), [...REFERENCE_IDS].sort(), "Exactly 48 reference studies required; no duplicate or ready ID may overlap.");

for (const item of document.items) {
  const id = item.catalogId, record = inputs.catalog.get(id), knowledge = inputs.knowledge.get(id), media = item.media;
  assert.equal(item.title, record.item, `${id}: do not silently restore or clean uncertain source labels.`);
  assert.deepEqual(item.codes, record.codes, `${id}: source code arrays must remain exact, including question marks.`);
  assert.equal(item.sourceCodeText, record.codeText);
  assert.deepEqual(item.sourcePages, record.sourcePages);
  assert.equal(item.soldBy, record.soldBy, `${id}: a missing sale unit must remain null.`);
  assert.ok(["recorded", "missing", "conflicted", "uncertain"].includes(item.codeStatus));
  if (record.codes.some(code => !/^\d+$/.test(code))) assert.equal(item.codeStatus, "missing", `${id}: never quiz a question mark as a number.`);
  if (record.flags.some(flag => ["handwritten", "obscured-label"].includes(flag))) assert.notEqual(item.codeStatus, "recorded");
  if (knowledge.codeEvidence.resolution === "code-kind-required") assert.equal(item.codeStatus, "uncertain");
  assert.ok(!["ready", "excluded"].includes(knowledge.publishability.status));
  for (const key of ["visualCue", "identityNote", "checkoutCaveat", "sourceIssue", "family"]) assert.ok(typeof item[key] === "string" && item[key].trim(), `${id}: ${key} required.`);
  assert.equal(item.revision, referenceRevision(item), `${id}: local study revision must invalidate changed content.`);
  assert.ok(item.evidenceSources.length >= 2);
  assert.equal(new Set(item.evidenceSources.map(source => source.url)).size, item.evidenceSources.length);
  for (const source of item.evidenceSources) assert.ok(source.title && (/^https:\/\//.test(source.url) || /^\/(?!\/)/.test(source.url)));
  for (const key of ["src", "alt", "author", "sourceUrl", "license", "claimBoundary"]) assert.ok(typeof media[key] === "string" && media[key].trim(), `${id}: media ${key} required.`);
  assert.ok(/^https:\/\//.test(media.src) || /^\/(?!\/)/.test(media.src));
  if (media.licenseUrl) assert.match(media.licenseUrl, /^https:\/\//);
  if (media.kind === "generated-illustration") {
    assert.ok(inputs.replacements.has(id), `${id}: generated assets require explicit provenance mapping.`);
    assert.match(media.src, /^\/media\//, `${id}: generated assets must be local, not passed off as a source photograph.`);
    assert.match(`${media.alt} ${media.author} ${media.license} ${media.claimBoundary}`, /(?:AI.generated|generated illustration|AI illustration)/i);
    assert.doesNotMatch(media.sourceUrl, /(?:commons|upload|thumb)\.wikimedia\.org/);
    assert.doesNotMatch(media.license, /^\s*(?:CC BY|CC0|Public domain)/i, `${id}: do not invent a source photograph license for generated media.`);
    assert.ok((await stat(new URL(`../public${media.src}`, import.meta.url))).isFile(), `${id}: generated image file missing.`);
    const replacement = inputs.replacements.get(id);
    assert.match(replacement.sha256, /^[a-f0-9]{64}$/, `${id}: generated pixels need a recorded digest.`);
    const bytes = await readFile(new URL(`../public${media.src}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), replacement.sha256, `${id}: generated pixels drifted from reviewed provenance.`);
    assert.equal(media.sourceUrl, "/media/reference/provenance.json");
    const provenance = JSON.parse(await readFile(new URL(`../public${media.sourceUrl}`, import.meta.url), "utf8"));
    const source = provenance.items.find(entry => entry.catalogId === id);
    assert.equal(source?.sha256, replacement.sha256, `${id}: public generated provenance must match the reviewed artifact.`);
    assert.deepEqual(source.media, media);
  } else {
    assert.equal(media.kind, "reviewed-photo");
    assert.match(media.sourceUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    assert.match(media.src, /^https:\/\/(?:upload|thumb)\.wikimedia\.org\//);
    assert.match(media.license, /^(CC BY(?:-SA)? |CC0|Public domain)/);
    assert.doesNotMatch(media.author, /^Wikimedia Commons contributor$/);
    assert.doesNotMatch(media.license, /see source/i);
    if (!inputs.replacements.has(id)) {
      const file = knowledge.mediaPlan.source?.file;
      assert.ok(file, `${id}: only an explicitly reviewed source file may publish.`);
      assert.equal(media.sourceUrl, `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replaceAll(" ", "_"))}`, `${id}: reviewed file identity changed.`);
    }
  }
  // Reconstruct prose and source status from the ledgers, while retaining the exact
  // checked media metadata. This catches hand-edited study promotion or caveat loss.
  const expected = makeReferenceLesson(id, inputs, { src: media.src, author: media.author, license: media.license, sourceUrl: media.sourceUrl, ...(media.licenseUrl ? { licenseUrl: media.licenseUrl } : {}) });
  assert.deepEqual(item, expected, `${id}: regenerate rather than changing the reference contract by hand.`);
}

console.log(`Validated ${document.items.length} reference studies: exact source values, explicit media provenance, unchanged checkout readiness, and revision-bound study content.`);
