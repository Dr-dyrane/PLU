import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const storyDirectory = new URL("../data/stories/", import.meta.url);
const storyFiles = (await readdir(storyDirectory))
  .filter((name) => name.endsWith(".json"))
  .sort();

assert.ok(storyFiles.length > 0, "Expected at least one product story.");

let photoCount = 0;

for (const file of storyFiles) {
  const story = JSON.parse(
    await readFile(new URL(file, storyDirectory), "utf8"),
  );

  assert.ok(
    Array.isArray(story.photos) && story.photos.length >= 3,
    `${file}: canonical stories require at least three recognition photographs.`,
  );

  const ids = new Set();
  const sources = new Set();
  const roles = new Set();

  for (const photo of story.photos) {
    assert.ok(photo.id && typeof photo.id === "string", `${file}: photo id required.`);
    assert.ok(!ids.has(photo.id), `${file}: duplicate photo id ${photo.id}.`);
    ids.add(photo.id);

    assert.ok(photo.src && typeof photo.src === "string", `${file}: photo src required.`);
    assert.ok(!sources.has(photo.src), `${file}: duplicate photo source ${photo.src}.`);
    sources.add(photo.src);

    assert.ok(
      photo.src.startsWith("/") || photo.src.startsWith("https://"),
      `${file}: photo sources must be local or HTTPS.`,
    );
    assert.ok(
      typeof photo.alt === "string" && photo.alt.trim().length >= 24,
      `${file}: descriptive alt text required for ${photo.id}.`,
    );
    assert.ok(
      ["hero", "alternate", "context", "detail"].includes(photo.role),
      `${file}: unsupported photo role ${photo.role}.`,
    );
    roles.add(photo.role);

    assert.ok(photo.source?.label, `${file}: source label required for ${photo.id}.`);
    assert.ok(photo.source?.author, `${file}: author required for ${photo.id}.`);
    assert.ok(photo.source?.license, `${file}: license required for ${photo.id}.`);
    assert.ok(
      typeof photo.source?.url === "string" && photo.source.url.startsWith("https://"),
      `${file}: source URL required for ${photo.id}.`,
    );

    photoCount += 1;
  }

  assert.ok(roles.has("hero"), `${file}: one hero photo is required.`);
  assert.ok(roles.has("alternate"), `${file}: one alternate-angle photo is required.`);
  assert.ok(roles.has("context"), `${file}: one real-world context photo is required.`);

  const hero = story.photos.find((photo) => photo.role === "hero");
  assert.equal(story.image, hero.src, `${file}: legacy image must point to the hero photo.`);
  assert.equal(story.alt, hero.alt, `${file}: legacy alt must match the hero photo.`);
}

console.log(
  `Validated ${storyFiles.length} product stor${storyFiles.length === 1 ? "y" : "ies"} and ${photoCount} distinct recognition photographs.`,
);
