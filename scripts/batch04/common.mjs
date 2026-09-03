import { readFile, readdir } from "node:fs/promises";

export const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
export const REQUEST_TIMEOUT_MS = 25_000;
export const SEARCH_LIMIT = 50;
export const REQUEST_DELAY_MS = 140;
export const EXPECTED_SIZE = 100;

export const allowedMime = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Words that make an image unsuitable for recognition-first checkout training.
 * This prevents plated meals, catalogue pages, animals, historical scans,
 * illustrations, and unrelated objects from winning on loose filename overlap.
 */
export const hardBlockedTokens = new Set([
  "advertisement", "annual", "atlas", "badge", "barcode", "bird", "book",
  "bottle", "butterfly", "cake", "can", "casserole", "catalog", "catalogue",
  "chart", "child", "coin", "confit", "cooked", "cupcake", "diagram", "dish",
  "drawing", "dried", "emblem", "engraving", "fish", "flag", "guide",
  "herbarium", "hornet", "icon", "illustration", "juice", "kitten", "label",
  "leaflet", "lithograph", "logo", "maid", "map", "medal", "meat", "moth",
  "page", "painting", "plate", "poached", "poster", "print", "rabbit",
  "recipe", "roasted", "salad", "sauce", "scallop", "screenshot", "seal",
  "seed", "seeds", "shawarma", "skewer", "snail", "soup", "stamp", "symbol",
  "tart", "toasted", "vintage", "vilmorin",
]);

export const softBlockedTokens = new Set([
  "bacterial", "blossom", "cut", "dry", "flower", "flowering", "garden",
  "habit", "orchard", "plant", "sprouting", "tree",
]);

/** Keep identity-bearing modifiers such as colours, sizes, and cultivars. */
export const genericQueryTokens = new Set([
  "and", "bulk", "bunch", "cultivar", "edible", "fresh", "fruit", "fruits",
  "loose", "market", "produce", "single", "the", "vegetable", "vegetables",
]);

export const fruitFamilies = new Set([
  "apples", "apricots", "avocados", "bananas", "berries", "cherries", "citrus",
  "dates", "figs", "grapes", "kiwi", "mangoes", "melons", "nectarines",
  "oranges", "papayas", "passion fruit", "peaches", "pears", "persimmons",
  "pineapples", "plums", "pomegranates", "stone fruit", "tropical fruit",
  "watermelons",
]);

export const peerColors = ["#4F8B58", "#C25D52", "#D1A23B", "#7C5AA8", "#547FA8"];

