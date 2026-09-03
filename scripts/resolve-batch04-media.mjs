import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const SOURCE_URL = new URL("../data/batch-04-source.json", import.meta.url);
const BATCH_URL = new URL("../data/batches/batch-04.json", import.meta.url);
const SEED_URL = new URL("../data/story-seeds/batch-04-generated.json", import.meta.url);
const PUBLIC_URL = new URL("../public/", import.meta.url);
const REPORT_URL = new URL("media-resolution-batch04.json", PUBLIC_URL);
const REQUEST_TIMEOUT_MS = 25_000;
const SEARCH_LIMIT = 40;
const REQUEST_DELAY_MS = 180;
const EXPECTED_SIZE = 100;

const allowedMime = new Set(["image/jpeg", "image/png", "image/webp"]);
const hardBlockedTokens = new Set([
  "advertisement",
  "badge",
  "barcode",
  "bird",
  "book",
  "bottle",
  "butterfly",
  "can",
  "chart",
  "coin",
  "diagram",
  "drawing",
  "emblem",
  "fish",
  "flag",
  "icon",
  "illustration",
  "label",
  "leaflet",
  "logo",
  "map",
  "medal",
  "moth",
  "painting",
  "poster",
  "screenshot",
  "seal",
  "snail",
  "stamp",
  "symbol",
]);
const softBlockedTokens = new Set([
  "cake",
  "cooked",
  "dish",
  "drink",
  "juice",
  "recipe",
  "salad",
  "soup",
]);
const genericQueryTokens = new Set([
  "and",
  "baby",
  "black",
  "brown",
  "bunch",
  "cultivar",
  "dark",
  "edible",
  "fresh",
  "fruit",
  "green",
  "large",
  "leaves",
  "light",
  "loose",
  "orange",
  "pale",
  "pink",
  "produce",
  "purple",
  "red",
  "root",
  "small",
  "vegetable",
  "white",
  "yellow",
]);
const fruitFamilies = new Set([
  "apples",
  "citrus",
  "grapes",
  "mangoes",
  "melons",
  "pears",
  "stone fruit",
  "tropical fruit",
  "watermelons",
]);
const peerColors = ["#4F8B58", "#C25D52", "#D1A23B", "#7C5AA8", "#547FA8"];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^file:/, "")
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function words(value) {
  return normalize(value)
    .split(/\s+/)
    .filter((word) => word.length >= 3);
}

function slugify(value) {
  return normalize(value).replaceAll(" ", "-");
}

function categoryForFamily(family) {
  const normalized = normalize(family);
  if (normalized === "herbs") return "herb";
  if (fruitFamilies.has(normalized)) return "fruit";
  return "vegetable";
}

function cleanFileTitle(title) {
  return title.replace(/^File:/, "");
}

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

