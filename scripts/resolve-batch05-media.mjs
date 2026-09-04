import { mkdir, writeFile } from "node:fs/promises";

import {
  categoryForFamily,
  loadJsonRecords,
  readJson,
  sleep,
} from "./batch04/common.mjs";
import { resolveImage } from "./batch04/media.mjs";
import {
  calculateSelection,
  chooseFamilyChoices,
  choosePeers,
  peerColors,
  peerSummary,
  photoRole,
  slugify,
} from "./batch04/story.mjs";

const EXPECTED_SIZE = 100;
const CANDIDATES_URL = new URL("../data/batch-05-candidates.json", import.meta.url);
const SOURCE_URL = new URL("../data/batch-05-source.json", import.meta.url);
const BATCH_URL = new URL("../data/batches/batch-05.json", import.meta.url);
const SEED_URL = new URL("../data/story-seeds/batch-05-generated.json", import.meta.url);
const PUBLIC_URL = new URL("../public/", import.meta.url);
const REPORT_URL = new URL("media-resolution-batch05.json", PUBLIC_URL);

const candidates = await readJson(CANDIDATES_URL);
if (!Array.isArray(candidates) || candidates.length < EXPECTED_SIZE) {
  throw new Error(
    `Batch 05 candidate pool must contain at least ${EXPECTED_SIZE} records; received ${candidates?.length ?? "invalid"}.`,
  );
}

const catalog = await loadJsonRecords(new URL("../data/catalog/", import.meta.url));
const catalogById = new Map(catalog.map((record) => [record.id, record]));
const existingStories = [
  ...(await loadJsonRecords(new URL("../data/stories/", import.meta.url))),
  ...(await loadJsonRecords(new URL("../data/story-batches/", import.meta.url))),
  ...(await loadJsonRecords(
    new URL("../data/story-seeds/", import.meta.url),
    (name) => name !== "batch-05-generated.json",
  )),
];
const existingCatalogIds = new Set(existingStories.map((story) => story.catalogId));
const existingStoryIds = new Set(existingStories.map((story) => story.id));
const usedFiles = new Set(
  existingStories.flatMap((story) =>
    (story.photos ?? []).map((photo) => photo.file).filter(Boolean),
  ),
);

const candidateIds = new Set();
const sourcePool = [];
for (const item of candidates) {
  if (!item.catalogId || !item.title || !item.code || !item.family || !item.imageQuery) {
    throw new Error(`Batch 05 candidate is incomplete: ${JSON.stringify(item)}`);
  }
  if (candidateIds.has(item.catalogId)) {
    throw new Error(`Duplicate Batch 05 candidate catalog ID: ${item.catalogId}`);
  }
  candidateIds.add(item.catalogId);
  if (existingCatalogIds.has(item.catalogId)) {
    throw new Error(`Batch 05 repeats a published catalog ID: ${item.catalogId}`);
  }

  const record = catalogById.get(item.catalogId);
  if (!record) throw new Error(`Batch 05 catalog record is missing: ${item.catalogId}`);
  if (!record.codes.includes(item.code)) {
    throw new Error(`${item.catalogId}: ${item.code} is not present in its source catalog row.`);
  }
  if (record.soldBy && record.soldBy !== item.soldBy) {
    throw new Error(`${item.catalogId}: sold-by mismatch (${record.soldBy} vs ${item.soldBy}).`);
  }
  if (!record.soldBy && !(item.flags ?? []).includes("sold-by-curated")) {
    throw new Error(`${item.catalogId}: inferred sold-by value requires sold-by-curated.`);
  }

  sourcePool.push({
    ...peerSummary(item),
    category: categoryForFamily(item.family),
  });
}

const basePool = existingStories.map(peerSummary).filter((record) => record.code);
const allPeerPool = [
  ...new Map([...sourcePool, ...basePool].map((record) => [record.catalogId, record])).values(),
];
const groupSizes = new Map();
for (const item of candidates) {
  groupSizes.set(item.group, (groupSizes.get(item.group) ?? 0) + 1);
}

const acceptedSource = [];
const batchItems = [];
const seeds = [];
const acceptedMappings = new Set();
const report = {
  generatedAt: new Date().toISOString(),
  batch: "05",
  strategy:
    "Select the first 100 ranked unused catalog rows that resolve to semantically safe, product-anchored Wikimedia Commons photography.",
  candidateCount: candidates.length,
  sourceCount: 0,
  media: [],
  rejected: [],
};

