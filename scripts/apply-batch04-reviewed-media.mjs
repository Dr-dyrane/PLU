import { readFile, writeFile } from "node:fs/promises";

const overridesUrl = new URL("../data/batch-04-reviewed-overrides.json", import.meta.url);
const commonUrl = new URL("./batch04/common.mjs", import.meta.url);

const overrides = JSON.parse(await readFile(overridesUrl, "utf8"));
let common = await readFile(commonUrl, "utf8");

const block = /export const mediaOverridesByCatalogId = \{[\s\S]*?\n\};\n\nexport const knownBadMediaFiles/;
if (!block.test(common)) {
  throw new Error("Could not locate the Batch 04 media override block.");
}

common = common.replace(
  block,
  `export const mediaOverridesByCatalogId = ${JSON.stringify(overrides, null, 2)};\n\nexport const knownBadMediaFiles`,
);

if (!common.includes("const reviewedAliasOnly =")) {
  const safetyGuard = /(\s+const safety = analyzeCandidate\(item, candidate, context\);\n)(\s*)if \(!safety\.safe\) \{/;
  if (!safetyGuard.test(common)) {
    throw new Error("Could not locate the reviewed-override safety guard.");
  }

  common = common.replace(
    safetyGuard,
    `$1$2const reviewedAliasOnly =\n$2  !safety.safe &&\n$2  safety.reasons.length === 1 &&\n$2  safety.reasons[0] === "missing-product-head";\n\n$2if (!safety.safe && !reviewedAliasOnly) {`,
  );
}

await writeFile(commonUrl, common, "utf8");
console.log(
  `Applied ${Object.keys(overrides).length} reviewed Batch 04 media overrides with alias-only review support.`,
);
