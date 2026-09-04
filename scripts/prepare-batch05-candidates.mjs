import { writeFile } from "node:fs/promises";

import { loadJsonRecords, normalize, slugify } from "./batch04/common.mjs";

const OUTPUT_URL = new URL("../data/batch-05-candidates.json", import.meta.url);
const TARGET_POOL_SIZE = 250;
const SPECIFIC_FAMILY_RULE_COUNT = 31;

const familyRules = [
  { test: /\bwatercress\b/i, family: "Leafy Greens", singular: "watercress", form: "Small leafy stems", color: "Green" },
  { test: /\b(?:banana squash|squash\s*-\s*banana)\b/i, family: "Squash", singular: "squash", form: "Large elongated squash", color: "Pink-orange" },
  { test: /\bprickly pears?\b/i, family: "Tropical Fruit", singular: "prickly pear", form: "Oval cactus fruit", color: "Red-green" },
  { test: /\bcherry plum\b/i, family: "Plums", singular: "plum", form: "Small round stone fruit", color: "Red-purple" },
  { test: /\btomatoes?\s*-\s*roma\b|\broma\s*\/\s*plum\b/i, family: "Tomatoes", singular: "tomato", form: "Oblong meaty tomato", color: "Red" },
  { test: /\baloe\b/i, family: "Stalk Vegetables", singular: "aloe", form: "Thick tapered succulent leaves", color: "Green" },
  { test: /\barrow head|arrow root|malagna|malanga|water chestnut|lily bulbs?\b/i, family: "Roots", singular: "root vegetable", form: "Firm underground root or corm", color: "Brown-white" },
  { test: /\bbamboo shoots?\b/i, family: "Stalk Vegetables", singular: "bamboo shoot", form: "Layered tapered shoot", color: "Cream-green" },
  { test: /\bbreadnut|cherimoya|chikoo|naseberry|tamarind\b/i, family: "Tropical Fruit", singular: "tropical fruit", form: "Distinct whole fruit", color: "Green-brown" },
  { test: /\bchives?\b/i, family: "Alliums", singular: "chives", form: "Thin hollow green stalks", color: "Green" },
  { test: /\bfennel|anise\b/i, family: "Stalk Vegetables", singular: "fennel", form: "Layered bulb with feathery fronds", color: "White-green" },
  { test: /\bgai choy|methi|sher[- ]li[- ]hon|u ?choy|yu choy\b/i, family: "Leafy Greens", singular: "leafy greens", form: "Broad leafy stems", color: "Green" },
  { test: /\bswiss chard\b/i, family: "Leafy Greens", singular: "Swiss chard", form: "Broad leaves with thick ribbed stems", color: "Green-red" },
  { test: /\bguar\b/i, family: "Beans", singular: "beans", form: "Slender green pods", color: "Green" },
  { test: /\bpumpkins?\b/i, family: "Squash", singular: "pumpkin", form: "Round ribbed gourd", color: "Green-orange" },
  { test: /\bkarella|parval|\bqua\b|tinda|tindora|vegetable marrow\b/i, family: "Squash", singular: "squash", form: "Firm gourd or squash", color: "Green-orange" },
  { test: /\bkohlrabi\b/i, family: "Roots", singular: "kohlrabi", form: "Round swollen stem with shoots", color: "Green-purple" },
  { test: /\bsugar cane\b/i, family: "Stalk Vegetables", singular: "sugar cane", form: "Long jointed cane stalk", color: "Green-purple" },
  { test: /\btamarillo|tomatillos?\b/i, family: "Tomatoes", singular: "tomato", form: "Smooth round or oval fruit", color: "Red-green" },
  { test: /\byams?\b/i, family: "Yams", singular: "yam", form: "Long firm tuber", color: "Brown" },
  { test: /\btaro root\b/i, family: "Roots", singular: "taro root", form: "Round hairy corm", color: "Brown" },
  { test: /\bsweet potato(?:es)?\b|\bpotato(?:es)?\b/i, family: "Potatoes", singular: "potato", form: "Firm round or tapered tuber", color: "Brown" },
  { test: /\bcelery\s*-\s*root|\bceleriac\b/i, family: "Roots", singular: "celery root", form: "Large knobbly round root", color: "Cream-brown" },
  { test: /\bgranadilla\b/i, family: "Tropical Fruit", singular: "granadilla", form: "Round passion fruit", color: "Orange-yellow" },
  { test: /\bbean sprouts?\b/i, family: "Sprouts", singular: "bean sprouts", form: "Tender sprouted stems", color: "White-yellow" },
  { test: /\bsugar pea tips?\b/i, family: "Leafy Greens", singular: "sugar pea tips", form: "Tender leafy pea shoots", color: "Green" },
  { test: /\bwatermelons?\b.*\bcuts?\b|\bcuts?\b.*\bwatermelons?\b/i, family: "Watermelons", singular: "watermelon", form: "Cut watermelon pieces", color: "Red-green" },
  { test: /\bwatermelons?\b/i, family: "Watermelons", singular: "watermelon", form: "Large round or oval melon", color: "Green-red" },
  { test: /\bquince\b/i, family: "Quince", singular: "quince", form: "Firm pear-shaped pome fruit", color: "Yellow" },
  { test: /\b(?:almonds?|chestnuts?|filberts?)\b/i, family: "Nuts", singular: "nuts", form: "Loose whole nuts", color: "Brown" },
  { test: /\bdrumstick\b/i, family: "Pod Vegetables", singular: "moringa pod", form: "Long angular green pod", color: "Green" },
  { test: /\bapple/i, family: "Apples", singular: "apple", form: "Round apple", color: "Mixed" },
  { test: /\bapricot/i, family: "Apricots", singular: "apricot", form: "Small round stone fruit", color: "Orange" },
  { test: /\basparagus/i, family: "Asparagus", singular: "asparagus", form: "Long spear stalks", color: "Green" },
  { test: /\bavocado/i, family: "Avocados", singular: "avocado", form: "Pear-shaped fruit", color: "Green" },
  { test: /\bbanana|plantain/i, family: "Bananas", singular: "banana", form: "Long curved fruit", color: "Yellow-green" },
  { test: /\bbean/i, family: "Beans", singular: "beans", form: "Slender pods", color: "Green" },
  { test: /\bbeet/i, family: "Roots", singular: "beet", form: "Round root", color: "Red-purple" },
  { test: /\bberry|berries|blueberry|blackberry|raspberry|strawberry/i, family: "Berries", singular: "berries", form: "Small soft berries", color: "Mixed" },
  { test: /\bbok choy|pak choy|a choy|ong choy/i, family: "Leafy Greens", singular: "leafy green", form: "Leafy stem cluster", color: "Green" },
  { test: /\bbroccoli/i, family: "Broccoli", singular: "broccoli", form: "Branching green florets", color: "Green" },
  { test: /\bbrussels/i, family: "Brassicas", singular: "Brussels sprouts", form: "Small round leaf buds", color: "Green" },
  { test: /\bcabbage|nappa|napa/i, family: "Cabbages", singular: "cabbage", form: "Layered leafy head", color: "Green" },
  { test: /\bcarrot/i, family: "Carrots", singular: "carrot", form: "Tapered root", color: "Orange" },
  { test: /\bcauliflower/i, family: "Cauliflower", singular: "cauliflower", form: "Dense rounded florets", color: "White" },
  { test: /\bcelery/i, family: "Stalk Vegetables", singular: "celery", form: "Crisp ribbed stalks", color: "Green" },
  { test: /\bcherr(?:y|ies)/i, family: "Cherries", singular: "cherries", form: "Small round stone fruit", color: "Red" },
  { test: /\bcitrus|clementine|mandarin|tangerine|orange|grapefruit|lemon|lime|tangelo|pummelo|pomelo/i, family: "Citrus", singular: "citrus", form: "Round citrus fruit", color: "Orange-yellow" },
  { test: /\bcoconut/i, family: "Tropical Fruit", singular: "coconut", form: "Large round fibrous fruit", color: "Brown-green" },
  { test: /\bcorn/i, family: "Corn", singular: "corn", form: "Long husked ear", color: "Yellow-green" },
  { test: /\bcucumber/i, family: "Cucumbers", singular: "cucumber", form: "Long cylindrical fruit", color: "Green" },
  { test: /\bdate/i, family: "Dates", singular: "dates", form: "Small oblong fruit", color: "Brown" },
  { test: /\beggplant|aubergine/i, family: "Eggplants", singular: "eggplant", form: "Smooth oval fruit", color: "Purple" },
  { test: /\bendive|escarole|lettuce|radicchio/i, family: "Lettuce", singular: "lettuce", form: "Leafy head", color: "Green" },
  { test: /\bfig/i, family: "Figs", singular: "fig", form: "Soft teardrop fruit", color: "Purple-green" },
  { test: /\bgarlic/i, family: "Alliums", singular: "garlic", form: "Segmented bulb", color: "White" },
  { test: /\bginger|turmeric/i, family: "Roots", singular: "root", form: "Knobby branching rhizome", color: "Brown" },
  { test: /\bgrape/i, family: "Grapes", singular: "grapes", form: "Clustered round berries", color: "Green-red" },
  { test: /\bherb|basil|cilantro|coriander|dill|mint|parsley|rosemary|sage|thyme/i, family: "Herbs", singular: "herb", form: "Leafy herb stems", color: "Green" },
  { test: /\bkiwi/i, family: "Kiwi", singular: "kiwi", form: "Small oval fruit", color: "Brown-green" },
  { test: /\bleek|onion|shallot|scallion/i, family: "Alliums", singular: "allium", form: "Layered bulb or stalk", color: "White-green" },
  { test: /\blongan|lychee|rambutan/i, family: "Tropical Fruit", singular: "tropical fruit", form: "Small round tropical fruit", color: "Red-brown" },
  { test: /\bmango/i, family: "Mangoes", singular: "mango", form: "Oval tapered fruit", color: "Yellow-red" },
  { test: /\bmelon|watermelon/i, family: "Melons", singular: "melon", form: "Large round or oval melon", color: "Green-yellow" },
  { test: /\bmushroom/i, family: "Mushrooms", singular: "mushrooms", form: "Stemmed caps", color: "White-brown" },
  { test: /\bnectarine/i, family: "Nectarines", singular: "nectarine", form: "Smooth round stone fruit", color: "Red-yellow" },
  { test: /\bokra/i, family: "Okra", singular: "okra", form: "Ridged tapered pods", color: "Green" },
  { test: /\bpapaya/i, family: "Papayas", singular: "papaya", form: "Large oblong fruit", color: "Green-orange" },
  { test: /\bparsnip/i, family: "Roots", singular: "parsnip", form: "Pale tapered root", color: "Cream" },
  { test: /\bpassion fruit/i, family: "Tropical Fruit", singular: "passion fruit", form: "Small round fruit", color: "Purple-yellow" },
  { test: /\bpeach/i, family: "Peaches", singular: "peach", form: "Fuzzy round stone fruit", color: "Yellow-red" },
  { test: /\bpear/i, family: "Pears", singular: "pear", form: "Bell-shaped fruit", color: "Green-yellow" },
  { test: /\bpea/i, family: "Peas", singular: "peas", form: "Green pods", color: "Green" },
  { test: /\bpepper|chilli|chili/i, family: "Peppers", singular: "pepper", form: "Hollow tapered fruit", color: "Mixed" },
  { test: /\bpersimmon/i, family: "Persimmons", singular: "persimmon", form: "Round orange fruit with leafy cap", color: "Orange" },
  { test: /\bpineapple/i, family: "Pineapples", singular: "pineapple", form: "Large textured fruit with crown", color: "Green-yellow" },
  { test: /\bplum|pluot/i, family: "Plums", singular: "plum", form: "Smooth round stone fruit", color: "Purple-red" },
  { test: /\bpomegranate/i, family: "Pomegranates", singular: "pomegranate", form: "Round crowned fruit", color: "Red" },
  { test: /\bpotato|yam|taro|cassava|yucca|yuca|rutabaga|turnip|jicama|lotus root/i, family: "Roots", singular: "root vegetable", form: "Firm underground root or tuber", color: "Brown" },
  { test: /\bradish/i, family: "Roots", singular: "radish", form: "Small round or long root", color: "Red-white" },
  { test: /\brhubarb/i, family: "Stalk Vegetables", singular: "rhubarb", form: "Long thick stalks", color: "Red-green" },
  { test: /\bleafy greens?|spinach|kale|collard|dandelion|rapini|gai lan/i, family: "Leafy Greens", singular: "leafy greens", form: "Broad leafy stems", color: "Green" },
  { test: /\bsquash|zucchini|chayote/i, family: "Squash", singular: "squash", form: "Firm round or elongated squash", color: "Green-yellow" },
  { test: /\bstarfruit|dragon fruit|guava|breadfruit|atemoya|prickly pear/i, family: "Tropical Fruit", singular: "tropical fruit", form: "Distinct tropical fruit", color: "Mixed" },
  { test: /\btomato/i, family: "Tomatoes", singular: "tomato", form: "Smooth round or oblong fruit", color: "Red" },
];

