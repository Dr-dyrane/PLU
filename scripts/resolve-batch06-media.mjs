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

const EXPECTED_CANDIDATES = 21;
const EXPECTED_REMAINDER = 175;
const CANDIDATES_URL = new URL("../data/batch-06-candidates.json", import.meta.url);
const DISPOSITIONS_URL = new URL("../data/batch-06-dispositions.json", import.meta.url);
const SOURCE_URL = new URL("../data/batch-06-source.json", import.meta.url);
const BATCH_URL = new URL("../data/batches/batch-06.json", import.meta.url);
const SEED_URL = new URL("../data/story-seeds/batch-06-generated.json", import.meta.url);
const PUBLIC_URL = new URL("../public/", import.meta.url);
const REPORT_URL = new URL("media-resolution-batch06.json", PUBLIC_URL);
const REVIEWED_READY_IDS = new Set(["aloe", "tomato-hh-red-bulk"]);

const candidates = await readJson(CANDIDATES_URL);
const dispositions = await readJson(DISPOSITIONS_URL);
if (!Array.isArray(candidates) || candidates.length !== EXPECTED_CANDIDATES) {
  throw new Error(`Batch 06 requires exactly ${EXPECTED_CANDIDATES} strict candidates.`);
}
if (!Array.isArray(dispositions) || dispositions.length !== EXPECTED_REMAINDER) {
  throw new Error(`Batch 06 requires dispositions for all ${EXPECTED_REMAINDER} remaining rows.`);
}

const catalog = await loadJsonRecords(new URL("../data/catalog/", import.meta.url));
const catalogById = new Map(catalog.map((record) => [record.id, record]));
const existingStories = [
  ...(await loadJsonRecords(new URL("../data/stories/", import.meta.url))),
  ...(await loadJsonRecords(new URL("../data/story-batches/", import.meta.url))),
  ...(await loadJsonRecords(
    new URL("../data/story-seeds/", import.meta.url),
    (name) => name !== "batch-06-generated.json",
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
    throw new Error(`Batch 06 candidate is incomplete: ${JSON.stringify(item)}`);
  }
  if (candidateIds.has(item.catalogId)) {
    throw new Error(`Duplicate Batch 06 candidate catalog ID: ${item.catalogId}`);
  }
  candidateIds.add(item.catalogId);
  if (existingCatalogIds.has(item.catalogId)) {
    throw new Error(`Batch 06 repeats a published catalog ID: ${item.catalogId}`);
  }

  const record = catalogById.get(item.catalogId);
  if (!record) throw new Error(`Batch 06 catalog record is missing: ${item.catalogId}`);
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

const dispositionIds = new Set(dispositions.map((item) => item.catalogId));
if (dispositionIds.size !== EXPECTED_REMAINDER) {
  throw new Error("Batch 06 dispositions contain duplicate catalog IDs.");
}
for (const catalogId of candidateIds) {
  const disposition = dispositions.find((item) => item.catalogId === catalogId);
  if (disposition?.decision !== "candidate") {
    throw new Error(`${catalogId}: candidate is not admitted by the disposition ledger.`);
  }
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
const readyItems = [];
const seeds = [];
const acceptedMappings = new Set();
const report = {
  generatedAt: new Date().toISOString(),
  batch: "06",
  strategy:
    "Resolve every remaining strict loose-produce candidate and retain all other catalog rows as evidence-gated source review records.",
  candidateCount: candidates.length,
  sourceCount: 0,
  media: [],
  rejected: [],
  queued: [],
};

for (const [candidateIndex, item] of candidates.entries()) {
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

  if (!REVIEWED_READY_IDS.has(item.catalogId)) {
    report.rejected.push({
      candidateOrder: candidateIndex + 1,
      catalogId: item.catalogId,
      title: item.title,
      reason: "reviewed-source-evidence-required",
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
    console.warn(`Unresolved Batch 06 candidate ${candidateIndex + 1}: ${item.title}.`);
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

  const peerTarget = { ...peerSummary(item), category: categoryForFamily(item.family) };
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
      "batch-06",
      `catalog-remainder-${selection.band.toLowerCase()}`,
      `media-${media.match}`,
      ...(media.sharedAcrossProducts ? ["media-shared-reviewed"] : []),
    ]),
  ];
  const photos = ["hero", "alternate", "context"].map((role, photoIndex) =>
    photoRole(storyId, item, media, role, photoIndex),
  );

  seeds.push({
    schemaVersion: "0.9.0",
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

  const order = readyItems.length + 1;
  readyItems.push({
    order,
    catalogId: item.catalogId,
    title: item.title,
    code: item.code,
    family: item.family,
    status: "ready",
  });
  acceptedSource.push({ ...item });
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

  console.log(`Accepted Batch 06 lesson ${order}/${EXPECTED_CANDIDATES}: ${item.title}.`);
  await sleep(120);
}

const acceptedCatalogIds = new Set(readyItems.map((item) => item.catalogId));
const expectedReadyIds = [...REVIEWED_READY_IDS].sort();
const resolvedReadyIds = [...acceptedCatalogIds].sort();
if (JSON.stringify(resolvedReadyIds) !== JSON.stringify(expectedReadyIds)) {
  throw new Error(
    `Batch 06 must resolve the exact reviewed ready set (${expectedReadyIds.join(", ")}); resolved ${resolvedReadyIds.join(", ") || "none"}.`,
  );
}
const mediaQueued = candidates
  .filter((item) => !acceptedCatalogIds.has(item.catalogId))
  .map((item) => {
    const rejected = [...report.rejected]
      .reverse()
      .find((record) => record.catalogId === item.catalogId);
    return {
      catalogId: item.catalogId,
      title: item.title,
      code: item.code,
      family: item.family,
      status: "queued",
      queueReason: "Exact recognition photograph needs source review.",
      queueReasonCodes: ["media-evidence-required"],
      mediaReason: rejected?.reason ?? "media-not-accepted",
    };
  });
const sourceQueued = dispositions
  .filter((item) => item.decision === "queued")
  .map((item) => ({
    catalogId: item.catalogId,
    title: item.title,
    code: item.code,
    family: item.family,
    status: "queued",
    queueReason: item.reason,
    queueReasonCodes: item.reasonCodes,
  }));
const queuedItems = [...mediaQueued, ...sourceQueued].map((item, index) => ({
  ...item,
  order: readyItems.length + index + 1,
}));
const items = [...readyItems, ...queuedItems];
if (items.length !== EXPECTED_REMAINDER) {
  throw new Error(`Batch 06 manifest contains ${items.length}/${EXPECTED_REMAINDER} rows.`);
}

const batch = {
  schemaVersion: "0.9.0",
  id: "batch-06-catalog-remainder-175",
  title: "Catalog remainder 175",
  size: items.length,
  strategy: "Strict ready lessons plus an explicit evidence-gated disposition for every remaining source row",
  items,
};

await mkdir(PUBLIC_URL, { recursive: true });
report.sourceCount = acceptedSource.length;
report.queued = queuedItems.map(({ order, ...item }) => ({ order, ...item }));
await writeFile(REPORT_URL, `${JSON.stringify(report, null, 2)}\n`, "utf8");

await writeFile(SOURCE_URL, `${JSON.stringify(acceptedSource, null, 2)}\n`, "utf8");
await writeFile(BATCH_URL, `${JSON.stringify(batch, null, 2)}\n`, "utf8");
await writeFile(SEED_URL, `${JSON.stringify(seeds, null, 2)}\n`, "utf8");

console.log(
  `Generated Batch 06 with ${readyItems.length} ready lessons and ${queuedItems.length} evidence-gated rows.`,
);
