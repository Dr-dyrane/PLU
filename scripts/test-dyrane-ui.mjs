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

// Keep the guard narrow: soft depth, rounded corners and keyboard outlines are valid.
assert.deepEqual(decorationFailures(".ok { border: 0; border-top: none; border-radius: 18px; box-shadow: 0 12px 38px rgba(0,0,0,.08); }"), []);
for (const declaration of ["border: 1px solid red", "border-bottom: 1px solid var(--hairline)", "box-shadow: inset 0 1px 0 white", "box-shadow: 0 0 0 1px var(--accent)", "box-shadow: 0 8px 20px rgba(0,0,0,.1), 0 0 0 2px red"]) assert.ok(decorationFailures(`.no { ${declaration}; }`).length > 0, declaration);
assert.ok(hasFocusOutline(".link:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }", ".link:focus-visible"));
assert.equal(hasFocusOutline(".link:focus-visible { outline: none; }", ".link:focus-visible"), false);

for (const [file, focusSelector] of surfaces) {
  const css = await readFile(new URL(`../app/styles/canon/${file}`, import.meta.url), "utf8");
  assert.deepEqual(decorationFailures(css), [], `${file}: use spacing and tonal surfaces, not decorative borders or outline shadows`);
  assert.ok(hasFocusOutline(css, focusSelector), `${file}: retain a visible keyboard outline for ${focusSelector}`);
}

console.log("Dyrane UI: three new surfaces stay border-free without outline-shadow substitutes; keyboard focus outlines remain visible.");