const nonProduce = /\b(baked goods|bag points|flower bouquet|gift|pastr(?:y|ies)|reusable bag)\b/i;
const packageOrInventory = /\b(\d+(?:\.\d+)?\s*(?:ct|lb|lbs|kg|g|l|oz)|bag|bin|bottle|box|bushel|case|carton|clamshell|crate|dome|mesh|orchard run|pack|package|pallet|pc|pint|tray|wire)\b/i;
const uncertain = /\b(first word obscured|label as printed|obscured|unknown|unlabelled|unverified)\b/i;
const commonFamilyBonus = new Map([
  ["Apples", 18], ["Citrus", 18], ["Berries", 17], ["Pears", 16],
  ["Peaches", 16], ["Plums", 16], ["Grapes", 16], ["Tomatoes", 16],
  ["Peppers", 16], ["Mushrooms", 15], ["Leafy Greens", 15], ["Roots", 14],
  ["Squash", 14], ["Herbs", 14], ["Alliums", 14], ["Melons", 13],
]);
const excludedCatalogIds = new Set([
  "asparagus-organic",
  "avocado-caribbean",
  "cabbage-sour",
  "dill-weed-pickling-herbs",
  "garlic-loose-bulk",
  "kohlrabi-note-on-sheet-kohlrabi-1692-handwritten",
  "methileaf-herbs",
  "mushrooms-white-bulk-rcwc",
  "mangos-spice",
  "plumcots-handwritten",
  "pumpkins-jamaican",
  "sweet-potatoes-white",
  "tomatoes-vine-ripe-field-bulk",
]);

