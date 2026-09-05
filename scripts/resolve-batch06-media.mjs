import { mkdir, writeFile } from "node:fs/promises";

import {
  categoryForFamily,
  loadJsonRecords,
  normalize,
  productHeadGroups,
  readJson,
  sleep,
  words,
} from "./batch04/common.mjs";
import { resolveImage } from "./batch04/media.mjs";
import { loadRecovery } from "./batch06-recovery.mjs";
import { resolveExternalPhoto } from "./batch06-external-photo.mjs";
import {
  calculateSelection,
  chooseFamilyChoices,
  choosePeers,
  peerColors,
  peerSummary,
  photoRole,
  slugify,
} from "./batch04/story.mjs";

const EXPECTED_REMAINDER = 175;
const CANDIDATES_URL = new URL("../data/batch-06-candidates.json", import.meta.url);
const DISPOSITIONS_URL = new URL("../data/batch-06-dispositions.json", import.meta.url);
const SOURCE_URL = new URL("../data/batch-06-source.json", import.meta.url);
const BATCH_URL = new URL("../data/batches/batch-06.json", import.meta.url);
const SEED_URL = new URL("../data/story-seeds/batch-06-generated.json", import.meta.url);
const REVIEWED_MEDIA_URL = new URL("../data/batch-06-reviewed-media.json", import.meta.url);
const PUBLIC_URL = new URL("../public/", import.meta.url);
const REPORT_URL = new URL("media-resolution-batch06.json", PUBLIC_URL);

const candidates = await readJson(CANDIDATES_URL);
const dispositions = await readJson(DISPOSITIONS_URL);
const reviewedMedia = await readJson(REVIEWED_MEDIA_URL);
if (!Array.isArray(candidates) || !candidates.length) {
  throw new Error("Batch 06 requires at least one human-reviewed candidate.");
}
if (!Array.isArray(dispositions) || dispositions.length !== EXPECTED_REMAINDER) {
  throw new Error(`Batch 06 requires dispositions for all ${EXPECTED_REMAINDER} remaining rows.`);
}
if (
  reviewedMedia?.schemaVersion !== "1.0.0" ||
  reviewedMedia.batch !== "06" ||
  !Array.isArray(reviewedMedia.items)
) {
  throw new Error("Batch 06 reviewed media ledger is malformed.");
}

const catalog = await loadJsonRecords(new URL("../data/catalog/", import.meta.url));
const recoveryById = await loadRecovery(catalog);
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

function referencedCommonsFile(photo) {
  if (typeof photo?.file === "string" && photo.file.trim()) return photo.file;
  if (typeof photo?.source?.url !== "string") return null;
  try {
    const pathname = new URL(photo.source.url).pathname;
    const marker = "/wiki/File:";
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    return decodeURIComponent(pathname.slice(markerIndex + marker.length)).replaceAll("_", " ");
  } catch {
    return null;
  }
}

function includesNormalizedPhrase(value, phrase) {
  return ` ${normalize(value)} `.includes(` ${normalize(phrase)} `);
}

function visibleLabelMatchesCatalog(visibleLabel, catalogItem) {
  const visibleTokens = new Set(words(visibleLabel));
  const catalogTokens = new Set(words(catalogItem));
  if ([...visibleTokens].some((token) => catalogTokens.has(token))) return true;
  return productHeadGroups.some(
    (group) =>
      group.some((token) => visibleTokens.has(token)) &&
      group.some((token) => catalogTokens.has(token)),
  );
}

