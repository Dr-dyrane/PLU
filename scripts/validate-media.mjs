import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

async function loadJsonRecords(directoryUrl) {
  const files = (await readdir(directoryUrl).catch(() => []))
    .filter((name) => name.endsWith(".json"))
    .sort();

  return (
    await Promise.all(
      files.map(async (name) => {
        const value = await readJson(new URL(name, directoryUrl));
        return Array.isArray(value) ? value : [value];
      }),
    )
  ).flat();
}

const fullStories = [
  ...(await loadJsonRecords(new URL("../data/stories/", import.meta.url))),
  ...(await loadJsonRecords(new URL("../data/story-batches/", import.meta.url))),
];
const seedStories = await loadJsonRecords(new URL("../data/story-seeds/", import.meta.url));
const allStories = [...fullStories, ...seedStories];

assert.ok(allStories.length > 0, "Expected at least one product story.");
assert.equal(
  new Set(allStories.map((story) => story.id)).size,
  allStories.length,
  "Story IDs must be unique.",
);
assert.equal(
  new Set(allStories.map((story) => story.catalogId)).size,
  allStories.length,
  "Story catalog IDs must be unique.",
);

let photoCount = 0;

function validateCore(story, label) {
  assert.ok(story.title && story.catalogId, `${label}: title and catalog ID are required.`);
  assert.ok(
    ["Weight", "Each"].includes(story.checkout?.soldBy),
    `${label}: checkout method must be Weight or Each.`,
  );
  assert.ok(
    /^\d+$/.test(story.checkout?.code ?? ""),
    `${label}: checkout code must contain only digits.`,
  );
  assert.ok(
    Array.isArray(story.photos) && story.photos.length >= 3,
    `${label}: at least three recognition photographs are required.`,
  );
  assert.ok(story.visualCues?.length >= 3, `${label}: at least three visual cues are required.`);
  assert.ok(story.similarItems?.length >= 3, `${label}: at least three comparison items are required.`);
}

function validatePhotoSet(story, label, seeded) {
  const ids = new Set();
  const sources = new Set();
  const roles = new Set();

  for (const photo of story.photos) {
    const sourceValue = seeded ? photo.file : photo.src;
    const id = photo.id ?? sourceValue;

    assert.ok(typeof id === "string" && id.length > 0, `${label}: photo id or file is required.`);
    assert.ok(!ids.has(id), `${label}: duplicate photo identity ${id}.`);
    ids.add(id);

    assert.ok(
      typeof sourceValue === "string" && sourceValue.trim().length > 0,
      `${label}: photo source is required.`,
    );
    assert.ok(!sources.has(sourceValue), `${label}: duplicate photo source ${sourceValue}.`);
    sources.add(sourceValue);

    if (!seeded) {
      assert.ok(
        sourceValue.startsWith("/") || sourceValue.startsWith("https://"),
        `${label}: full-story photo sources must be local or HTTPS.`,
      );
      assert.ok(photo.source?.label, `${label}: source label required for ${id}.`);
      assert.ok(photo.source?.author, `${label}: author required for ${id}.`);
      assert.ok(photo.source?.license, `${label}: license required for ${id}.`);
      assert.ok(
        typeof photo.source?.url === "string" && photo.source.url.startsWith("https://"),
        `${label}: source URL required for ${id}.`,
      );
    }

    assert.ok(
      typeof photo.alt === "string" && photo.alt.trim().length >= 24,
      `${label}: descriptive alt text required for ${id}.`,
    );
    assert.ok(
      ["hero", "alternate", "context", "detail"].includes(photo.role),
      `${label}: unsupported photo role ${photo.role}.`,
    );
    roles.add(photo.role);
    photoCount += 1;
  }

  assert.ok(roles.has("hero"), `${label}: one hero photo is required.`);
  assert.ok(roles.has("alternate"), `${label}: one alternate photo is required.`);
  assert.ok(roles.has("context"), `${label}: one context photo is required.`);
}

function validateChoices(choices, answer, label) {
  assert.ok(Array.isArray(choices) && choices.length >= 3, `${label}: three choices are required.`);
  for (const choice of choices) {
    assert.ok(choice?.id && choice?.label, `${label}: every choice needs an id and label.`);
  }
  assert.ok(choices.some((choice) => choice.id === answer), `${label}: answer must match a choice.`);
}

for (const story of fullStories) {
  const label = story.id ?? "unnamed full story";
  validateCore(story, label);
  validatePhotoSet(story, label, false);

  assert.ok(story.storyBeats?.length >= 4, `${label}: at least four story beats are required.`);
  assert.ok(
    story.classificationPrompts?.length >= 3,
    `${label}: at least three identification decisions are required.`,
  );
  for (const prompt of story.classificationPrompts) {
    validateChoices(prompt.choices, prompt.answer, `${label}/${prompt.id}`);
  }

  const hero = story.photos.find((photo) => photo.role === "hero");
  assert.equal(story.image, hero.src, `${label}: image alias must point to the hero photo.`);
  assert.equal(story.alt, hero.alt, `${label}: alt alias must match the hero photo.`);
}

for (const seed of seedStories) {
  const label = seed.id ?? "unnamed story seed";
  validateCore(seed, label);
  validatePhotoSet(seed, label, true);

  assert.ok(seed.classification, `${label}: classification data is required.`);
  validateChoices(
    seed.classification.familyChoices,
    seed.classification.familyAnswer,
    `${label}/family`,
  );
  validateChoices(
    seed.classification.formChoices,
    seed.classification.formAnswer,
    `${label}/form`,
  );
  assert.ok(
    seed.source?.primaryPages?.length > 0,
    `${label}: source-page provenance is required.`,
  );
}

console.log(
  `Validated ${fullStories.length} full stories, ${seedStories.length} compiled story seeds, and ${photoCount} recognition photographs.`,
);