function familyRuleFor(item) {
  const specific = familyRules
    .slice(0, SPECIFIC_FAMILY_RULE_COUNT)
    .find((entry) => entry.test.test(item));
  if (specific) return specific;

  const [prefix] = item.split(/\s+-\s+/, 1);
  return (
    familyRules.slice(SPECIFIC_FAMILY_RULE_COUNT).find((entry) => entry.test.test(prefix)) ??
    familyRules.slice(SPECIFIC_FAMILY_RULE_COUNT).find((entry) => entry.test.test(item))
  );
}

const titleHeadByPrefix = new Map([
  ["apple", "apple"], ["apples", "apple"], ["apricot", "apricot"], ["apricots", "apricot"],
  ["avocado", "avocado"], ["avocados", "avocado"], ["banana", "banana"], ["bananas", "banana"],
  ["bok choy", "bok choy"], ["broccoli", "broccoli"], ["cabbage", "cabbage"], ["cabbages", "cabbage"],
  ["carrot", "carrot"], ["carrots", "carrot"], ["celery", "celery"], ["cherries", "cherries"],
  ["citrus", "citrus"], ["coconut", "coconut"], ["coconuts", "coconut"], ["corn", "corn"],
  ["cucumber", "cucumber"], ["cucumbers", "cucumber"], ["eggplant", "eggplant"], ["eggplants", "eggplant"],
  ["figs", "fig"], ["figgs", "fig"], ["garlic", "garlic"], ["grapefruit", "grapefruit"],
  ["grape", "grapes"], ["grapes", "grapes"], ["kale", "kale"], ["karella", "karella"],
  ["lemon", "lemon"], ["lemons", "lemon"], ["lettuce", "lettuce"], ["mangoes", "mango"],
  ["mangos", "mango"], ["melons", "melon"], ["mushroom", "mushrooms"], ["mushrooms", "mushrooms"],
  ["onion", "onion"], ["onions", "onion"], ["orange", "orange"], ["oranges", "orange"],
  ["papaya", "papaya"], ["papayas", "papaya"], ["peach", "peach"], ["peaches", "peach"],
  ["pear", "pear"], ["pears", "pear"], ["pepper", "pepper"], ["peppers", "pepper"],
  ["persimmon", "persimmon"], ["persimmons", "persimmon"], ["pineapple", "pineapple"],
  ["plum", "plum"], ["plums", "plum"], ["pomelo", "pomelo"], ["potato", "potato"],
  ["potatoes", "potato"], ["pumpkin", "pumpkin"], ["pumpkins", "pumpkin"], ["radish", "radish"],
  ["squash", "squash"], ["sweet potato", "sweet potato"], ["sweet potatoes", "sweet potato"],
  ["swiss chard", "Swiss chard"], ["tamarillo", "tamarillo"], ["tangerine", "tangerine"],
  ["tangerines", "tangerine"], ["taro root", "taro root"], ["tomato", "tomato"],
  ["tomatoes", "tomato"], ["watermelon", "watermelon"], ["watermelons", "watermelon"],
  ["yam", "yam"], ["yams", "yam"], ["yu choy", "Yu choy"],
]);