const usedFiles = new Set(
  existingStories.flatMap((story) =>
    (story.photos ?? []).map(referencedCommonsFile).filter(Boolean),
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

const reviewedMediaByCatalogId = new Map();
for (const review of reviewedMedia.items) {
  const requiredFields = ["catalogId", "code", "commonsFile", "recognitionMode", "reviewBasis"];
  if (!requiredFields.every((field) => typeof review?.[field] === "string" && review[field].trim())) {
    throw new Error(`Batch 06 reviewed media entry is incomplete: ${JSON.stringify(review)}`);
  }
  if (reviewedMediaByCatalogId.has(review.catalogId)) {
    throw new Error(`Duplicate Batch 06 reviewed media catalog ID: ${review.catalogId}`);
  }
  const candidate = candidates.find((item) => item.catalogId === review.catalogId);
  if (!candidate) {
    throw new Error(`${review.catalogId}: reviewed media entry is not a strict Batch 06 candidate.`);
  }
  if (String(candidate.code) !== String(review.code)) {
    throw new Error(`${review.catalogId}: reviewed media code does not match the candidate.`);
  }
  if (
    !["product-and-loose-form", "family-color-and-loose-form", "label-assisted"].includes(
      review.recognitionMode,
    )
  ) {
    throw new Error(`${review.catalogId}: unsupported recognition mode ${review.recognitionMode}.`);
  }
  if (review.recognitionMode === "label-assisted") {
    const visibleFields = ["label", "form", "color", "cue"];
    if (!visibleFields.every((field) => typeof review.visibleIdentity?.[field] === "string" && review.visibleIdentity[field].trim())) {
      throw new Error(`${review.catalogId}: label-assisted review needs a complete visible identity.`);
    }
    if (!Array.isArray(review.labelClaims) || !review.labelClaims.length) {
      throw new Error(`${review.catalogId}: label-assisted review needs workbook label claims.`);
    }
    const catalogRecord = catalogById.get(review.catalogId);
    if (!visibleLabelMatchesCatalog(review.visibleIdentity.label, catalogRecord.item)) {
      throw new Error(`${review.catalogId}: visible identity is not anchored to the catalog item.`);
    }
    const sourcePages = new Set(catalogRecord.sourcePages ?? []);
    const labelClaimValues = new Set();
    for (const labelClaim of review.labelClaims) {
      if (
        typeof labelClaim?.value !== "string" ||
        labelClaim.basis !== "workbook-label" ||
        labelClaim.sourceField !== "catalog.item" ||
        !Array.isArray(labelClaim.sourcePages) ||
        !labelClaim.sourcePages.length ||
        !labelClaim.sourcePages.every(Number.isInteger)
      ) {
        throw new Error(`${review.catalogId}: malformed workbook label claim.`);
      }
      const normalizedClaim = normalize(labelClaim.value);
      if (labelClaimValues.has(normalizedClaim)) {
        throw new Error(`${review.catalogId}: duplicate workbook label claim ${labelClaim.value}.`);
      }
      labelClaimValues.add(normalizedClaim);
      if (!includesNormalizedPhrase(catalogRecord.item, labelClaim.value)) {
        throw new Error(`${review.catalogId}: label claim is not present in the catalog item (${labelClaim.value}).`);
      }
      if (!labelClaim.sourcePages.every((page) => sourcePages.has(page))) {
        throw new Error(`${review.catalogId}: label claim pages are not catalog source pages.`);
      }
      if (
        Object.values(review.visibleIdentity).some((value) =>
          includesNormalizedPhrase(value, normalizedClaim),
        )
      ) {
        throw new Error(`${review.catalogId}: a workbook-only label claim leaked into the visible identity.`);
      }
    }
  }
  reviewedMediaByCatalogId.set(review.catalogId, review);
}
if (candidates.length !== reviewedMediaByCatalogId.size) {
  throw new Error(
    `Batch 06 candidate/review count differs (${candidates.length} candidates, ${reviewedMediaByCatalogId.size} reviews).`,
  );
}

const reviewsByFile = new Map();
for (const review of reviewedMedia.items) {
  const reviews = reviewsByFile.get(review.commonsFile) ?? [];
  reviews.push(review);
  reviewsByFile.set(review.commonsFile, reviews);
}
const sharedReviewedFiles = new Set();
for (const [commonsFile, reviews] of reviewsByFile) {
  if (reviews.length < 2 && !usedFiles.has(commonsFile)) continue;
  if (reviews.some((review) => typeof review.sharedMediaBasis !== "string" || !review.sharedMediaBasis.trim())) {
    throw new Error(`${commonsFile}: every reused reviewed file needs a shared-media basis.`);
  }
  sharedReviewedFiles.add(commonsFile);
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
    "Resolve the human-reviewed subset of the complete catalog remainder, using label-assisted truth when store qualifiers are not visible in product pixels.",
  candidateCount: candidates.length,
  sourceCount: 0,
  media: [],
  rejected: [],
  mapped: [],
  queued: [],
  excluded: [],
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

  const reviewedMapping = reviewedMediaByCatalogId.get(item.catalogId);
  if (!reviewedMapping) {
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
    const recovery = recoveryById.get(item.catalogId);
    media = recovery?.externalPhoto
      ? await resolveExternalPhoto(recovery, usedFiles)
      : await resolveImage(item, usedFiles, reviewedMapping.commonsFile, reviewedMapping);
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
  if (media.match !== "reviewed-override" || media.file !== reviewedMapping.commonsFile) {
    throw new Error(
      `${item.catalogId}: resolved media does not match its committed reviewed-media mapping.`,
    );
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

  const labelAssisted = reviewedMapping.recognitionMode === "label-assisted";
  const visibleIdentity = labelAssisted
    ? reviewedMapping.visibleIdentity
    : { label: item.title, form: item.form, color: item.color, cue: item.cue };
  const visualItem = {
    ...item,
    title: visibleIdentity.label,
    form: visibleIdentity.form,
    color: visibleIdentity.color,
    cue: visibleIdentity.cue,
  };
  const familyChoices = chooseFamilyChoices(item, allPeerPool);
  const formAnswer = slugify(visibleIdentity.form);
  const selection = calculateSelection(item, groupSizes.get(item.group) ?? 1);
  const flags = [
    ...new Set([
      ...(item.flags ?? []),
      "batch-06",
      `catalog-remainder-${selection.band.toLowerCase()}`,
      `media-${media.match}`,
      ...(sharedReviewedFiles.has(reviewedMapping.commonsFile) ? ["media-shared-reviewed"] : []),
      ...(labelAssisted ? ["media-label-assisted", "qualifier-workbook-label"] : []),
    ]),
  ];
  const recovery = recoveryById.get(item.catalogId);
  const photos = [];
  for (const [photoIndex, role] of ["hero", "alternate", "context"].entries()) {
    const roleReview = recovery?.reviewedPhotos?.find((photo) => photo.role === role);
    const distinct = roleReview && roleReview.commonsFile !== media.file;
    const roleMedia = distinct
      ? await resolveImage(item, new Set(usedFiles), roleReview.commonsFile, reviewedMapping)
      : media;
    const photo = photoRole(storyId, visualItem, roleMedia, role, photoIndex);
    if (distinct) {
      delete photo.reuseOf;
      delete photo.fallbackReason;
      photo.focus = "50% 50%";
      if (role === "alternate") photo.alt = `Alternate photograph of ${visibleIdentity.label} highlighting its ${visibleIdentity.form.toLowerCase()}`;
    }
    if (recovery?.decision === "approved") {
      photo.author = roleReview?.author ?? recovery.author;
      photo.license = roleReview?.license ?? recovery.license;
      if (recovery.externalPhoto) {
        photo.sourceUrl = recovery.sourceUrl;
        photo.sourceLabel = recovery.externalPhoto.sourceLabel;
        photo.viewport = recovery.externalPhoto.viewport;
        photo.alt = `${photo.alt}. Only the reviewed cultivar panel is shown.`;
        if (photoIndex > 0) photo.fallbackReason = "The same reviewed research panel is reused across roles; this is not a second photograph.";
      }
    }
    photos.push(photo);
  }
  const labelClaimNames = labelAssisted
    ? reviewedMapping.labelClaims.map((claim) => claim.value).join(" and ")
    : "";
  const labelClaimCopula = reviewedMapping.labelClaims?.length === 1 ? "is" : "are";

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
      form: visibleIdentity.form,
      color: visibleIdentity.color,
      variant: item.title,
    },
    checkout: {
      code: item.code,
      soldBy: item.soldBy,
      saleForm: item.saleForm,
      codeScope: labelAssisted
        ? "catalog-listed-retail-unit"
        : item.saleForm === "Cut"
          ? "primary-cut-produce"
          : item.soldBy === "Weight"
            ? "primary-loose-produce"
            : "primary-each-produce",
    },
    photos,
    visualCues: labelAssisted
      ? [
          visibleIdentity.cue,
          `The visible color is ${visibleIdentity.color.toLowerCase()}; ${labelClaimNames} ${labelClaimCopula} from the workbook label, not appearance.`,
          `Match the store label to ${item.title} before using ${item.code}.`,
        ]
      : [
          item.cue,
          `Look for the ${item.color.toLowerCase()} color together with the ${item.form.toLowerCase()}.`,
          `Keep it separate from nearby ${item.group.replaceAll("-", " ")} by checking shape, color, and sale form.`,
        ],
    classification: {
      familyAnswer: slugify(item.family),
      familyChoices,
      formAnswer,
      formChoices: [
        { id: formAnswer, label: `${visibleIdentity.color} · ${visibleIdentity.form}` },
        { id: `confusion-${slugify(peers[0].catalogId)}`, label: peers[0].title },
        { id: `confusion-${slugify(peers[1].catalogId)}`, label: peers[1].title },
      ],
    },
    variants: [],
    relations: labelAssisted
      ? [
          {
            kind: "exception",
            title: "The store label selects this listing",
            copy: `The photograph teaches ${visibleIdentity.label}. ${labelClaimNames} ${labelClaimCopula} copied from the workbook label and ${labelClaimCopula} not inferred from appearance.`,
          },
          {
            kind: "exception",
            title: "The code follows the exact listing",
            copy: `Use ${item.code} only after the label matches ${item.title}.`,
          },
        ]
      : undefined,
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
  acceptedSource.push({ ...item, mediaReview: reviewedMapping });
  acceptedMappings.add(mapping);
  report.media.push({
    order,
    candidateOrder: candidateIndex + 1,
    storyId,
    catalogId: item.catalogId,
    title: item.title,
    query: item.imageQuery,
    selection,
    mediaReview: reviewedMapping,
    ...media,
  });

  console.log(`Accepted Batch 06 lesson ${order}/${candidates.length}: ${item.title}.`);
  await sleep(120);
}

const acceptedCatalogIds = new Set(readyItems.map((item) => item.catalogId));
const expectedReadyIds = [...reviewedMediaByCatalogId.keys()].sort();
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
const mappedItems = dispositions
  .filter((item) => item.decision === "mapped")
  .map((item) => ({
    catalogId: item.catalogId,
    title: item.title,
    code: item.code,
    family: item.family,
    status: "mapped",
    mappingKind: item.mappingKind,
    mappingReason: item.reason,
  }));
const excludedItems = dispositions
  .filter((item) => item.decision === "excluded")
  .map((item) => ({
    catalogId: item.catalogId,
    title: item.title,
    code: item.code,
    family: item.family,
    status: "excluded",
    queueReason: item.reason,
    queueReasonCodes: item.reasonCodes,
  }));
const mappedWithOrder = mappedItems.map((item, index) => ({
  ...item,
  order: readyItems.length + index + 1,
}));
const queuedItems = [...mediaQueued, ...sourceQueued].map((item, index) => ({
  ...item,
  order: readyItems.length + mappedWithOrder.length + index + 1,
}));
const excludedWithOrder = excludedItems.map((item, index) => ({
  ...item,
  order: readyItems.length + mappedWithOrder.length + queuedItems.length + index + 1,
}));
const items = [...readyItems, ...mappedWithOrder, ...queuedItems, ...excludedWithOrder];
if (items.length !== EXPECTED_REMAINDER) {
  throw new Error(`Batch 06 manifest contains ${items.length}/${EXPECTED_REMAINDER} rows.`);
}

const batch = {
  schemaVersion: "0.9.0",
  id: "batch-06-catalog-remainder-175",
  title: "Catalog remainder 175",
  size: items.length,
  strategy: "Human-reviewed lessons, exact catalog mappings, evidence-gated source review, and explicit out-of-scope rows",
  items,
};

await mkdir(PUBLIC_URL, { recursive: true });
report.sourceCount = acceptedSource.length;
report.mapped = mappedWithOrder;
report.queued = queuedItems.map(({ order, ...item }) => ({ order, ...item }));
report.excluded = excludedWithOrder;
await writeFile(REPORT_URL, `${JSON.stringify(report, null, 2)}\n`, "utf8");

await writeFile(SOURCE_URL, `${JSON.stringify(acceptedSource, null, 2)}\n`, "utf8");
await writeFile(BATCH_URL, `${JSON.stringify(batch, null, 2)}\n`, "utf8");
await writeFile(SEED_URL, `${JSON.stringify(seeds, null, 2)}\n`, "utf8");

console.log(
  `Generated Batch 06 with ${readyItems.length} ready lessons, ${mappedWithOrder.length} mapped references, ${queuedItems.length} evidence-gated rows, and ${excludedWithOrder.length} catalog-only rows.`,
);
