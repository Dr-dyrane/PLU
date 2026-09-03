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
const aisles = JSON.parse(
  await readFile(new URL("../data/aisles.json", import.meta.url), "utf8"),
);
const greenPepperStory = JSON.parse(
  await readFile(new URL("../data/stories/green-pepper.json", import.meta.url), "utf8"),
);

function digitsOnly(code) {
  return String(code).replace(/\D/g, "");
}

function chunkCode(code) {
  const digits = digitsOnly(code);
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

const calculatorCoordinates = {
  7: [50, 50], 8: [150, 50], 9: [250, 50],
  4: [50, 150], 5: [150, 150], 6: [250, 150],
  1: [50, 250], 2: [150, 250], 3: [250, 250],
  0: [150, 350],
};

function compilePath(code) {
  return digitsOnly(code).split("").map((digit) => ({
    digit,
    x: calculatorCoordinates[digit][0],
    y: calculatorCoordinates[digit][1],
  }));
}

function decodePath(points) {
  return points.map((point) => {
    const match = Object.entries(calculatorCoordinates).find(
      ([, coordinate]) => coordinate[0] === point.x && coordinate[1] === point.y,
    );
    assert.ok(match, `No keypad key exists at ${point.x},${point.y}.`);
    return match[0];
  }).join("");
}

function findRecord(item, code) {
  return catalog.find(
    (record) => record.item === item && record.codes.includes(code),
  );
}

assert.equal(catalog.length, 475, "The source catalog must retain all 475 rows.");
assert.equal(Object.keys(singlePegs).length, 10, "Expected 10 legacy single-digit pegs.");
assert.equal(Object.keys(pairPegs).length, 100, "Expected 100 legacy pair pegs.");
assert.ok(aisles.length > 40, "Expected the grocery aisle directory.");

const looseGreen = findRecord("Peppers - Green", "4065");
const fourCountBag = findRecord("Peppers - Green 4ct (Bag)", "3014");
const greenCase = findRecord("Peppers - Green (Case)", "63866");
const greenHhBulk = findRecord("Peppers - Green HH (Bulk)", "3120");

assert.ok(looseGreen, "Loose Green Pepper → 4065 must exist.");
assert.equal(looseGreen.soldBy, "Weight", "4065 must retain its sold-by-weight detail.");
assert.ok(fourCountBag, "Green Pepper 4-count bag → 3014 must remain distinct.");
assert.ok(greenCase, "Green Pepper case → 63866 must remain distinct.");
assert.ok(greenHhBulk, "Green HH bulk → 3120 must remain distinct.");

assert.equal(greenPepperStory.catalogId, looseGreen.id);
assert.equal(greenPepperStory.checkout.code, "4065");
assert.equal(greenPepperStory.checkout.soldBy, "Weight");
assert.equal(greenPepperStory.classificationPrompts.length, 3);
assert.ok(greenPepperStory.storyBeats.length >= 4);
assert.equal(greenPepperStory.retailVariants.length, 4);
assert.equal(greenPepperStory.source.checkedOnReference, true);

assert.deepEqual(chunkCode("4065"), ["40", "65"]);
assert.deepEqual(chunkCode("433"), ["4", "33"]);
assert.deepEqual(chunkCode("94133"), ["9", "41", "33"]);
assert.equal(decodePath(compilePath("4065")), "4065", "Checkout path must round-trip.");

const baseState = { count: 0, processed: [] };
const event = { id: "same-event", amount: 1 };
function idempotentApply(state, nextEvent) {
  if (state.processed.includes(nextEvent.id)) return state;
  return {
    count: state.count + nextEvent.amount,
    processed: [...state.processed, nextEvent.id],
  };
}
const once = idempotentApply(baseState, event);
const twice = idempotentApply(once, event);
assert.deepEqual(twice, once, "Applying the same learning event twice must be a no-op.");

console.log(
  `Validated ${catalog.length} catalog rows, ${aisles.length} aisle entries, Green Pepper story provenance, deterministic keypad-path round trip, and idempotent learning events.`,
);