export const queryAliasesByCatalogId = {
  "bok-choy-shanghai": [
    "Shanghai pak choi", "bok choy vegetable", "pak choi vegetable",
    "Brassica rapa chinensis",
  ],
  "bok-choy-baby-hai-tupak-choy": ["baby pak choi", "baby bok choy"],
  "anise-fennel-herbs": ["Florence fennel bulb", "fennel vegetable bulb"],
  "beans-long-chinese-dow-gok-bodie": ["yardlong beans", "Chinese long bean pods"],
  bittermelon: ["bitter gourd", "Momordica charantia fruit"],
  "cabbages-chinese-nappa-suey-choy": ["napa cabbage", "Chinese cabbage head"],
  "eddoes-taro-root-small": ["eddoe taro corm", "taro corms", "Colocasia antiquorum corm"],
  "gai-lan-chinese-broccoli": ["gai lan", "Chinese broccoli vegetable", "Chinese kale"],
  "kale-black": ["lacinato kale", "Tuscan kale", "cavolo nero"],
  "lettuce-escarole": [
    "broad-leaved endive", "broad leaf endive vegetable",
    "Cichorium endivia latifolium", "escarole endive",
  ],
  "mushrooms-oyster-bulk-handwritten": ["oyster mushrooms", "Pleurotus ostreatus"],
  "rapini-saag": [
    "broccoli rabe", "broccoli raab", "cime di rapa", "Brassica rapa ruvo",
    "rapini vegetable",
  ],
  radicchio: ["red chicory head", "Cichorium intybus radicchio"],
  rutabaga: ["swede root vegetable", "Brassica napus napobrassica"],
  "peppers-scotch-bonnet-handwritten": ["Scotch bonnet chili", "Capsicum chinense Scotch bonnet"],
  "potatoes-yams-caribbean-sweet": ["boniato sweet potato", "batata sweet potato tuber"],
  "potatoes-yams-jamaican-sweet": ["Jamaican boniato", "Caribbean sweet potato tuber"],
  "potatoes-yams-white-long": ["white yam Dioscorea rotundata", "African white yam tuber"],
  "potatoes-yams-white-yam": ["white yam Dioscorea rotundata", "African yam tuber"],
  "potatoes-yams-yellow-yam": ["yellow yam Dioscorea cayenensis", "Guinea yellow yam"],
  "pears-asian-yellow": ["Asian pear", "nashi pear", "Pyrus pyrifolia fruit"],
  "pears-yali-ya": ["Yali pear", "Chinese white pear", "Pyrus bretschneideri Yali", "Asian pear"],
  "grapes-italy-green": ["Italia grape", "Italia table grapes", "Muscat Italia grapes", "Raisin Italia"],
  "melons-hami-handwritten": ["Hami melon", "Chinese Hami melon"],
  "melons-santa-claus-handwritten": ["Piel de Sapo melon", "Santa Claus melon"],
  "pummelo-white-chinese": ["white pomelo", "Chinese pomelo", "Citrus maxima fruit"],
  "tangelos-minneola-handwritten": ["Minneola tangelo", "Honeybell tangelo"],
  "peppers-green-finger-hot": ["green finger chilli", "green chili pepper", "green cayenne pepper"],
  "peas-green-english-bulk": ["English peas pods", "garden peas in pods", "Pisum sativum pods"],
  "leeks-baby": ["baby leeks raw", "young leeks vegetable"],
  "leeks-regular": ["fresh leeks vegetable", "leek bunch raw"],
  "lettuce-red-leaf": ["red leaf lettuce head"],
  "lettuce-green-leaf": ["green leaf lettuce head"],
  "tomatoes-on-the-vine-bulk-mesh": ["tomatoes on vine cluster", "vine tomatoes cluster"],
  "tomatoes-vine-ripe-big": ["vine ripe tomato", "beefsteak tomato raw"],
  "persimmons-hachiya-japanese-99038": ["Hachiya persimmon fresh fruit"],
  "mangos-yellow": ["yellow mango whole fruit"],
};

/** Exact source-title overrides reviewed against the intended product. */
export const mediaOverridesByCatalogId = {
  "nectarines-white-flesh": "Nectarine on white.jpg",
  "artichokes-large": "Artichoke stack.JPG",
  "gai-lan-chinese-broccoli": "Gai lan.jpg",
  "rapini-saag": "Rapini.jpg",
  "tomatoes-on-the-vine-bulk-mesh": "Cluster of Tomatoes on Vine.jpg",
  "potatoes-yellow-yukon-gold-bulk-handwritten": "CBG Fruit Veg Island - Solanum tuberosum 'Yukon Gold' Potato 150627 (20141704688).jpg",
  "persimmons-hachiya-japanese-99038": "Hachiya persimmons - Heart of the City Farmers' Market - San Francisco.jpg",
  "mangos-yellow": "Yellow Mango.jpg",
};

