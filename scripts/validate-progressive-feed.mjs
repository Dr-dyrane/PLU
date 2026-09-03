import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

const home = await read("../components/canon/BatchHome.tsx");
const mobile = await read("../app/styles/canon/mobile-grid.css");
const progressive = await read("../app/styles/canon/progressive-feed.css");
const globalStyles = await read("../app/styles/canon.css");
const homePage = await read("../app/page.tsx");

for (const required of [
  "IntersectionObserver",
  "INITIAL_VISIBLE_LESSONS = 18",
  "LESSON_LOAD_INCREMENT = 18",
  "ready.slice(0, visibleReadyCount)",
  "visibleReady.map",
  "rootMargin: \"850px 0px\"",
  "loading={index < 6 ? \"eager\" : \"lazy\"}",
  "batchProgressiveLoader",
]) {
  assert.ok(home.includes(required), `Progressive home feed contract missing: ${required}`);
}

for (const required of [
  "grid-template-columns: repeat(2",
  "@media (max-width: 350px)",
]) {
  assert.ok(mobile.includes(required), `Mobile scan-grid contract missing: ${required}`);
}

for (const required of [
  "content-visibility: auto",
  "contain-intrinsic-size",
  "batchLoaderSpin",
  "prefers-reduced-motion",
]) {
  assert.ok(progressive.includes(required), `Progressive feed CSS contract missing: ${required}`);
}

assert.ok(
  globalStyles.includes('@import "./canon/progressive-feed.css"'),
  "Progressive feed CSS must be included globally.",
);
assert.ok(homePage.includes("mustKnow200"), "The home page must expose all 200 lessons.");
assert.ok(
  homePage.includes("homeStorySummaries"),
  "The home page must use lightweight story summaries rather than full lessons.",
);

console.log("Validated 18-at-a-time loading, image laziness, mobile scan grid, and 200-product home feed.");
