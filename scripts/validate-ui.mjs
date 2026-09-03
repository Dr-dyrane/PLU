import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const lesson = await readFile(new URL("../components/canon/PluLesson.tsx", import.meta.url), "utf8");
const home = await readFile(new URL("../components/canon/BatchHome.tsx", import.meta.url), "utf8");
const homeFilters = await readFile(new URL("../components/canon/HomeFilterSheet.tsx", import.meta.url), "utf8");
const routeShell = await readFile(new URL("../components/canon/LessonRouteShell.tsx", import.meta.url), "utf8");
const responsiveCss = await readFile(new URL("../app/styles/canon/responsive.css", import.meta.url), "utf8");
const lessonCss = await readFile(new URL("../app/styles/canon/lesson.css", import.meta.url), "utf8");
const sheetCss = await readFile(new URL("../app/styles/canon/sheet.css", import.meta.url), "utf8");
const batchCss = await readFile(new URL("../app/styles/canon/batch.css", import.meta.url), "utf8");
const navigationCss = await readFile(new URL("../app/styles/canon/navigation.css", import.meta.url), "utf8");
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
  assert.ok(!lesson.includes(phrase), `Learner UI must not expose: ${phrase}`);
}

for (const required of ["Practice {code}", "ProductSheet", "actionDock", "Open product story"]) {
  assert.ok(lesson.includes(required), `Canonical lesson is missing ${required}.`);
}

for (const required of ["Search product or PLU", "batchCategoryRail", "HomeFilterSheet", "Coming next"]) {
  assert.ok(home.includes(required), `Home discovery is missing ${required}.`);
}

for (const required of ["Back to products", "router.back()", 'href="/"']) {
  assert.ok(routeShell.includes(required), `Lesson navigation is missing ${required}.`);
}

for (const required of ["aria-modal", "Escape", "How it is sold", "Learning"]) {
  assert.ok(homeFilters.includes(required), `Filter sheet is missing ${required}.`);
}

for (const required of ["env(safe-area-inset", "min-height:44px", "prefers-reduced-motion"]) {
  assert.ok(
    responsiveCss.replaceAll(" ", "").includes(required.replaceAll(" ", "")),
    `Responsive CSS is missing ${required}.`,
  );
}

assert.ok(lessonCss.includes(".actionDock.hiddenDock"), "Fixed action dock visibility rule missing.");
assert.ok(sheetCss.includes("grid-template-rows: auto auto minmax(0,1fr)"), "Desktop product-sheet tracks missing.");
assert.ok(responsiveCss.includes("grid-template-rows:max-content max-content max-content minmax(0,1fr)"), "Mobile product-sheet tracks missing.");
assert.ok(navigationCss.includes("body") && navigationCss.includes("overflow-y: auto"), "Document scrolling must be restored.");
assert.ok(navigationCss.includes(".app") && navigationCss.includes("overflow: hidden"), "Lesson containment must remain local to the app shell.");
assert.ok(navigationCss.includes(".lessonBackButton"), "Back-to-products control styles missing.");
assert.ok(batchCss.includes(".batchSearch") && batchCss.includes(".homeFilterSheet"), "Search and filter styles missing.");
assert.ok(layout.includes("/icon.svg"), "Layout must expose the SVG favicon.");

const icon = await stat(new URL("../app/icon.svg", import.meta.url));
assert.ok(icon.size > 0, "app/icon.svg must be non-empty.");

console.log(
  "Validated fixed lesson shell, scrolling home, back navigation, search, category chips, native filter sheet, safe areas, 44px targets, reduced motion, clean learner copy, and favicon.",
);