const titleOverridesByCatalogId = new Map([
  ["pumpkins-gourds", "Pumpkin gourds"],
  ["celery-root-celeriac", "Celeriac (celery root)"],
  ["arrow-head-tsee-goo", "Arrow Head (Tsee Goo)"],
  ["don-gua-winter-melon", "Don Gua (Winter Melon)"],
  ["methi-leaf-fenugreek", "Methi Leaf (Fenugreek)"],
  ["malagna-root-cocoes", "Malagna Root (Cocoes)"],
  ["watermelon-red-seedless-cuts", "Red seedless watermelon cuts"],
  ["garlic-loose-bulk", "Bulk loose garlic"],
  ["mushrooms-white-bulk-rcwc", "Bulk white mushrooms"],
  ["onions-yellow-bulk", "Bulk yellow onion"],
  ["almonds-bulk-nuts", "Almonds"],
  ["chestnuts-bulk-nuts", "Chestnuts"],
  ["filberts-bulk-nuts", "Filberts"],
  ["drumstick", "Drumstick (moringa pod)"],
]);

function cleanDescriptor(value) {
  return value
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b\d+\s*(?:ct|lb|lbs|kg|l)\b/gi, " ")
    .replace(/\b\d{3,6}\b/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[-–—\s]+|[-–—\s]+$/g, "")
    .trim();
}

