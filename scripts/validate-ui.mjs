import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import "./test-relationship-recall.mjs";
import "./test-lesson-sequence.mjs";
import "./test-lesson-transition.mjs";
import "./test-core-session.mjs";
import "./test-library-navigation.mjs";

const lesson = await readFile(new URL("../components/canon/PluLesson.tsx", import.meta.url), "utf8");
const productSheet = await readFile(new URL("../components/canon/ProductSheet.tsx", import.meta.url), "utf8");
const lessonPage = await readFile(new URL("../app/learn/[slug]/page.tsx", import.meta.url), "utf8");
const iconSystem = await readFile(new URL("../components/canon/Icon.tsx", import.meta.url), "utf8");
const home = await readFile(new URL("../components/canon/BatchHome.tsx", import.meta.url), "utf8");
const homeFooter = await readFile(new URL("../components/canon/HomeFooter.tsx", import.meta.url), "utf8");
const homeFilters = await readFile(new URL("../components/canon/HomeFilterSheet.tsx", import.meta.url), "utf8");
const routeShell = await readFile(new URL("../components/canon/LessonRouteShell.tsx", import.meta.url), "utf8");
const themeToggle = await readFile(new URL("../components/canon/ThemeToggle.tsx", import.meta.url), "utf8");
const productTheme = await readFile(new URL("../lib/ui/product-theme.ts", import.meta.url), "utf8");
const responsiveCss = await readFile(new URL("../app/styles/canon/responsive.css", import.meta.url), "utf8");
const lessonCss = await readFile(new URL("../app/styles/canon/lesson.css", import.meta.url), "utf8");
const sheetCss = await readFile(new URL("../app/styles/canon/sheet.css", import.meta.url), "utf8");
const batchCss = await readFile(new URL("../app/styles/canon/batch.css", import.meta.url), "utf8");
const batchDispositionCss = await readFile(new URL("../app/styles/canon/batch-dispositions.css", import.meta.url), "utf8");
const navigationCss = await readFile(new URL("../app/styles/canon/navigation.css", import.meta.url), "utf8");
const appearanceCss = await readFile(new URL("../app/styles/canon/appearance.css", import.meta.url), "utf8");
const footerCss = await readFile(new URL("../app/styles/canon/footer.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const manifest = await readFile(new URL("../app/manifest.ts", import.meta.url), "utf8");
const homePage = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const libraryPage = await readFile(new URL("../app/library/page.tsx", import.meta.url), "utf8");
const seedCompiler = await readFile(new URL("../data/stories/compile-story-seed.ts", import.meta.url), "utf8");

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

assert.ok(lesson.includes("Remember the code."), "Code stage must use a concise prompt, not repeat the full product title.");
assert.ok(!lesson.includes("story.title.toLowerCase()"), "Code stage must not repeat the photo title.");
assert.ok(!lesson.includes("story.visualCues["), "Full recognition prose belongs in the product sheet, not repeated under the cue cards.");
assert.ok(lesson.includes('step !== 1 && <div className="factChips"'), "Look must not repeat its recognition cards on the photograph.");
assert.ok(lesson.includes('" longForm"'), "Long exact forms must retain a readable phone layout.");
for (const field of ["story.visualCues[0]", "story.visualCues[1]", "reviewedPanel.source.author", "reviewedPanel.source.license", "these are not three independent photographs"]) {
  assert.ok(productSheet.includes(field), `Product evidence must remain accessible: ${field}`);
}
assert.ok(productSheet.includes('<details className="photoSourceDetails">'), "Photo source must use an on-demand disclosure.");
assert.ok(productSheet.includes("summary, [href]"), "Photo-source disclosure must remain in the sheet's keyboard focus loop.");

for (const required of ["Practice {code}", "ProductSheet", "actionDock", "Open product story"]) {
  assert.ok(lesson.includes(required), `Canonical lesson is missing ${required}.`);
}

for (const required of ["ProductIconProvider", "story={story}"]) {
  assert.ok(lessonPage.includes(required), `Lesson route scaling is missing ${required}.`);
}

assert.ok(!productSheet.includes("pepperDot"), "The shared product sheet must not use pepper-only visuals.");
assert.ok(!productSheet.includes("-shaped</b>"), "Product form copy must remain grammatical across families.");
for (const required of ["ItemGlyph", "checkoutIcon", "itemIconName(story.family)", 'variant.soldBy === "Each"']) {
  assert.ok(productSheet.includes(required), `Product sheet scaling is missing ${required}.`);
}
for (const required of ["Banana", "Apple", "CircleDot", '"each"', "itemIconName", "ProductIconProvider", 'name === "scale"']) {
  assert.ok(iconSystem.includes(required), `Generic icon system is missing ${required}.`);
}

for (const required of [
  "Search product or PLU",
  "batchCategoryRail",
  "HomeFilterSheet",
  "Needs source review",
  "Code relationships",
  "Needs verified photos",
  'learning === "relationships"',
  "isSavedRelationshipStudy",
  "!ready.length && !relationshipRecords.length && !mapped.length",
  "Catalog only",
  'learning === "mapped"',
  'learning === "excluded"',
  "item.queueReason",
]) {
  assert.ok(home.includes(required), `Home discovery is missing ${required}.`);
}

for (const required of ["appFooter", "ThemeToggle", "Progress stays on this device"]) {
  assert.ok(homeFooter.includes(required), `Home footer is missing ${required}.`);
}

assert.ok(homePage.includes("HomeFooter"), "The home route must render the settings footer.");
assert.ok(homePage.includes("TodayHome") && homePage.includes("coreSessionSummaries"), "Today must offer the bounded five-product session.");
assert.ok(homePage.includes("LegacyLibraryRedirect"), "Existing filtered home URLs must remain usable.");
assert.ok(libraryPage.includes("catalog475") && libraryPage.includes('mode="library"'), "Library must retain the complete Catalog 475 collection.");

for (const required of [
  'seed.checkout.codeScope === "catalog-listed-retail-unit"',
  'id: "listing"',
  "Which store listing is this lesson for?",
  'answer: "exact-listing"',
]) {
  assert.ok(seedCompiler.includes(required), `Label-assisted lesson compilation is missing ${required}.`);
}

for (const required of ["role=\"switch\"", "aria-checked", "plu:theme", "Use dark appearance", "Use light appearance"]) {
  assert.ok(themeToggle.includes(required), `Theme control is missing ${required}.`);
}

for (const required of ["--accent-light", "--accent-dark", "--accent-light-rgb", "--accent-dark-rgb"]) {
  assert.ok(productTheme.includes(required), `Product theme is missing ${required}.`);
}

for (const required of ["Back to products", "router.back()", 'href="/"']) {
  assert.ok(routeShell.includes(required), `Lesson navigation is missing ${required}.`);
}

for (const required of ["aria-modal", "Escape", "How it is sold", "Learning", "Code relationships", "Needs verified photos", "Catalog only"]) {
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
assert.ok(
  batchDispositionCss.includes(".batchMappedCard") && batchDispositionCss.includes(".batchExcludedCard"),
  "Mapped and catalog-only disposition styles are missing.",
);
assert.ok(appearanceCss.includes('html[data-theme="light"]') && appearanceCss.includes('html[data-theme="dark"]'), "Both appearance modes are required.");
assert.ok(appearanceCss.includes("--on-accent") && appearanceCss.includes("--accent-on-photo"), "Semantic foreground tokens are required.");
assert.ok(appearanceCss.includes("--success-fill") && appearanceCss.includes("--warning-fill"), "Feedback colors must remain semantic.");
assert.ok(footerCss.includes(".appFooter") && footerCss.includes("flex-wrap: nowrap"), "The home footer must remain one row.");
assert.ok(footerCss.includes(".themeToggleTrack") && footerCss.includes("51px") && footerCss.includes("31px"), "Apple-style switch geometry missing.");
assert.ok(layout.includes("/icon.svg"), "Layout must expose the SVG favicon.");
assert.ok(layout.includes('data-theme="light"') && layout.includes("plu-theme-boot"), "Light must be the no-flash default theme.");
assert.ok(layout.includes('themeColor: "#F2F2F7"'), "Default browser chrome must match light mode.");
assert.ok(manifest.includes('background_color: "#F2F2F7"') && manifest.includes('theme_color: "#F2F2F7"'), "Installable app defaults must match light mode.");

const icon = await stat(new URL("../app/icon.svg", import.meta.url));
assert.ok(icon.size > 0, "app/icon.svg must be non-empty.");

console.log(
  "Validated generic multi-family lessons, Today and Catalog 475 Library, fixed lesson shell, scrolling, back navigation, search, category chips, native filter sheet, one-row footer, default-light theme persistence, semantic light/dark colors, safe areas, 44px targets, reduced motion, clean learner copy, and favicon.",
);
