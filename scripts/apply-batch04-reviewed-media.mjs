import { readFile, writeFile } from "node:fs/promises";

const overridesUrl = new URL("../data/batch-04-reviewed-overrides.json", import.meta.url);
const commonUrl = new URL("./batch04/common.mjs", import.meta.url);
const mediaUrl = new URL("./batch04/media.mjs", import.meta.url);

const overridesText = await readFile(overridesUrl, "utf8");
const overrideKeys = [...overridesText.matchAll(/^\s*"([^"]+)"\s*:/gm)].map((match) => match[1]);
const duplicateOverrideKeys = overrideKeys.filter(
  (key, index) => overrideKeys.indexOf(key) !== index,
);
if (duplicateOverrideKeys.length > 0) {
  throw new Error(
    `Reviewed media overrides contain duplicate catalog IDs: ${[
      ...new Set(duplicateOverrideKeys),
    ].join(", ")}.`,
  );
}
const overrides = JSON.parse(overridesText);
let common = await readFile(commonUrl, "utf8");

const overrideBlock = /export const mediaOverridesByCatalogId = \{[\s\S]*?\n\};\n\nexport const knownBadMediaFiles/;
if (!overrideBlock.test(common)) {
  throw new Error("Could not locate the Batch 04 media override block.");
}

common = common.replace(
  overrideBlock,
  `export const mediaOverridesByCatalogId = ${JSON.stringify(overrides, null, 2)};\n\nexport const knownBadMediaFiles`,
);
await writeFile(commonUrl, common, "utf8");

let media = await readFile(mediaUrl, "utf8");
if (!media.includes("const reviewedAliasOnly =")) {
  const strictGate = `    const analyzed = { page, ...analyzeCandidate(page, item, usedFiles, "family") };
    if (!analyzed.valid) {
      throw new Error(\`${"${item.title}"}: reviewed media override failed safety checks (${"${analyzed.reason}"}).\`);
    }`;

  const reviewedGate = `    const analyzed = { page, ...analyzeCandidate(page, item, usedFiles, "family") };
    const reviewedAliasOnly =
      !analyzed.valid && analyzed.reason === "missing-product-head";
    if (!analyzed.valid && !reviewedAliasOnly) {
      throw new Error(\`${"${item.title}"}: reviewed media override failed safety checks (${"${analyzed.reason}"}).\`);
    }`;

  if (!media.includes(strictGate)) {
    throw new Error("Could not locate the strict reviewed-override gate in batch04/media.mjs.");
  }
  media = media.replace(strictGate, reviewedGate);
  await writeFile(mediaUrl, media, "utf8");
}

console.log(
  `Applied ${Object.keys(overrides).length} reviewed Batch 04 media overrides with alias-only review support.`,
);