function titleFor(record, rule) {
  const exactTitle = titleOverridesByCatalogId.get(record.id);
  if (exactTitle) return exactTitle;

  const raw = cleanDescriptor(record.item);
  const parts = raw.split(/\s+-\s+/).map(cleanDescriptor).filter(Boolean);
  if (parts.length < 2) return raw;

  const prefix = parts[0];
  const descriptor = parts.slice(1).join(" ");
  const descriptorWords = normalize(descriptor);
  const singular = titleHeadByPrefix.get(normalize(prefix)) ?? rule.singular;

  if (/\b(herbs|roots|nuts|baked goods|bulk|loose|each|single)\b/i.test(descriptor)) {
    return prefix;
  }
  if (descriptorWords.includes(normalize(singular)) || normalize(prefix).includes(descriptorWords)) {
    return descriptor;
  }
  if (/\bapple/i.test(prefix)) return `${descriptor} apple`;
  if (/\borange/i.test(prefix)) return `${descriptor} orange`;
  if (/\bpear/i.test(prefix)) return `${descriptor} pear`;
  if (/\bgrapefruit/i.test(prefix)) return `${descriptor} grapefruit`;
  if (/\bgrape/i.test(prefix)) return `${descriptor} grapes`;
  if (/\bmango/i.test(prefix)) return `${descriptor} mango`;
  if (/\bmelon/i.test(prefix)) return `${descriptor} melon`;
  if (/\bmushroom/i.test(prefix)) return `${descriptor} mushrooms`;
  if (/\bpepper/i.test(prefix)) return `${descriptor} pepper`;
  if (/\bpotato|yam/i.test(prefix)) return `${descriptor} ${singular}`;
  if (/\bonion/i.test(prefix)) return `${descriptor} onion`;
  if (/\btomato/i.test(prefix)) return `${descriptor} tomato`;
  return `${descriptor} ${singular}`;
}

