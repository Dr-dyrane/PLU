import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";

const source = await readFile(new URL("../lib/trace/reference-study.ts", import.meta.url), "utf8");
const { canRecallReferenceCode, validateReferenceCodeRecall, referenceStorageKey, referenceSignature, isSavedReferenceStudy, referenceSourceChoices, REFERENCE_STUDY_EVENT } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`);

const recorded = { codeStatus: "recorded", codes: ["0012"] };
assert.equal(canRecallReferenceCode(recorded), true);
assert.deepEqual(validateReferenceCodeRecall(" 0012 ", recorded), { correct: true });
assert.deepEqual(validateReferenceCodeRecall("12", recorded), { correct: false, reason: "wrong" });
assert.deepEqual(validateReferenceCodeRecall("", recorded), { correct: false, reason: "empty" });
for (const value of ["1e2", "0012 0345", "12.0", "+0012", "0012,", "１２"]) assert.deepEqual(validateReferenceCodeRecall(value, recorded), { correct: false, reason: "malformed" });
for (const codeStatus of ["missing", "conflicted", "uncertain"]) {
  const target = { codeStatus, codes: ["0012"] };
  assert.equal(canRecallReferenceCode(target), false);
  assert.deepEqual(validateReferenceCodeRecall("0012", target), { correct: false, reason: "unverified" });
}
for (const codes of [[], ["?"], ["0012", "0345"], [""], [" 0012"], ["12/34"], ["0012", "0012"]]) {
  assert.equal(canRecallReferenceCode({ codeStatus: "recorded", codes }), false);
  assert.deepEqual(validateReferenceCodeRecall("0012", { codeStatus: "recorded", codes }), { correct: false, reason: "unverified" });
}

const row = { catalogId: "example", revision: "source-media-revision-1", sourceIssue: "The workbook code is unreadable." };
const signature = referenceSignature(row);
const saved = { version: 1, signature, completedAt: "2026-09-07T00:00:00Z" };
assert.equal(referenceStorageKey(row.catalogId), "plu:reference:example");
assert.equal(REFERENCE_STUDY_EVENT, "plu:reference-change");
assert.ok(isSavedReferenceStudy(JSON.stringify(saved), signature));
for (const raw of [null, "not json", "true", "{}", JSON.stringify({ ...saved, version: 2 }), JSON.stringify({ ...saved, completedAt: "invalid" }), JSON.stringify({ ...saved, signature: "stale" })]) assert.equal(isSavedReferenceStudy(raw, signature), false);
for (const change of [{ catalogId: "other" }, { revision: "source-media-revision-2" }]) assert.equal(isSavedReferenceStudy(JSON.stringify(saved), referenceSignature({ ...row, ...change })), false);
const choices = referenceSourceChoices(row);
assert.equal(choices.length, 3);
assert.equal(new Set(choices.map((choice) => choice.id)).size, 3);
assert.equal(choices.find((choice) => choice.id === "source").text, row.sourceIssue);
assert.deepEqual(referenceSourceChoices(row), choices);

const component = await readFile(new URL("../components/canon/ReferenceLesson.tsx", import.meta.url), "utf8");
assert.doesNotMatch(component, /plu:complete:|plu:relationship:/);
assert.match(component, /onError=\{\(\) => setFailedImage/);
assert.match(component, /Reference study is complete\. The source restriction remains/);
assert.match(component, /event\.key === "Escape"/);
console.log("Reference study: exact recorded-code recall, unknown-code rejection, row-specific source notes, isolated versioned progress, revision invalidation, and failure feedback passed.");
