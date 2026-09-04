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

const strictOverrideGuard = `    if (!safety.safe) {
      throw new Error(
        \`Reviewed override \${overrideTitle} is unsafe for \${item.title}: \${safety.reasons.join(", ")}\`,
      );
    }`;

const reviewedAliasGuard = `    const reviewedAliasOnly =
      !safety.safe &&
      safety.reasons.length === 1 &&
      safety.reasons[0] === "missing-product-head";

    if (!safety.safe && !reviewedAliasOnly) {
      throw new Error(
        \`Reviewed override \${overrideTitle} is unsafe for \${item.title}: \${safety.reasons.join(", ")}\`,
      );
    }`;

if (!common.includes(strictOverrideGuard) && !common.includes(reviewedAliasGuard)) {
  throw new Error("Could not locate the strict reviewed-override safety guard.");
}
common = common.replace(strictOverrideGuard, reviewedAliasGuard);

await writeFile(commonUrl, common, "utf8");
console.log(
  `Applied ${Object.keys(overrides).length} reviewed Batch 04 media overrides with alias-only review support.`,
);
