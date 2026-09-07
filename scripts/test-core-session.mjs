import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";

const source = await readFile(new URL("../lib/trace/core-session.ts", import.meta.url), "utf8");
const { CORE_SESSION_KEY, CORE_SESSION_EVENT, sessionSignature, parseCoreSession, completeCoreSession } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`);
const now = Date.parse("2026-09-07T12:00:00.000Z");
const iso = offset => new Date(now + offset).toISOString();
const items = Array.from({ length: 5 }, (_, index) => ({ id: `item-${index}`, code: `00${index + 1}` }));
const ids = items.map(item => item.id);
const signature = sessionSignature(items);
const payload = { version: 1, signature, completedIds: ids.slice(0, 2), updatedAt: iso(0) };

assert.equal(CORE_SESSION_KEY, "plu:session:core-25:v1");
assert.equal(CORE_SESSION_EVENT, "plu:session:core-25-change");
assert.deepEqual(parseCoreSession(JSON.stringify(payload), signature, ids, now), { completedIds: ids.slice(0, 2), updatedAt: iso(0) });
for (let count = 0; count <= 5; count += 1) {
  assert.deepEqual(parseCoreSession(JSON.stringify({ ...payload, completedIds: ids.slice(0, count) }), signature, ids, now)?.completedIds, ids.slice(0, count));
}
for (const changed of [[...items].reverse(), items.map((item, index) => index === 1 ? { ...item, code: "999" } : item), items.map((item, index) => index === 1 ? { ...item, id: "replacement" } : item)]) {
  assert.notEqual(sessionSignature(changed), signature, "The exact ordered IDs and codes bind the session");
  assert.equal(parseCoreSession(JSON.stringify(payload), sessionSignature(changed), changed.map(item => item.id), now), null);
}
assert.notEqual(sessionSignature(items.map(item => ({ ...item, code: String(Number(item.code)) }))), signature, "Leading zeros remain part of the signature");

const invalid = [null, "", "not json", "true", "[]", "{}", "null", ...[
  { ...payload, version: 2 },
  { ...payload, signature: "stale" },
  { ...payload, completedIds: ids.slice(1, 3) },
  { ...payload, completedIds: [ids[0], ids[0]] },
  { ...payload, completedIds: [ids[0], ids[2]] },
  { ...payload, completedIds: [...ids, "sixth"] },
  { ...payload, completedIds: [ids[0], null] },
  { ...payload, completedIds: "all" },
  { ...payload, updatedAt: "invalid" },
  { ...payload, updatedAt: iso(1) },
  { ...payload, updatedAt: "2026-02-30T12:00:00.000Z" },
  { ...payload, updatedAt: "2026-09-07" },
  { ...payload, complete: true },
  { version: 1, signature, completedIds: [] },
].map(value => JSON.stringify(value))];
for (const raw of invalid) assert.equal(parseCoreSession(raw, signature, ids, now), null, String(raw));
for (const wrongIds of [[], ids.slice(0, 4), [...ids, "sixth"], [ids[0], ids[0], ...ids.slice(2)]]) assert.equal(parseCoreSession(JSON.stringify(payload), signature, wrongIds, now), null);

let progress = { completedIds: [], updatedAt: iso(0) };
assert.equal(completeCoreSession(progress, ids, ids[1], iso(1), now + 1), progress, "Future items cannot be skipped to");
assert.equal(completeCoreSession(progress, ids, ids[0], iso(1), now), progress, "Future completion timestamp is rejected");
for (let index = 0; index < 5; index += 1) {
  const previous = progress;
  progress = completeCoreSession(progress, ids, ids[index], iso(index + 1), now + index + 1);
  assert.notEqual(progress, previous);
  assert.deepEqual(previous.completedIds, ids.slice(0, index), "Completion does not mutate earlier progress");
  assert.deepEqual(progress.completedIds, ids.slice(0, index + 1));
  assert.equal(completeCoreSession(progress, ids, ids[index], iso(index + 1), now + index + 1), progress, "Repeated completion is idempotent");
}
assert.equal(completeCoreSession(progress, ids, "sixth", iso(10), now + 10), progress);
assert.equal(completeCoreSession({ completedIds: [], updatedAt: "invalid" }, ids, ids[0], iso(0), now).completedIds.length, 0);
const resumed = parseCoreSession(JSON.stringify({ ...payload, completedIds: ids.slice(0, 3) }), signature, ids, now);
assert.equal(ids[resumed.completedIds.length], ids[3], "Reload resumes at the first incomplete item");

const ui = await readFile(new URL("../components/canon/CoreSession.tsx", import.meta.url), "utf8");
const lesson = await readFile(new URL("../components/canon/PluLesson.tsx", import.meta.url), "utf8");
for (const required of ["ProductIconProvider", "productTheme(story)", "onComplete={() => recordCompletion(story.id)}", "completionActions=", "current.generation !== run", "current.advancedIndex === current.index", "current.progress = next", "current.progress.completedIds[current.index] !== id", "CORE_SESSION_KEY", "CORE_SESSION_EVENT", "key={`${run}:${story.id}`} ".trim(), 'href="/"', "Five products practised.", "Progress isn't saved on this device."]) assert.ok(ui.includes(required), `Session UI contract missing: ${required}`);
assert.equal(/plu:(?:complete|relationship|reference):/.test(ui), false, "Session progress never reads another learning contract");
assert.equal((lesson.match(/onComplete\?\.\(\)/g) ?? []).length, 1);
assert.ok(lesson.indexOf("onComplete?.()") > lesson.indexOf("if (recallEntryRef.current !== code)"));
assert.ok(lesson.indexOf("onComplete?.()") > lesson.indexOf("completeRef.current = true"));
assert.ok(lesson.includes("completionActions ?? <LessonFinishActions"), "Standalone finish behavior remains the fallback");
console.log("Core session: exact five-item prefix, signature/schema/time validation, idempotent completion, resume, storage boundaries and lesson callback contracts passed.");