function preserveSourceQualifiers(sourceItem, title) {
  if (/\borganic\b/i.test(sourceItem) && !/\borganic\b/i.test(title)) {
    return `Organic ${title}`;
  }
  return title;
}

function inferredColor(title, fallback) {
  const colors = [
    "black", "blue", "brown", "gold", "golden", "green", "orange", "pink",
    "purple", "red", "white", "yellow",
  ].filter((color) => new RegExp(`\\b${color}\\b`, "i").test(title));
  return colors.length
    ? colors.map((value) => value[0].toUpperCase() + value.slice(1)).join(" and ")
    : fallback;
}

function saleFormFor(item, soldBy, family) {
  if (/\bcuts?\b/i.test(item)) return "Cut";
  if (/\bbunch\b/i.test(item)) return "Bunch";
  if (/\bhead\b/i.test(item) && ["Broccoli", "Brassicas", "Cabbages", "Cauliflower", "Lettuce"].includes(family)) return "Head";
  if (/\bstalk\b/i.test(item)) return "Stalk";
  if (/\bcluster|on the vine\b/i.test(item)) return "Cluster";
  return soldBy === "Each" ? "Single" : "Loose";
}

function inferredSoldBy(record, saleForm) {
  if (record.soldBy === "Weight" || record.soldBy === "Each") return record.soldBy;
  if (["Bunch", "Head", "Single", "Stalk"].includes(saleForm)) return "Each";
  return "Weight";
}

function candidateScore(record, rule, title) {
  let score = 0;
  const flags = record.flags ?? [];
  const numericCodes = (record.codes ?? []).filter((code) => /^\d+$/.test(String(code)));
  if (record.soldBy) score += 38;
  if (numericCodes.length === 1) score += 20;
  if (String(numericCodes[0] ?? "").length === 4) score += 12;
  if (!flags.length) score += 15;
  if (!packageOrInventory.test(record.item)) score += 18;
  if (!/\borganic\b/i.test(record.item)) score += 8;
  if ((record.sourcePages ?? []).length > 1) score += 6;
  score += commonFamilyBonus.get(rule.family) ?? 8;
  if (title.split(/\s+/).length <= 5) score += 5;
  if (packageOrInventory.test(record.item)) score -= 40;
  if (/\borganic\b/i.test(record.item)) score -= 14;
  if (flags.length) score -= flags.length * 8;
  if (uncertain.test(`${record.item} ${flags.join(" ")}`)) score -= 40;
  return score;
}

const catalog = await loadJsonRecords(new URL("../data/catalog/", import.meta.url));
const catalogLabelsByCode = new Map();
const catalogCodesByLabel = new Map();
for (const record of catalog) {
  const label = normalize(record.item);
  const labelCodes = catalogCodesByLabel.get(label) ?? new Set();
  for (const rawCode of record.codes ?? []) {
    const code = String(rawCode);
    if (!/^\d+$/.test(code)) continue;
    labelCodes.add(code);
    const labels = catalogLabelsByCode.get(code) ?? new Set();
    labels.add(label);
    catalogLabelsByCode.set(code, labels);
  }
  catalogCodesByLabel.set(label, labelCodes);
}
const ambiguousCatalogCodes = new Set(
  [...catalogLabelsByCode].filter(([, labels]) => labels.size > 1).map(([code]) => code),
);
const ambiguousCatalogLabels = new Set(
  [...catalogCodesByLabel].filter(([, codes]) => codes.size > 1).map(([label]) => label),
);
const publishedStories = [
  ...(await loadJsonRecords(new URL("../data/stories/", import.meta.url))),
  ...(await loadJsonRecords(new URL("../data/story-batches/", import.meta.url))),
  ...(await loadJsonRecords(
    new URL("../data/story-seeds/", import.meta.url),
    (name) => name !== "batch-05-generated.json",
  )),
];
const publishedIds = new Set(publishedStories.map((story) => story.catalogId));
const publishedMappings = new Set(
  publishedStories.map((story) => `${story.catalogId}:${story.checkout?.code}`),
);
const publishedCodes = new Set(
  publishedStories.map((story) => String(story.checkout?.code ?? "")).filter(Boolean),
);
const publishedTitles = new Set(publishedStories.map((story) => normalize(story.title)));

