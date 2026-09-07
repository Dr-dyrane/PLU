import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = relative => readFile(new URL(`../${relative}`, import.meta.url), "utf8");
const [layout, today, library, shell, navigation, batch, css] = await Promise.all([
  "app/(learning)/layout.tsx",
  "app/(learning)/page.tsx",
  "app/(learning)/library/page.tsx",
  "components/canon/LearningShell.tsx",
  "components/canon/LearningNavigation.tsx",
  "components/canon/BatchHome.tsx",
  "app/styles/canon/learning-navigation.css",
].map(read));
const count = (source, pattern) => [...source.matchAll(pattern)].length;
const rules = selector => [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, selectors]) => selectors.split(",").some(value => value.trim() === selector)).map(([, , body]) => body).join(" ").replace(/\s+/g, "");

assert.match(layout, /<LearningShell>\s*\{children\}\s*<\/LearningShell>/, "The route-group layout must own the persistent learning shell.");
assert.equal(count(layout, /<LearningShell\b/g), 1);
for (const [name, page] of [["Today", today], ["Library", library]]) {
  assert.doesNotMatch(page, /HomeFooter|LearningNavigation|LearningShell|learningHeader|learningApp/, `${name} must provide route content, not duplicate the shared chrome.`);
}
assert.match(today, /TodayHome/);
assert.match(library, /mode="library"/);
for (const component of ["LearningNavigation", "HomeFooter"]) assert.equal(count(shell, new RegExp(`<${component}\\b`, "g")), 1, `The shared shell must render ${component} once.`);
assert.equal(count(shell, /className="learningHeader"/g), 1);
assert.equal(count(shell, /className="batchBrand"/g), 1);
assert.match(shell, /className="learningApp"/);
assert.match(shell, /className="learningContent"/);
assert.match(shell, /\{children\}/);
assert.match(shell, /useLayoutEffect/);
assert.match(shell, /\.scrollTop\s*=\s*0/);
assert.match(shell, /\[pathname\]/, "Switching route content must reset its own scroll position.");
assert.doesNotMatch(shell, /key=\{pathname\}/, "Navigation must not remount the persistent shell.");

assert.match(navigation, /^"use client";/);
assert.match(navigation, /usePathname\(\)/);
assert.match(navigation, /function LearningNavigation\(\)/, "The active destination must come from the route, not a page-supplied prop.");
assert.equal(count(navigation, /aria-current=/g), 2);
assert.match(navigation, /<Link\b[^>]*href="\/"[^>]*>\s*<Sun\b[^>]*\/>\s*Today\s*<\/Link>/, "Today must retain its Sun icon in both states.");
assert.match(navigation, /<Link\b[^>]*href="\/library\/"[^>]*>\s*<BookOpen\b[^>]*\/>\s*Library\s*<\/Link>/, "Library must retain its BookOpen icon in both states.");
assert.doesNotMatch(batch, /LearningNavigation/);
assert.match(batch, /mode !== "library" &&\s*<header className="batchTopbar"/, "Standalone batches retain their header; Library uses the shared header.");

for (const declaration of ["height:100dvh", "display:grid", "grid-template-rows:auto minmax(0,1fr) auto".replaceAll(" ", ""), "overflow:hidden"]) assert.ok(rules(".learningApp").includes(declaration), `Shared viewport frame is missing ${declaration}.`);
for (const declaration of ["min-height:0", "overflow-y:auto"]) assert.ok(rules(".learningContent").includes(declaration), `Only route content should scroll: missing ${declaration}.`);
assert.ok(rules('.learningNavigation a[aria-current="page"]').length > 0, "The active route needs a visible selected state.");

console.log("Learning shell: shared route layout owns one header/footer; stable route-aware icons and contained content scrolling retain standalone batch navigation.");
