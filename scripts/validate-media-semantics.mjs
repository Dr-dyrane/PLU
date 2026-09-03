import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  allowedMime,
  hardBlockedTokens,
  knownBadMediaFiles,
  mediaOverridesByCatalogId,
  normalize,
  queryAliasesByCatalogId,
  softBlockedTokens,
  words,
} from "./batch04/common.mjs";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));
}

const headGroups = [
  ["apple", "apples"], ["apricot", "apricots"], ["artichoke", "artichokes"],
  ["asparagus"], ["avocado", "avocados"], ["banana", "bananas", "plantain", "plantains"],
  ["basil"], ["bean", "beans"], ["beet", "beets", "beetroot"],
  ["bittermelon", "bitter", "gourd", "momordica"], ["bok", "choi", "pak"],
  ["breadfruit"], ["broccoli", "lan"], ["cabbage", "cabbages", "napa", "savoy"],
  ["carrot", "carrots"], ["cassava", "yucca", "yuca"], ["collard", "collards"],
  ["cucumber", "cucumbers"], ["dandelion"], ["dill"], ["eddoe", "eddoes", "taro", "colocasia"],
  ["endive", "escarole", "cichorium"], ["fennel", "anise"], ["grape", "grapes", "raisin"],
  ["horseradish"], ["jicama"], ["kale", "cavolo"], ["kohlrabi"],
  ["leek", "leeks"], ["lettuce"], ["lotus"], ["mango", "mangos", "mangoes"],
  ["melon", "melons", "honeydew", "watermelon", "watermelons"], ["mint"],
  ["mushroom", "mushrooms", "pleurotus"], ["nectarine", "nectarines"],
  ["onion", "onions", "shallot", "shallots"], ["parsley"], ["pea", "peas", "pisum"],
  ["pear", "pears", "pyrus", "nashi"], ["pepper", "peppers", "chili", "chilli", "capsicum"],
  ["persimmon", "persimmons", "hachiya"], ["pomelo", "pummelo", "citrus"],
  ["potato", "potatoes", "yam", "yams", "dioscorea", "boniato"],
  ["prickly", "opuntia"], ["radicchio", "chicory"], ["radish", "radishes"],
  ["rapini", "rabe", "raab"], ["rhubarb", "rheum"], ["rutabaga", "swede"],
  ["squash", "chayote", "butternut", "acorn", "zucchini", "courgette", "cucurbita"],
  ["tangelo", "minneola"], ["tangerine", "mandarin"], ["tomato", "tomatoes"],
  ["turmeric", "curcuma", "kurkuma"],
  ["berry", "berries", "blueberry", "blackberry", "raspberry", "strawberry"],
  ["cauliflower"], ["celery"], ["cherry", "cherries"], ["coconut"], ["corn"],
  ["date", "dates"], ["eggplant", "aubergine"], ["fig", "figs"], ["garlic"],
  ["ginger"], ["kiwi"], ["longan", "lychee", "rambutan"], ["okra"], ["papaya", "papayas"],
  ["parsnip", "parsnips"], ["passion"], ["peach", "peaches"], ["pineapple", "pineapples"],
  ["plum", "plums", "pluot"], ["pomegranate", "pomegranates"], ["spinach"],
  ["starfruit", "guava"], ["turnip", "turnips"],
];

function targetHead(item) {
  const target = new Set([
    ...words(item.title),
    ...words(item.query),
    ...(queryAliasesByCatalogId[item.catalogId] ?? []).flatMap(words),
  ]);
  return headGroups.find((group) => group.some((token) => target.has(token))) ?? [];
}

function validateMediaItem(item, label) {
  assert.ok(item.catalogId && item.title && item.file, `${label}: identity fields are required.`);
  assert.ok(!knownBadMediaFiles.has(item.file), `${label}: known incorrect image is still selected: ${item.file}`);
  assert.ok(allowedMime.has(item.mime), `${label}: unsupported image type ${item.mime}.`);
  assert.ok(Number(item.width) >= 360 && Number(item.height) >= 300, `${label}: source image is too small.`);
  assert.ok(
    typeof item.src === "string" && /^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(item.src),
    `${label}: image must resolve through Wikimedia's image host.`,
  );

  const filenameTokens = new Set(words(item.file));
  for (const token of hardBlockedTokens) {
    assert.ok(!filenameTokens.has(token), `${label}: filename contains blocked subject '${token}'.`);
  }

  const target = new Set([
    ...words(item.title),
    ...words(item.query),
    ...(queryAliasesByCatalogId[item.catalogId] ?? []).flatMap(words),
  ]);
  for (const token of softBlockedTokens) {
    assert.ok(
      !filenameTokens.has(token) || target.has(token),
      `${label}: image is a non-retail '${token}' view rather than the checkout item.`,
    );
  }

  assert.ok(
    ["strict-identity-match", "clean-family-fallback", "reviewed-override"].includes(item.match),
    `${label}: unreviewed media match mode ${item.match}.`,
  );

  if (mediaOverridesByCatalogId[item.catalogId]) {
    assert.equal(item.match, "reviewed-override", `${label}: configured reviewed override was not used.`);
    assert.equal(item.file, mediaOverridesByCatalogId[item.catalogId], `${label}: incorrect reviewed override file.`);
  } else {
    const head = targetHead(item);
    assert.ok(head.length > 0, `${label}: no product-head vocabulary is configured.`);
    assert.ok(
      head.some((token) => filenameTokens.has(token)),
      `${label}: filename does not identify the intended product family (${item.file}).`,
    );
  }

  assert.ok(Number(item.score) >= 55, `${label}: resolver confidence is below 55.`);
  assert.ok(!/\b(18\d{2}|19[0-5]\d)\b/.test(normalize(item.file)), `${label}: historical scan selected.`);
}

const reports = [
  ["Batch 04", await readJson("../public/media-resolution-batch04.json")],
  ["Batch 05", await readJson("../public/media-resolution-batch05.json")],
];

const exactMappings = new Set();
let validated = 0;
for (const [batchLabel, report] of reports) {
  assert.equal(report.media?.length, 100, `${batchLabel}: expected 100 generated media selections.`);
  for (const item of report.media) {
    const label = `${batchLabel}/${item.order}/${item.title}`;
    validateMediaItem(item, label);
    const mapping = `${item.catalogId}:${item.storyId}`;
    assert.ok(!exactMappings.has(mapping), `${label}: duplicate image audit mapping.`);
    exactMappings.add(mapping);
    validated += 1;
  }
}

console.log(
  `Validated ${validated} Batch 04–05 media selections for product-head identity, safe subject matter, dimensions, source host, and reviewed overrides.`,
);