const candidates = [];
for (const record of catalog) {
  if (publishedIds.has(record.id)) continue;
  if (excludedCatalogIds.has(record.id)) continue;
  if (nonProduce.test(record.item)) continue;
  if (packageOrInventory.test(record.item)) continue;
  if (uncertain.test(`${record.item} ${(record.flags ?? []).join(" ")}`)) continue;
  if (ambiguousCatalogLabels.has(normalize(record.item))) continue;
  const rule = familyRuleFor(record.item);
  if (!rule) continue;

  const numericCodes = (record.codes ?? []).map(String).filter((code) => /^\d+$/.test(code));
  if (numericCodes.length !== 1) continue;
  const code = numericCodes[0];
  if (publishedCodes.has(code) || ambiguousCatalogCodes.has(code)) continue;
  const sourceNumbers = record.item.match(/\b\d{3,6}\b/g) ?? [];
  if (sourceNumbers.some((sourceNumber) => sourceNumber !== code)) continue;
  if (publishedMappings.has(`${record.id}:${code}`)) continue;

  const title = preserveSourceQualifiers(record.item, titleFor(record, rule))
    .replace(/\s+/g, " ")
    .trim();
  if (!title || title.length < 3) continue;
  if (publishedTitles.has(normalize(title))) continue;
  const saleForm = saleFormFor(record.item, record.soldBy, rule.family);
  const soldBy = inferredSoldBy(record, saleForm);
  const color = inferredColor(title, rule.color);
  const flags = [
    ...(record.flags ?? []),
    ...(!record.soldBy ? ["sold-by-curated"] : []),
    ...(packageOrInventory.test(record.item) ? ["retail-form-specific"] : []),
  ];

  candidates.push({
    catalogId: record.id,
    title,
    code,
    family: rule.family,
    soldBy,
    saleForm,
    form: rule.form,
    color,
    imageQuery: `${title} raw produce`,
    cue: `${title} is identified by its ${color.toLowerCase()} appearance and ${rule.form.toLowerCase()}.`,
    group: slugify(rule.family),
    sourcePages: record.sourcePages,
    ...(flags.length ? { flags: [...new Set(flags)] } : {}),
    candidateScore: candidateScore(record, rule, title),
    sourceItem: record.item,
  });
}

candidates.sort((left, right) =>
  right.candidateScore - left.candidateScore ||
  left.family.localeCompare(right.family) ||
  left.title.localeCompare(right.title),
);

const selected = [];
const familyCounts = new Map();
const titleKeys = new Set();
for (const candidate of candidates) {
  const titleKey = normalize(candidate.title);
  if (titleKeys.has(titleKey)) continue;
  const count = familyCounts.get(candidate.family) ?? 0;
  if (count >= 24) continue;
  selected.push(candidate);
  titleKeys.add(titleKey);
  familyCounts.set(candidate.family, count + 1);
  if (selected.length === TARGET_POOL_SIZE) break;
}

if (selected.length < 120) {
  throw new Error(`Only ${selected.length} usable Batch 05 candidates remain after filtering.`);
}

await writeFile(OUTPUT_URL, `${JSON.stringify(selected, null, 2)}\n`, "utf8");
console.log(
  `Prepared ${selected.length} ranked Batch 05 candidates from ${catalog.length} catalog rows across ${familyCounts.size} families.`,
);
