import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const catalogDirectory = new URL("../data/catalog/", import.meta.url);
const catalogFiles = (await readdir(catalogDirectory))
  .filter((name) => /^\d+\.json$/.test(name))
  .sort();

const catalog = (
  await Promise.all(
    catalogFiles.map(async (name) =>
      JSON.parse(await readFile(new URL(name, catalogDirectory), "utf8")),
    ),
  )
).flat();

const singlePegs = JSON.parse(
  await readFile(new URL("../data/pegs/single.json", import.meta.url), "utf8"),
);
const pairFiles = ["00-24.json", "25-49.json", "50-74.json", "75-99.json"];
const pairPegs = Object.assign(
  {},
  ...(await Promise.all(
    pairFiles.map(async (name) =>
      JSON.parse(await readFile(new URL(`../data/pegs/${name}`, import.meta.url), "utf8")),
    ),
  )),
);
const pegTable = { single: singlePegs, pairs: pairPegs };
const aisles = JSON.parse(
  await readFile(new URL("../data/aisles.json", import.meta.url), "utf8"),
);

function chunkPluCode(code) {
  const digits = String(code).replace(/\D/g, "");
  if (!digits) return [];

  const chunks = [];
  let cursor = 0;

  if (digits.length % 2 === 1) {
    chunks.push(digits[0]);
    cursor = 1;
  }

  for (; cursor < digits.length; cursor += 2) {
    chunks.push(digits.slice(cursor, cursor + 2));
  }

  return chunks;
}

assert.equal(catalog.length, 475, "The source catalog must retain all 475 rows.");
assert.equal(Object.keys(pegTable.single).length, 10, "Expected 10 single-digit pegs.");
assert.equal(Object.keys(pegTable.pairs).length, 100, "Expected 100 pair pegs.");
assert.ok(aisles.length > 40, "Expected the grocery aisle directory.");

const greenPepper = catalog.find(
  (item) => item.item === "Peppers - Green" && item.codes.includes("4065"),
);
assert.ok(greenPepper, "Green Pepper → 4065 must exist in the catalog.");

assert.deepEqual(chunkPluCode("4065"), ["40", "65"]);
assert.deepEqual(chunkPluCode("433"), ["4", "33"]);
assert.deepEqual(chunkPluCode("94133"), ["9", "41", "33"]);
assert.equal(pegTable.pairs["40"].name, "Rick Ross");
assert.equal(pegTable.pairs["65"].name, "Julius Caesar");

console.log(
  `Validated ${catalog.length} catalog rows, 110 mnemonic pegs, ${aisles.length} aisle entries, and the Green Pepper learning path.`,
);