for (const [candidateIndex, item] of candidates.entries()) {
  if (batchItems.length === EXPECTED_SIZE) break;

  const mapping = `${item.catalogId}:${item.code}`;
  if (acceptedMappings.has(mapping)) {
    report.rejected.push({
      candidateOrder: candidateIndex + 1,
      catalogId: item.catalogId,
      title: item.title,
      reason: "duplicate-exact-mapping",
    });
    continue;
  }

  let media;
  try {
    media = await resolveImage(item, usedFiles);
  } catch (error) {
    report.rejected.push({
      candidateOrder: candidateIndex + 1,
      catalogId: item.catalogId,
      title: item.title,
      reason: error instanceof Error ? error.message : String(error),
    });
    console.warn(`Skipped Batch 05 candidate ${candidateIndex + 1}: ${item.title}.`);
    await sleep(120);
    continue;
  }

  const storyId = `${slugify(item.title)}-${item.code}`;
  if (existingStoryIds.has(storyId) || seeds.some((story) => story.id === storyId)) {
    report.rejected.push({
      candidateOrder: candidateIndex + 1,
      catalogId: item.catalogId,
      title: item.title,
      reason: `duplicate-story-id:${storyId}`,
    });
    continue;
  }

  const peerTarget = {
    ...peerSummary(item),
    category: categoryForFamily(item.family),
  };
  const peers = choosePeers(peerTarget, sourcePool, basePool);
  if (peers.length < 3) {
    report.rejected.push({
      candidateOrder: candidateIndex + 1,
      catalogId: item.catalogId,
      title: item.title,
      reason: "fewer-than-three-comparison-peers",
    });
    continue;
  }

  const familyChoices = chooseFamilyChoices(item, allPeerPool);
  const formAnswer = slugify(item.form);
  const selection = calculateSelection(item, groupSizes.get(item.group) ?? 1);
  const flags = [
    ...new Set([
      ...(item.flags ?? []),
      "batch-05",
      `must-know-${selection.band.toLowerCase()}`,
      `media-${media.match}`,
      ...(media.sharedAcrossProducts ? ["media-shared-reviewed"] : []),
    ]),
  ];
  const photos = ["hero", "alternate", "context"].map((role, photoIndex) =>
    photoRole(storyId, item, media, role, photoIndex),
  );

  seeds.push({
    schemaVersion: "0.8.0",
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
        item.saleForm === "Cut"
          ? "primary-cut-produce"
          : item.soldBy === "Weight"
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
  });

  const order = batchItems.length + 1;
  batchItems.push({
    order,
    catalogId: item.catalogId,
    title: item.title,
    code: item.code,
    family: item.family,
    status: "ready",
  });
  acceptedSource.push({
    catalogId: item.catalogId,
    title: item.title,
    code: item.code,
    family: item.family,
    soldBy: item.soldBy,
    saleForm: item.saleForm,
    form: item.form,
    color: item.color,
    imageQuery: item.imageQuery,
    cue: item.cue,
    group: item.group,
    sourcePages: item.sourcePages,
    ...(item.flags?.length ? { flags: item.flags } : {}),
    candidateScore: item.candidateScore,
    sourceItem: item.sourceItem,
  });
  acceptedMappings.add(mapping);
  report.media.push({
    order,
    candidateOrder: candidateIndex + 1,
    storyId,
    catalogId: item.catalogId,
    title: item.title,
    query: item.imageQuery,
    selection,
    ...media,
  });

  console.log(`Accepted Batch 05 lesson ${order}/${EXPECTED_SIZE}: ${item.title}.`);
  await sleep(120);
}

if (batchItems.length !== EXPECTED_SIZE) {
  throw new Error(
    `Batch 05 resolved only ${batchItems.length}/${EXPECTED_SIZE} safe lessons from ${candidates.length} candidates.`,
  );
}

report.sourceCount = acceptedSource.length;
const batch = {
  schemaVersion: "0.8.0",
  id: "batch-05-next-100",
  title: "Next 100",
  size: batchItems.length,
  strategy: "Ranked unused catalog rows with strict semantic image validation",
  items: batchItems,
};

await mkdir(PUBLIC_URL, { recursive: true });
await writeFile(SOURCE_URL, `${JSON.stringify(acceptedSource, null, 2)}\n`, "utf8");
await writeFile(BATCH_URL, `${JSON.stringify(batch, null, 2)}\n`, "utf8");
await writeFile(SEED_URL, `${JSON.stringify(seeds, null, 2)}\n`, "utf8");
await writeFile(REPORT_URL, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(
  `Generated ${batchItems.length} Batch 05 lessons after rejecting ${report.rejected.length} unsafe or unresolved candidates.`,
);
