import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const surfaces = [
  ["today.css", ".todayStart:focus-visible"],
  ["learning-navigation.css", ".learningNavigation a:focus-visible"],
  ["core-session.css", ".coreSession a:focus-visible"],
];

const withoutComments = css => css.replace(/\/\*[\s\S]*?\*\//g, "");
const declarations = css => [...withoutComments(css).matchAll(/(?:^|[;{])\s*([a-z-]+)\s*:\s*([^;{}]+)/gi)].map(([, property, value]) => [property.toLowerCase(), value.trim().replace(/\s*!important\s*$/i, "")]);

function shadowLayers(value) {
  const layers = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "(") depth += 1;
    if (value[index] === ")") depth -= 1;
    if (value[index] === "," && depth === 0) { layers.push(value.slice(start, index)); start = index + 1; }
  }
  return [...layers, value.slice(start)];
}

function decorationFailures(css) {
  const failures = [];
  for (const [property, value] of declarations(css)) {
    if (/^border(?:-|$)/.test(property) && !property.endsWith("radius") && !/^(?:none|0(?:[a-z%]+)?)(?:\s+(?:none|0(?:[a-z%]+)?))*$/i.test(value)) failures.push(`${property}: ${value}`);
    if (property !== "box-shadow" || value === "none") continue;
    for (const layer of shadowLayers(value)) {
      const geometry = layer.replace(/[a-z-]+\([^)]*\)/gi, "");
      const lengths = [...geometry.matchAll(/(?:^|\s)([-+]?(?:\d*\.\d+|\d+)(?:px|em|rem|%)?)(?=\s|$)/gi)].map(([, length]) => Number.parseFloat(length));
      const outline = lengths.length >= 3 && lengths.slice(0, 3).every(length => length === 0) && (lengths.length < 4 || lengths[3] !== 0);
      if (/\binset\b/i.test(layer) || outline) failures.push(`box-shadow: ${layer.trim()}`);
    }
  }
  return failures;
}

function hasFocusOutline(css, selector) {
  return [...withoutComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].some(([, selectors, body]) => selectors.split(",").some(value => value.trim() === selector) && declarations(body).some(([property, value]) => property === "outline" && (value === "auto" || Number.parseFloat(value) > 0) && !/\bnone\b/.test(value)));
}

function shellWidthFailures(css, selector, requireFullWidth = true) {
  const rules = [...withoutComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, selectors]) => selectors.split(",").some(value => value.trim() === selector));
  const sizing = rules.flatMap(([, , body]) => declarations(body)).filter(([property]) => property === "width" || property === "max-width");
  const failures = sizing.filter(([property, value]) => property === "width" ? value !== "100%" : !["none", "100%"].includes(value)).map(([property, value]) => `${property}: ${value}`);
  if (requireFullWidth && !sizing.some(([property, value]) => property === "width" && value === "100%")) failures.push("missing width: 100%");
  return failures;
}

// Keep the guard narrow: soft depth, rounded corners and keyboard outlines are valid.
assert.deepEqual(decorationFailures(".ok { border: 0; border-top: none; border-radius: 18px; box-shadow: 0 12px 38px rgba(0,0,0,.08); }"), []);
for (const declaration of ["border: 1px solid red", "border-bottom: 1px solid var(--hairline)", "box-shadow: inset 0 1px 0 white", "box-shadow: 0 0 0 1px var(--accent)", "box-shadow: 0 8px 20px rgba(0,0,0,.1), 0 0 0 2px red"]) assert.ok(decorationFailures(`.no { ${declaration}; }`).length > 0, declaration);
assert.ok(hasFocusOutline(".link:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }", ".link:focus-visible"));
assert.equal(hasFocusOutline(".link:focus-visible { outline: none; }", ".link:focus-visible"), false);

