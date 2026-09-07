import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));
const source = await read("lib/trace/lesson-sequence.ts");
const { buildLessonSequence } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`);
assert.equal(buildLessonSequence([]).size, 0);
const single = { href: "/learn/one/", title: "One", kind: "lesson" };
assert.equal(buildLessonSequence([single]).get(single.href), null);
assert.throws(() => buildLessonSequence([single, single]), /Duplicate lesson route/);

const batches = await Promise.all([1, 2, 3, 4, 5, 6].map(n => json(`data/batches/batch-0${n}.json`)));
const rows = batches.flatMap(batch => batch.items);
const storyIndex = await read("data/stories/index.ts");
const storyFiles = [...storyIndex.matchAll(/from "@\/(data\/[^"\n]+\.json)"/g)].map(match => match[1]);
const stories = (await Promise.all(storyFiles.map(json))).flat();
const storyByCatalogId = new Map(stories.map(story => [story.catalogId, story]));
const relationships = (await json("data/relationship-lessons.json")).items;
const references = (await json("data/reference-lessons.json")).items;
const studySequence = (items, prefix) => {
  const byId = new Map(items.map(item => [item.catalogId, item]));
  return rows.filter(row => byId.has(row.catalogId)).map(row => ({ href: `/${prefix}/${row.catalogId}/`, title: byId.get(row.catalogId).title, kind: "study" }));
};
const groups = [
  rows.filter(row => row.status === "ready").map(row => {
    const story = storyByCatalogId.get(row.catalogId);
    assert.ok(story, `${row.catalogId}: next route must use an authored story ID`);
    return { href: `/learn/${story.id}/`, title: story.title, kind: "lesson" };
  }),
  studySequence(relationships, "relationships"),
  studySequence(references, "reference"),
];
assert.deepEqual(groups.map(group => group.length), [396, 19, 48]);
const allRoutes = groups.flat().map(item => item.href);
assert.equal(new Set(allRoutes).size, 463);
for (const group of groups) {
  const next = buildLessonSequence(group);
  group.forEach((item, index) => {
    assert.deepEqual(next.get(item.href), group[index + 1] ?? null);
    assert.ok(item.title);
  });
  assert.equal(next.get("/not-a-lesson/"), undefined);
}
for (const [path, identity] of [["learn/[slug]", "story.id"], ["relationships/[catalogId]", "lesson.catalogId"], ["reference/[catalogId]", "lesson.catalogId"]]) {
  const page = await read(`app/${path}/page.tsx`);
  assert.ok(page.includes(`key={${identity}}`), `${path}: new product must reset interactive state`);
  assert.ok(page.includes("nextLessonByHref.get("), `${path}: pass a lightweight destination`);
}
const finish = await read("components/canon/LessonFinishActions.tsx");
assert.ok(finish.includes('returnTo ?? "/library/"'));
assert.ok(finish.includes('new URLSearchParams({ returnTo })'));
assert.ok(finish.includes('"Next lesson" : "Next study"'));
assert.ok(finish.includes('onClick={onRetry}'));
console.log("Lesson continuation: 463 unique catalog-ordered routes, separate study sequences, terminal Done, and keyed lesson resets passed.");
console.log("Sequence endpoints:", groups.map(group => [group[0].href, group.at(-1).href]));
