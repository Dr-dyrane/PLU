import { mkdir, writeFile } from "node:fs/promises";

import {
  EXPECTED_SIZE,
  REQUEST_DELAY_MS,
  categoryForFamily,
  loadJsonRecords,
  readJson,
  sleep,
} from "./batch04/common.mjs";
import { resolveImage } from "./batch04/media.mjs";
import { applyDillMediaReview } from "./batch04/dill-media-review.mjs";
import {
  calculateSelection,
  chooseFamilyChoices,
  choosePeers,
  peerColors,
  peerSummary,
  photoRole,
  slugify,
} from "./batch04/story.mjs";

const SOURCE_URL = new URL("../data/batch-04-source.json", import.meta.url);
const BATCH_URL = new URL("../data/batches/batch-04.json", import.meta.url);
const SEED_URL = new URL("../data/story-seeds/batch-04-generated.json", import.meta.url);
const PUBLIC_URL = new URL("../public/", import.meta.url);
const REPORT_URL = new URL("media-resolution-batch04.json", PUBLIC_URL);

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
    (name) => ![
      "batch-04-generated.json",
      "batch-05-generated.json",
      "batch-06-generated.json",
    ].includes(name),
  )),
];
const existingCatalogIds = new Set(existingStories.map((story) => story.catalogId));
const sourceCatalogIds = new Set();
const sourceMappings = new Set();

for (const item of source) {
  if (!item.catalogId || !item.title || !item.code || !item.family || !item.imageQuery) {
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
  if (!catalogRecord) throw new Error(`Batch 04 catalog record is missing: ${item.catalogId}`);
  if (!catalogRecord.codes.includes(item.code)) {
    throw new Error(`${item.catalogId}: ${item.code} is not present in the source catalog record.`);
  }
  const exactMapping = `${item.catalogId}:${item.code}`;
  if (sourceMappings.has(exactMapping)) throw new Error(`Duplicate Batch 04 mapping: ${exactMapping}`);
  sourceMappings.add(exactMapping);

  if (catalogRecord.soldBy && catalogRecord.soldBy !== item.soldBy) {
    throw new Error(`${item.catalogId}: sold-by mismatch (${catalogRecord.soldBy} vs ${item.soldBy}).`);
  }
  if (!catalogRecord.soldBy && !(item.flags ?? []).includes("sold-by-curated")) {
    throw new Error(`${item.catalogId}: curated sold-by value requires the sold-by-curated flag.`);
  }
}

const sourcePool = source.map((item) => ({
  ...peerSummary(item),
  category: categoryForFamily(item.family),
}));
const basePool = existingStories.map(peerSummary).filter((record) => record.code);
const allPeerPool = [
  ...new Map([...sourcePool, ...basePool].map((record) => [record.catalogId, record])).values(),
];
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
    "Resolve a verified Wikimedia Commons photograph for every lesson. Prefer unique exact-item media; allow an audited shared source only when it remains the strongest product match.",
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
      ...(media.sharedAcrossProducts ? ["media-shared-reviewed"] : []),
    ]),
  ];
  const photos = ["hero", "alternate", "context"].map((role, photoIndex) =>
    photoRole(storyId, item, media, role, photoIndex),
  );
  applyDillMediaReview(item, media, photos);

  seeds.push({
    schemaVersion: "0.7.2",
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
        item.soldBy === "Weight" ? "primary-loose-produce" : "primary-each-produce",
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
  });

  batchItems.push({
    order: index + 1,
    catalogId: item.catalogId,
    title: item.title,
    code: item.code,
    family: item.family,
    status: "ready",
  });
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
  schemaVersion: "0.7.2",
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

const sharedCount = report.media.filter((item) => item.sharedAcrossProducts).length;
console.log(
  `Generated ${batchItems.length} Batch 04 lessons with ${report.media.length} verified Commons selections (${sharedCount} audited shared sources).`,
);
