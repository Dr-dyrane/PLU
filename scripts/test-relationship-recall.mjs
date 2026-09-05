import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";

const source = await readFile(new URL("../lib/trace/relationship-recall.ts", import.meta.url), "utf8");
const { parseRelationshipCodes, validateRelationshipRecall, relationshipSignature, isSavedRelationshipStudy } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`);

assert.deepEqual(parseRelationshipCodes(" 0012, 0345\n999 "), { valid: true, codes: ["0012", "0345", "999"] });
assert.deepEqual(parseRelationshipCodes("0012 12"), { valid: true, codes: ["0012", "12"] });
for (const value of ["", " \n "]) assert.deepEqual(parseRelationshipCodes(value), { valid: false, reason: "empty" });
for (const value of ["12,", ",12", "12,,34", "12, ,34", "-12", "+12", "12.0", "1e3", "12/34", "12;34", "１２", "12abc"]) {
  assert.deepEqual(parseRelationshipCodes(value), { valid: false, reason: "malformed" }, value);
}
assert.deepEqual(parseRelationshipCodes("0012, 0012"), { valid: false, reason: "duplicate" });
assert.deepEqual(validateRelationshipRecall("0345, 0012", ["0012", "0345"]), { correct: true });
assert.deepEqual(validateRelationshipRecall("0012", ["0012"]), { correct: true });
assert.deepEqual(validateRelationshipRecall("12", ["0012"]), { correct: false, reason: "wrong" });
assert.deepEqual(validateRelationshipRecall("0012", ["0012", "0345"]), { correct: false, reason: "incomplete" });
assert.deepEqual(validateRelationshipRecall("0012, 0345, 999", ["0012", "0345"]), { correct: false, reason: "wrong" });
assert.deepEqual(validateRelationshipRecall("0012, 999", ["0012", "0345"]), { correct: false, reason: "wrong" });
assert.deepEqual(validateRelationshipRecall("0012,0012", ["0012", "0345"]), { correct: false, reason: "duplicate" });
for (const expected of [[], [""], ["0012", "0012"], ["12/34"], [" 12"], ["12.0"]]) {
  assert.deepEqual(validateRelationshipRecall("0012", expected), { correct: false, reason: "invalid-target" });
}
console.log("Relationship recall: strict unordered sets, leading zeros, malformed input, duplicate rejection, and exact target boundaries passed.");
const row = {catalogId:"test", title:"Source row", codes:["0012", "0345"], sourcePages:[5], soldBy:"Weight", relationKind:"same-label-different-codes"};
const signature = relationshipSignature(row);
const saved = {version:1, signature, completedAt:"2026-09-04T00:00:00Z"};
assert.ok(isSavedRelationshipStudy(JSON.stringify(saved), signature));
assert.equal(relationshipSignature({...row, codes:[...row.codes].reverse()}), signature);
for (const raw of [null, "not json", "true", "{}", JSON.stringify({...saved, version:2}), JSON.stringify({...saved, signature:"stale"}), JSON.stringify({...saved, completedAt:"invalid"})]) assert.equal(isSavedRelationshipStudy(raw, signature), false);
for (const change of [{codes:["0012"]}, {sourcePages:[1]}, {title:"Other row"}, {soldBy:"Each"}, {catalogId:"other"}, {relationKind:"shared-code"}]) assert.equal(isSavedRelationshipStudy(JSON.stringify(saved), relationshipSignature({...row,...change})), false);
console.log("Relationship completion: home and lesson share version, exact-source signature, and date validation; stale results stay unstudied.");
