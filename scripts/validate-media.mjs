import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

async function readStoryFile(url) {
  const value = JSON.parse(await readFile(url, "utf8"));
  return Array.isArray(value) ? value : [value];
}

const individualDirectory = new URL("../data/stories/", import.meta.url);
const batchDirectory = new URL("../data/story-batches/", import.meta.url);

const individualFiles = (await readdir(individualDirectory))
  .filter((name) => name.endsWith(".json"))
  .sort();
const batchFiles = (await readdir(batchDirectory).catch(() => []))
  .filter((name) => name.endsWith(".json"))
  .sort();

const stories = (
  await Promise.all([
    ...individualFiles.map((name) => readStoryFile(new URL(name, individualDirectory))),
    ...batchFiles.map((name) => readStoryFile(new URL(name, batchDirectory))),
  ])
).flat();

assert.ok(stories.length > 0, "Expected at least one product story.");
assert.equal(new Set(stories.map((story) => story.id)).size, stories.length, "Story IDs must be unique.");
assert.equal(new Set(stories.map((story) => story.catalogId)).size, stories.length, "Story catalog IDs must be unique.");

let photoCount = 0;

for (const story of stories) {
  const label = story.id ?? "unnamed story";
  assert.ok(story.title && story.catalogId, `${label}: title and catalog ID are required.`);
  assert.ok(["Weight", "Each"].includes(story.checkout?.soldBy), `${label}: checkout method must be Weight or Each.`);
  assert.ok(/^\d+$/.test(story.checkout?.code ?? ""), `${label}: checkout code must contain only digits.`);

  assert.ok(
    Array.isArray(story.photos) && story.photos.length >= 3,
    `${label}: canonical stories require at least three recognition photographs.`,
  );

  const ids = new Set();
  const sources = new Set();
  const roles = new Set();

  for (const photo of story.photos) {
    assert.ok(photo.id && typeof photo.id === "string", `${label}: photo id required.`);
    assert.ok(!ids.has(photo.id), `${label}: duplicate photo id ${photo.id}.`);
    ids.add(photo.id);

    assert.ok(photo.src && typeof photo.src === "string", `${label}: photo src required.`);
    assert.ok(!sources.has(photo.src), `${label}: duplicate photo source ${photo.src}.`);
    sources.add(photo.src);

    assert.ok(
      photo.src.startsWith("/") || photo.src.startsWith("https://"),
      `${label}: photo sources must be local or HTTPS.`,
    );
    assert.ok(
      typeof photo.alt === "string" && photo.alt.trim().length >= 24,
      `${label}: descriptive alt text required for ${photo.id}.`,
    );
    assert.ok(
      ["hero", "alternate", "context", "detail"].includes(photo.role),
      `${label}: unsupported photo role ${photo.role}.`,
    );
    roles.add(photo.role);

    assert.ok(photo.source?.label, `${label}: source label required for ${photo.id}.`);
    assert.ok(photo.source?.author, `${label}: author required for ${photo.id}.`);
    assert.ok(photo.source?.license, `${label}: license required for ${photo.id}.`);
    assert.ok(
      typeof photo.source?.url === "string" && photo.source.url.startsWith("https://"),
      `${label}: source URL required for ${photo.id}.`,
    );
    photoCount += 1;
  }

  assert.ok(roles.has("hero"), `${label}: one hero photo is required.`);
  assert.ok(roles.has("alternate"), `${label}: one alternate-angle photo is required.`);
  assert.ok(roles.has("context"), `${label}: one real-world context photo is required.`);

  const hero = story.photos.find((photo) => photo.role === "hero");
  assert.equal(story.image, hero.src, `${label}: legacy image must point to the hero photo.`);
  assert.equal(story.alt, hero.alt, `${label}: legacy alt must match the hero photo.`);

  assert.ok(story.visualCues?.length >= 3, `${label}: at least three visual cues are required.`);
  assert.ok(story.storyBeats?.length >= 4, `${label}: at least four story beats are required.`);
  assert.ok(story.classificationPrompts?.length >= 3, `${label}: at least three identification decisions are required.`);
  assert.ok(story.similarItems?.length >= 3, `${label}: at least three nearby comparisons are required.`);

  for (const prompt of story.classificationPrompts) {
    assert.ok(prompt.id && prompt.question && prompt.answer, `${label}: classification prompt is incomplete.`);
    assert.ok(Array.isArray(prompt.choices) && prompt.choices.length >= 3, `${label}: prompt ${prompt.id} needs three choices.`);
    for (const choice of prompt.choices) {
      assert.ok(
        typeof choice.id === "string" && choice.id.length > 0 &&
        typeof choice.label === "string" && choice.label.trim().length > 0,
        `${label}: every classification choice needs an id and visible label.`,
      );
    }
    assert.ok(prompt.choices.some((choice) => choice.id === prompt.answer), `${label}: prompt ${prompt.id} answer must be one of its choices.`);
  }
}

console.log(
  `Validated ${stories.length} product stories and ${photoCount} recognition photographs across individual and batch story files.`,
);
