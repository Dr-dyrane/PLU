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

const lessons = JSON.parse(await readFile(new URL("../data/relationship-lessons.json", import.meta.url), "utf8")).items;
assert.equal(lessons.length, 19);
for (const lesson of lessons) {
  assert.deepEqual(validateRelationshipRecall([...lesson.codes].reverse().join(", "), lesson.codes), { correct: true }, lesson.catalogId);
  if (lesson.codes.length > 1) {
    assert.deepEqual(validateRelationshipRecall(lesson.codes[0], lesson.codes), { correct: false, reason: "incomplete" }, lesson.catalogId);
  }
  for (const member of lesson.members) {
    if (member.codes.length !== lesson.codes.length || member.codes.some(code => !lesson.codes.includes(code))) {
      assert.equal(validateRelationshipRecall(member.codes.join(", "), lesson.codes).correct, false, `${lesson.catalogId}: related row is not a replacement answer`);
    }
  }
}

const lessonUi = await readFile(new URL("../components/canon/RelationshipLesson.tsx", import.meta.url), "utf8");
const sheetUi = await readFile(new URL("../components/canon/RelationshipSheet.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../app/styles/canon/relationship.css", import.meta.url), "utf8");
assert.equal((lessonUi.match(/<h1>\{lesson\.title\}<\/h1>/g) ?? []).length, 1, "One product title on the stage");
for (const field of ["qualifierNote", "reviewBasis", "checkoutCaveat", "visualCue"]) {
  assert.equal(lessonUi.includes(`lesson.${field}`), false, `${field} stays out of the exercise`);
  assert.ok(sheetUi.includes(`lesson.${field}`), `${field} remains available in Details`);
}
for (const required of ["<RelationshipSheet", "aria-haspopup=\"dialog\"", "codes.map((code)", "chunkCode(code)", "lesson.sourcePages", "if (step !== 3) return", "if (choice !== \"verify\") return", "<Link className=\"primaryAction\" href=\"/\">Done", ">Look again</button>"]) {
  assert.ok(lessonUi.includes(required), `Compact relationship UI contract missing: ${required}`);
}
assert.equal(lessonUi.includes("plu:complete:"), false, "Relationship study cannot write checkout mastery");
assert.equal(lessonUi.includes("step !== 3 && <div"), false, "Checkout check retains its fixed dock");
for (const required of ["dialog.showModal()", "dialog.close()", "closeRef.current?.focus", "onClose()", "onPointerCancel", "ArrowRight", "ArrowLeft", "role=\"tabpanel\"", "member.codes", "member.flags", "member.status", "lesson.photo.source.author", "lesson.photo.source.license", "lesson.photo.source.url", 'rel="noopener noreferrer"']) {
  assert.ok(sheetUi.includes(required), `Native relationship sheet contract missing: ${required}`);
}
assert.ok(styles.includes(".relationshipCompactApp .relationshipCard { grid-template-rows: minmax(0, 1fr) auto; }"));
assert.ok(styles.includes(".relationshipDetailsDialog::backdrop"));
console.log("Relationship UI: all 19 exact code sets, compact one-title exercise, full native-sheet evidence, and fixed checkout dock passed.");
