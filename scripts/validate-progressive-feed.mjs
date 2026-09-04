import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

const home = await read("../components/canon/BatchHome.tsx");
const mobile = await read("../app/styles/canon/mobile-grid.css");
const progressive = await read("../app/styles/canon/progressive-feed.css");
const controls = await read("../app/styles/canon/catalog-controls.css");
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

for (const required of [
  "scroll-snap-type: x proximity",
  ".batchCategoryRail button.active:hover",
  ".batchFilterButton.active:hover",
  ".homeFilterOption.active:hover",
  "color: var(--on-accent)",
  "color: var(--text)",
]) {
  assert.ok(controls.includes(required), `Catalog-control contract missing: ${required}`);
}

assert.ok(
  globalStyles.includes('@import "./canon/progressive-feed.css"'),
  "Progressive feed CSS must be included globally.",
);
assert.ok(
  globalStyles.includes('@import "./canon/catalog-controls.css"'),
  "Catalog-control CSS must load after the appearance layer.",
);
assert.ok(homePage.includes("mustKnow300"), "The home page must expose all 300 lessons.");
assert.ok(
  homePage.includes("homeStorySummaries"),
  "The home page must use lightweight story summaries rather than full lessons.",
);

console.log(
  "Validated 18-at-a-time loading, image laziness, mobile scan grid, horizontal category scrolling, theme-safe selected controls, and the 300-product home feed.",
);