// Only page shells stretch; text measures and controls may retain their own widths.
assert.deepEqual(shellWidthFailures(".shell, .other { width: 100%; max-width: none; } .shell p { max-width: 44ch; } .control { width: min(100%, 220px); } @media (max-width: 600px) { .shell { padding: 16px; } }", ".shell"), []);
assert.ok(shellWidthFailures(".shell p { width: 100%; }", ".shell").length > 0);
for (const declaration of ["max-width: 1200px", "width: 1200px", "width: min(100%, 1200px)", "width: clamp(320px, 100%, 1200px)"]) assert.ok(shellWidthFailures(`.shell { width: 100%; } @media (min-width: 900px) { .shell { ${declaration}; } }`, ".shell").length > 0, declaration);
assert.deepEqual(shellWidthFailures(".learningApp .appFooter { margin-top: auto; }", ".learningApp .appFooter", false), []);
assert.ok(shellWidthFailures(".learningApp .appFooter { width: min(100%, 1200px); }", ".learningApp .appFooter", false).length > 0);

for (const [file, focusSelector] of surfaces) {
  const css = await readFile(new URL(`../app/styles/canon/${file}`, import.meta.url), "utf8");
  assert.deepEqual(decorationFailures(css), [], `${file}: use spacing and tonal surfaces, not decorative borders or outline shadows`);
  assert.ok(hasFocusOutline(css, focusSelector), `${file}: retain a visible keyboard outline for ${focusSelector}`);
}

for (const [file, selector] of [["today.css", ".todayPage"], ["learning-navigation.css", ".learningHeader"], ["batch.css", ".batchPage"], ["footer.css", ".appFooter"]]) {
  const css = await readFile(new URL(`../app/styles/canon/${file}`, import.meta.url), "utf8");
  assert.deepEqual(shellWidthFailures(css, selector), [], `${file}: ${selector} must use the available width without a page-width cap`);
  if (file === "learning-navigation.css") assert.deepEqual(shellWidthFailures(css, ".learningApp .appFooter", false), [], `${file}: the footer override must not restore a page-width cap`);
}

// Source contracts only: rendered card sizing and scroll behavior still need browser QA.
const [catalogControls, mobileGrid, batchGrid] = await Promise.all(["catalog-controls.css", "mobile-grid.css", "batch.css"].map(async file => withoutComments(await readFile(new URL(`../app/styles/canon/${file}`, import.meta.url), "utf8"))));
const libraryGrid = catalogControls.match(/@media\s*\(min-width:\s*561px\)\s*\{\s*\.batchLibrary\s+\.batchReadyGrid\s*\{([^{}]*)\}\s*\}/);
assert.ok(libraryGrid, "Adaptive card density must be scoped to Library above the existing phone breakpoint.");
assert.ok(declarations(libraryGrid[1]).some(([property, value]) => property === "grid-template-columns" && value.replace(/\s+/g, "") === "repeat(auto-fill,minmax(min(100%,14rem),1fr))"), "Library must retain 14rem minimum cards and empty auto-fill tracks for sparse results.");
assert.equal((catalogControls.match(/grid-template-columns\s*:/g) ?? []).length, 1, "The density override must not introduce an unscoped standalone or phone grid.");
for (const [breakpoint, columns] of [[560, "repeat(2,minmax(0,1fr))"], [350, "1fr"]]) {
  const media = mobileGrid.match(new RegExp(`@media\\s*\\(max-width:\\s*${breakpoint}px\\)\\s*\\{([\\s\\S]*?)(?=@media|$)`));
  const grid = media?.[1].match(/\.batchReadyGrid\s*\{([^{}]*)\}/);
  assert.ok(grid && declarations(grid[1]).some(([property, value]) => property === "grid-template-columns" && value.replace(/\s+/g, "") === columns), `Retain the existing ${breakpoint}px phone grid.`);
}
const standaloneGrid = batchGrid.match(/\.batchReadyGrid\s*\{([^{}]*)\}/);
assert.ok(standaloneGrid && declarations(standaloneGrid[1]).some(([property, value]) => property === "grid-template-columns" && value.replace(/\s+/g, "") === "repeat(3,minmax(0,1fr))"), "Standalone batches must retain their three-column desktop grid.");

console.log("Dyrane UI: border-free focus-visible surfaces and full-width shells; Library density preserves phone and standalone grid contracts.");