export const knownBadMediaFiles = new Set([
  "Nectarine stone.jpg",
  "Fenouil de Florence Vilmorin-Andrieux 1883.png",
  "Flowering Globe Artichoke - geograph.org.uk - 542107.jpg",
  "A child with a bunch of beets (I0004493).jpg",
  "Momordica charantia (Bitter melon) and a kitten.jpg",
  "Horitucultural guide - spring 1892 (1892) (14803494943).jpg",
  "Beckert's garden annual - 1949 (1949) (20172789349).jpg",
  "Hibiscus Poached Rhubarb - Garden radishes, Belgian endive, ruby beet essence and toasted hazelnut \"Génoise\" (19329867581).jpg",
  "Gai lan & crisped shallots (3169331473).jpg",
  "Saddle of Rabbit, Confit San Manzano Tomatoes, Baby Leeks, Pommes Dauphine.jpg",
  "A Ladies Maid Purchasing a Leek (BM 1867,0309.741).jpg",
  "Catalogue of seeds, plants, bulbs and fruits (1895) (20575454722).jpg",
  "Two peas in a pod cupcake.jpg",
  "DFC 0309 Close-up of skewers with bright red glazed meat chunks green bell pepper pieces and pineapple wedges threaded on wooden sticks.jpg",
  "Cichorium intybus habit1 (12112696354).jpg",
  "Manns' superior seeds (16204161377).jpg",
  "Starr-120608-7318-Brassica rapa-broccoli rabe flowers-Ulupalakua Ranch-Maui (24777612899).jpg",
  "Japanese-style potato salad with Yukon gold potatoes, hard-boiled eggs, Kewpie, apple cider vinegar smoked sausage, bacon, fried shallots, and chives. -thanksgiving (15867845156).jpg",
  "Dou-jou Hachiya gaki,traditional dry fruit in Gifu, 2017.jpg",
  "Asian Giant Hornet (20210216-ARS-LSC-0431).jpg",
  "The Apple and pear as vintage fruits (Page 111) BHL6364618.jpg",
  "4- (Cru) Live Scallop, Celery Root, Yali Pear.jpg",
  "HK WTSD Wong Tai Sin District 牛池灣 Ngau Chi Wan 彩虹站 MTR Choi Hung Station concourse shop 美心西餅 Maxim's Cakes Bakery August 2022 Px3 yellow mango fruit cakes tarts.jpg",
  "Bolgiano's \"glory\" tomato - out yields and out sells any tomato on the market by far the best tomato ever grown (1917) (20202596108).jpg",
]);

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^file:/, "")
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function words(value) {
  return normalize(value).split(/\s+/).filter((word) => word.length >= 3);
}

export function slugify(value) {
  return normalize(value).replaceAll(" ", "-");
}

export function categoryForFamily(family) {
  const normalized = normalize(family);
  if (normalized === "herbs") return "herb";
  if (fruitFamilies.has(normalized)) return "fruit";
  return "vegetable";
}

export function cleanFileTitle(title) {
  return title.replace(/^File:/, "");
}

export async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

export async function loadJsonRecords(directoryUrl, filter = () => true) {
  const names = (await readdir(directoryUrl).catch(() => []))
    .filter((name) => name.endsWith(".json") && filter(name))
    .sort();
  const records = [];
  for (const name of names) {
    const value = await readJson(new URL(name, directoryUrl));
    for (const record of Array.isArray(value) ? value : [value]) records.push(record);
  }
  return records;
}

export async function commonsRequest(parameters) {
  let lastError = null;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new Error(`Commons request timed out after ${REQUEST_TIMEOUT_MS} ms`)),
      REQUEST_TIMEOUT_MS,
    );
    try {
      const response = await fetch(COMMONS_API, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "PLU-media-resolver/3.0 (+https://plu-beta.vercel.app/)",
        },
        body: new URLSearchParams({
          action: "query", format: "json", formatversion: "2", ...parameters,
        }),
      });
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number.parseFloat(response.headers.get("retry-after") ?? "");
        const waitMs = Number.isFinite(retryAfter)
          ? Math.max(3_000, retryAfter * 1_000)
          : Math.min(18_000, 1_500 * 2 ** (attempt - 1));
        await response.body?.cancel().catch(() => {});
        clearTimeout(timeout);
        if (attempt < 6) {
          console.warn(`Commons returned ${response.status}; waiting ${Math.round(waitMs / 1000)}s.`);
          await sleep(waitMs);
          continue;
        }
      }
      if (!response.ok) {
        throw new Error(`Commons API returned HTTP ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      clearTimeout(timeout);
      return result;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 6) await sleep(Math.min(12_000, 1_000 * 2 ** (attempt - 1)));
    }
  }
  throw lastError ?? new Error("Commons request failed.");
}
