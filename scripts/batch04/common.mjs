import { readFile, readdir } from "node:fs/promises";

export const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
export const REQUEST_TIMEOUT_MS = 25_000;
export const SEARCH_LIMIT = 40;
export const REQUEST_DELAY_MS = 180;
export const EXPECTED_SIZE = 100;

export const allowedMime = new Set(["image/jpeg", "image/png", "image/webp"]);
export const hardBlockedTokens = new Set([
  "advertisement", "badge", "barcode", "bird", "book", "bottle", "butterfly",
  "can", "chart", "coin", "diagram", "drawing", "emblem", "fish", "flag",
  "herbarium", "icon", "illustration", "label", "leaflet", "logo", "map",
  "medal", "moth", "painting", "plate", "poster", "screenshot", "seal",
  "snail", "stamp", "symbol",
]);
export const softBlockedTokens = new Set([
  "cake", "cooked", "dish", "drink", "juice", "recipe", "salad", "soup",
]);
export const genericQueryTokens = new Set([
  "and", "baby", "black", "brown", "bunch", "cultivar", "dark", "edible",
  "fresh", "fruit", "green", "large", "leaves", "light", "loose", "orange",
  "pale", "pink", "produce", "purple", "red", "root", "small", "vegetable",
  "white", "yellow",
]);
export const fruitFamilies = new Set([
  "apples", "citrus", "grapes", "mangoes", "melons", "pears", "stone fruit",
  "tropical fruit", "watermelons",
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
  "eddoes-taro-root-small": ["eddoe taro corm", "taro corms"],
  "gai-lan-chinese-broccoli": ["gai lan", "Chinese broccoli vegetable"],
  "kale-black": ["lacinato kale", "Tuscan kale"],
  "lettuce-escarole": [
    "broad-leaved endive",
    "broad leaf endive vegetable",
    "Cichorium endivia latifolium",
    "escarole endive",
  ],
  "mushrooms-oyster-bulk-handwritten": ["oyster mushrooms", "Pleurotus ostreatus"],
};

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
          "User-Agent": "PLU-batch04-media-resolver/2.0 (+https://plu-beta.vercel.app/)",
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
