import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const component = await readFile(new URL("../components/canon/PluLesson.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/styles/canon/responsive.css", import.meta.url), "utf8");
const lessonCss = await readFile(new URL("../app/styles/canon/lesson.css", import.meta.url), "utf8");
const sheetCss = await readFile(new URL("../app/styles/canon/sheet.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

const forbiddenLearnerCopy = [
  "Read the product before the number",
  "Attach the official code",
  "Build procedural memory",
  "exact checkout item is resolved",
  "primary sheet",
  "related sheet",
  "competence score",
  "idempotent",
];

for (const phrase of forbiddenLearnerCopy) {
  assert.ok(!component.includes(phrase), `Learner UI must not expose: ${phrase}`);
}

for (const required of ["Practice {code}", "ProductSheet", "actionDock", "Open product story"]) {
  assert.ok(component.includes(required), `Canonical lesson is missing ${required}.`);
}

for (const required of ["env(safe-area-inset", "min-height:44px", "prefers-reduced-motion"]) {
  assert.ok(css.replaceAll(" ", "").includes(required.replaceAll(" ", "")), `Responsive CSS is missing ${required}.`);
}
assert.ok(lessonCss.includes(".actionDock.hiddenDock"), "Fixed action dock visibility rule missing.");
assert.ok(sheetCss.includes("grid-template-rows: auto auto minmax(0,1fr)"), "Desktop sheet tracks missing.");
assert.ok(css.includes("grid-template-rows:max-content max-content max-content minmax(0,1fr)"), "Mobile sheet tracks missing.");
assert.ok(layout.includes('/icon.svg'), "Layout must expose the SVG favicon.");

const icon = await stat(new URL("../app/icon.svg", import.meta.url));
assert.ok(icon.size > 0, "app/icon.svg must be non-empty.");

console.log("Validated fixed action dock, native sheet, safe areas, 44px targets, reduced motion, clean learner copy, and favicon.");