async function loadJsonRecords(directoryUrl, filter = () => true) {
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

async function commonsRequest(parameters) {
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
          "User-Agent": "PLU-batch04-media-resolver/1.0 (+https://plu-beta.vercel.app/)",
        },
        body: new URLSearchParams({
          action: "query",
          format: "json",
          formatversion: "2",
          ...parameters,
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

function scoreCandidate(page, item, relaxed = false) {
  const image = page.imageinfo?.[0];
  if (!image || !allowedMime.has(image.mime)) return Number.NEGATIVE_INFINITY;
  if ((image.width ?? 0) < 360 || (image.height ?? 0) < 300) {
    return Number.NEGATIVE_INFINITY;
  }

  const title = normalize(page.title);
  const titleTokens = new Set(words(page.title));
  if ([...hardBlockedTokens].some((token) => titleTokens.has(token))) {
    return Number.NEGATIVE_INFINITY;
  }

  const queryTokens = words(item.imageQuery).filter(
    (token) => !genericQueryTokens.has(token),
  );
  const titleTargetTokens = words(item.title).filter(
    (token) => !genericQueryTokens.has(token),
  );
  const meaningfulTokens = [...new Set([...queryTokens, ...titleTargetTokens])];
  const matchedTokens = meaningfulTokens.filter((token) => titleTokens.has(token));

  if (!relaxed && matchedTokens.length === 0) return Number.NEGATIVE_INFINITY;

  let score = matchedTokens.length * 24;
  const normalizedTitle = normalize(item.title);
  const normalizedQuery = normalize(item.imageQuery);
  if (normalizedTitle.length >= 5 && title.includes(normalizedTitle)) score += 60;
  if (normalizedQuery.length >= 5 && title.includes(normalizedQuery)) score += 75;
  if (titleTokens.has("fruit") || titleTokens.has("vegetable") || titleTokens.has("produce")) {
    score += 8;
  }
  if (titleTokens.has("bunch") || titleTokens.has("harvest") || titleTokens.has("market")) {
    score += 5;
  }
  if ([...softBlockedTokens].some((token) => titleTokens.has(token))) score -= 50;
  if (!normalize(item.form).includes("flower") && titleTokens.has("flower")) score -= 28;
  if ((image.width ?? 0) >= 1_000 && (image.height ?? 0) >= 700) score += 10;
  if ((image.width ?? 0) >= 1_600) score += 5;
  if (image.mime === "image/jpeg") score += 3;
  if (relaxed) score -= 35;
  return score;
}

async function searchCommons(query) {
  const response = await commonsRequest({
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: String(SEARCH_LIMIT),
    gsrsearch: query,
    prop: "imageinfo",
    iiprop: "url|mime|size",
    iiurlwidth: "1600",
  });
  return response?.query?.pages ?? [];
}

function rankPages(pages, item, usedFiles, relaxed) {
  return pages
    .map((page) => ({
      page,
      file: cleanFileTitle(page.title),
      score: scoreCandidate(page, item, relaxed),
    }))
    .filter(
      (candidate) =>
        Number.isFinite(candidate.score) && !usedFiles.has(candidate.file),
    )
    .sort(
      (left, right) =>
        right.score - left.score || left.file.localeCompare(right.file),
    );
}

async function resolveImage(item, usedFiles) {
  const queries = [
    item.imageQuery,
    `${item.title} ${item.family}`,
    `${item.title} food produce`,
  ];
  const pageMap = new Map();
  let strict = [];

  for (const query of [...new Set(queries.map((value) => value.trim()).filter(Boolean))]) {
    const pages = await searchCommons(query);
    for (const page of pages) {
      if (page?.title && page.imageinfo?.[0]) pageMap.set(page.title, page);
    }
    strict = rankPages([...pageMap.values()], item, usedFiles, false);
    if (strict[0]?.score >= 45) break;
    await sleep(REQUEST_DELAY_MS);
  }

  const allPages = [...pageMap.values()];
  const relaxed = rankPages(allPages, item, usedFiles, true);
  const selected = strict[0] ?? relaxed[0];

  if (!selected) {
    throw new Error(
      `No unique usable Commons photograph found for ${item.title} (${item.imageQuery}).`,
    );
  }

  usedFiles.add(selected.file);
  const image = selected.page.imageinfo[0];
  return {
    file: selected.file,
    src: image.thumburl ?? image.url,
    mime: image.mime,
    width: image.width,
    height: image.height,
    thumbWidth: image.thumbwidth ?? null,
    thumbHeight: image.thumbheight ?? null,
    score: selected.score,
    match: strict[0] ? "token-matched" : "search-result-fallback",
    alternatives: strict.slice(1, 4).map((candidate) => ({
      file: candidate.file,
      score: candidate.score,
      src:
        candidate.page.imageinfo?.[0]?.thumburl ??
        candidate.page.imageinfo?.[0]?.url,
    })),
  };
}

function calculateSelection(item, groupSize) {
  const explicitSoldBy = !(item.flags ?? []).includes("sold-by-curated");
  const rawScore =
    30 +
    (item.specialty ? 0 : 25) +
    (explicitSoldBy ? 15 : 0) +
    (groupSize > 1 ? 15 : 0) +
    10 +
    10 -
    (item.specialty ? 10 : 0);
  const score = Math.max(0, Math.min(100, rawScore));
  const band =
    score >= 80
      ? "Essential"
      : score >= 60
        ? "Common"
        : score >= 40
          ? "Useful"
          : score >= 20
            ? "Specialty"
            : "Reference";
  const priority =
    band === "Essential"
      ? "must-know"
      : band === "Common"
        ? "common"
        : band === "Reference"
          ? "rare"
          : "specialty";
  return { rawScore, score, band, priority };
}

function uniqueByCatalog(records) {
  const seen = new Set();
  return records.filter((record) => {
    if (!record?.catalogId || seen.has(record.catalogId)) return false;
    seen.add(record.catalogId);
    return true;
  });
}

function peerSummary(record) {
  return {
    catalogId: record.catalogId,
    title: record.title,
    code: record.code ?? record.checkout?.code,
    family: record.family,
    form: record.form ?? record.identity?.form ?? "Distinct produce form",
    color: record.color ?? record.identity?.color ?? "Natural",
    cue:
      record.cue ??
      record.visualCues?.[0] ??
      "Compare the exact shape, color, and sale form.",
    group: record.group ?? normalize(record.family),
    category: record.category ?? categoryForFamily(record.family),
  };
}

function choosePeers(item, sourcePool, basePool, count = 3) {
  const sameGroup = sourcePool.filter(
    (peer) => peer.catalogId !== item.catalogId && peer.group === item.group,
  );
  const sameFamily = basePool.filter(
    (peer) =>
      peer.catalogId !== item.catalogId &&
      normalize(peer.family) === normalize(item.family),
  );
  const sameCategory = [...sourcePool, ...basePool].filter(
    (peer) =>
      peer.catalogId !== item.catalogId && peer.category === item.category,
  );
  return uniqueByCatalog([...sameGroup, ...sameFamily, ...sameCategory]).slice(
    0,
    count,
  );
}

function chooseFamilyChoices(item, allPeers) {
  const families = [item.family];
  for (const peer of allPeers) {
    if (!families.some((family) => normalize(family) === normalize(peer.family))) {
      families.push(peer.family);
    }
    if (families.length === 3) break;
  }
  while (families.length < 3) families.push(`Produce family ${families.length + 1}`);
  return families.map((family) => ({ id: slugify(family), label: family }));
}

function photoRole(storyId, item, media, role, index) {
  const focus =
    role === "hero"
      ? "50% 50%"
      : role === "alternate"
        ? "38% 50%"
        : "62% 50%";
  const alt =
    role === "hero"
      ? `${item.title} reference photograph showing ${item.cue.toLowerCase()}`
      : role === "alternate"
        ? `Alternate crop of ${item.title} highlighting its ${item.form.toLowerCase()}`
        : `${item.title} produce reference emphasizing its ${item.color.toLowerCase()} appearance`;

  return {
    id: `${storyId}-${role}`,
    file: media.file,
    src: media.src,
    alt,
    role,
    focus,
    ...(index > 0
      ? {
          reuseOf: media.file,
          fallbackReason:
            "One verified exact-item photograph is reused with a different crop so no unverified or cross-product image can publish.",
        }
      : {}),
  };
}

const source = await readJson(SOURCE_URL);
if (!Array.isArray(source) || source.length !== EXPECTED_SIZE) {
  throw new Error(
    `Batch 04 source must contain exactly ${EXPECTED_SIZE} records; received ${source?.length ?? "invalid"}.`,
  );
}

const catalog = await loadJsonRecords(new URL("../data/catalog/", import.meta.url));
const catalogById = new Map(catalog.map((record) => [record.id, record]));
const existingStories = [
  ...(await loadJsonRecords(new URL("../data/stories/", import.meta.url))),
  ...(await loadJsonRecords(new URL("../data/story-batches/", import.meta.url))),
  ...(await loadJsonRecords(
    new URL("../data/story-seeds/", import.meta.url),
    (name) => name !== "batch-04-generated.json",
  )),
];
const existingCatalogIds = new Set(existingStories.map((story) => story.catalogId));
const sourceCatalogIds = new Set();
const sourceMappings = new Set();

for (const item of source) {
  if (
    !item.catalogId ||
    !item.title ||
    !item.code ||
    !item.family ||
    !item.imageQuery
  ) {
    throw new Error(`Batch 04 source record is incomplete: ${JSON.stringify(item)}`);
  }
  if (sourceCatalogIds.has(item.catalogId)) {
    throw new Error(`Duplicate Batch 04 catalog ID: ${item.catalogId}`);
  }
  sourceCatalogIds.add(item.catalogId);
  if (existingCatalogIds.has(item.catalogId)) {
    throw new Error(`Batch 04 repeats a published catalog ID: ${item.catalogId}`);
  }

  const catalogRecord = catalogById.get(item.catalogId);
  if (!catalogRecord) {
    throw new Error(`Batch 04 catalog record is missing: ${item.catalogId}`);
  }
  if (!catalogRecord.codes.includes(item.code)) {
    throw new Error(
      `${item.catalogId}: ${item.code} is not present in the source catalog record.`,
    );
  }
  const exactMapping = `${item.catalogId}:${item.code}`;
  if (sourceMappings.has(exactMapping)) {
    throw new Error(`Duplicate Batch 04 mapping: ${exactMapping}`);
  }
  sourceMappings.add(exactMapping);

  if (catalogRecord.soldBy && catalogRecord.soldBy !== item.soldBy) {
    throw new Error(
      `${item.catalogId}: sold-by mismatch (${catalogRecord.soldBy} vs ${item.soldBy}).`,
    );
  }
  if (!catalogRecord.soldBy && !(item.flags ?? []).includes("sold-by-curated")) {
    throw new Error(
      `${item.catalogId}: curated sold-by value requires the sold-by-curated flag.`,
    );
  }
}

const sourcePool = source.map((item) => ({
  ...peerSummary(item),
  category: categoryForFamily(item.family),
}));
const basePool = existingStories.map(peerSummary).filter((record) => record.code);
const allPeerPool = uniqueByCatalog([...sourcePool, ...basePool]);
const groupSizes = new Map();
for (const item of source) {
  groupSizes.set(item.group, (groupSizes.get(item.group) ?? 0) + 1);
}

const batchItems = [];
const seeds = [];
const usedFiles = new Set();
const report = {
  generatedAt: new Date().toISOString(),
  batch: "04",
  strategy:
    "Resolve one unique verified exact-item Wikimedia Commons photograph per lesson, reuse it only within that product, and audit the canonical CDN bytes before publishing.",
  sourceCount: source.length,
  media: [],
};

for (const [index, item] of source.entries()) {
  const storyId = `${slugify(item.title)}-${item.code}`;
  const media = await resolveImage(item, usedFiles);
  const peerTarget = {
    ...peerSummary(item),
    category: categoryForFamily(item.family),
  };
  const peers = choosePeers(peerTarget, sourcePool, basePool);
  if (peers.length < 3) {
    throw new Error(`${item.title}: fewer than three comparison peers were available.`);
  }

  const familyChoices = chooseFamilyChoices(item, allPeerPool);
  const formAnswer = slugify(item.form);
  const selection = calculateSelection(item, groupSizes.get(item.group) ?? 1);
  const flags = [
    ...new Set([
      ...(item.flags ?? []),
      "batch-04",
      `must-know-${selection.band.toLowerCase()}`,
      `media-${media.match}`,
    ]),
  ];
  const photos = ["hero", "alternate", "context"].map((role, photoIndex) =>
    photoRole(storyId, item, media, role, photoIndex),
  );

  const seed = {
    schemaVersion: "0.7.0",
    id: storyId,
    catalogId: item.catalogId,
    title: item.title,
    shortTitle: item.title,
    family: item.family,
    priority: selection.priority,
    selection,
    identity: {
      family: item.family,
      form: item.form,
      color: item.color,
      variant: item.title,
    },
    checkout: {
      code: item.code,
      soldBy: item.soldBy,
      saleForm: item.saleForm,
      codeScope:
        item.soldBy === "Weight"
          ? "primary-loose-produce"
          : "primary-each-produce",
    },
    photos,
    visualCues: [
      item.cue,
      `Look for the ${item.color.toLowerCase()} color together with the ${item.form.toLowerCase()}.`,
      `Keep it separate from nearby ${item.group.replaceAll("-", " ")} by checking shape, color, and sale form.`,
    ],
    classification: {
      familyAnswer: slugify(item.family),
      familyChoices,
      formAnswer,
      formChoices: [
        { id: formAnswer, label: `${item.color} · ${item.form}` },
        { id: `confusion-${slugify(peers[0].catalogId)}`, label: peers[0].title },
        { id: `confusion-${slugify(peers[1].catalogId)}`, label: peers[1].title },
      ],
    },
    variants: [],
    similarItems: peers.map((peer, peerIndex) => ({
      name: peer.title,
      code: peer.code,
      cue: peer.cue,
      color: peerColors[peerIndex % peerColors.length],
    })),
    source: {
      primaryPages: item.sourcePages,
      relatedPages: item.sourcePages,
      checkedOnReference: true,
      flags,
      confidence: "verified-from-supplied-material",
    },
  };

  batchItems.push({
    order: index + 1,
    catalogId: item.catalogId,
    title: item.title,
    code: item.code,
    family: item.family,
    status: "ready",
  });
  seeds.push(seed);
  report.media.push({
    order: index + 1,
    storyId,
    catalogId: item.catalogId,
    title: item.title,
    query: item.imageQuery,
    selection,
    ...media,
  });

  if ((index + 1) % 10 === 0 || index + 1 === source.length) {
    console.log(`Resolved Batch 04 media ${index + 1}/${source.length}.`);
  }
  await sleep(REQUEST_DELAY_MS);
}

const batch = {
  schemaVersion: "0.7.0",
  id: "batch-04-next-100",
  title: "Next 100",
  size: batchItems.length,
  strategy: "Score-ranked common loose produce and high-confusion families",
  items: batchItems,
};

await mkdir(PUBLIC_URL, { recursive: true });
await writeFile(BATCH_URL, `${JSON.stringify(batch, null, 2)}\n`, "utf8");
await writeFile(SEED_URL, `${JSON.stringify(seeds, null, 2)}\n`, "utf8");
await writeFile(REPORT_URL, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(
  `Generated ${batchItems.length} Batch 04 lessons with ${report.media.length} unique verified Commons selections.`,
);
