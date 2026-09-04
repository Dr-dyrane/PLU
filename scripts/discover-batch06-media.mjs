import { writeFile } from "node:fs/promises";

import { loadJsonRecords, normalize, readJson, sleep } from "./batch04/common.mjs";
import { resolveImage } from "./batch04/media.mjs";

const KNOWLEDGE_URL = new URL("../data/batch-06-knowledge.json", import.meta.url);
const REVIEWED_MEDIA_URL = new URL("../data/batch-06-reviewed-media.json", import.meta.url);
const REPORT_URL = new URL("../public/media-discovery-batch06.json", import.meta.url);

const knowledge = await readJson(KNOWLEDGE_URL);
const reviewedMedia = await readJson(REVIEWED_MEDIA_URL);
if (!Array.isArray(knowledge?.items) || knowledge.items.length !== 175) {
  throw new Error("Batch 06 media discovery requires the complete 175-row knowledge overlay.");
}

const candidates = knowledge.items
  .filter((item) => item.scope?.status === "in-scope")
  .map((item) => {
    const title = item.identityEvidence?.title?.value;
    const family = item.identityEvidence?.family?.value;
    const form = item.identityEvidence?.form?.value;
    const color = item.identityEvidence?.color?.value;
    if (!title || !family || !form || !color) {
      throw new Error(`${item.catalogId}: in-scope media target has an incomplete identity.`);
    }
    return {
      catalogId: item.catalogId,
      title,
      family,
      form,
      color,
      imageQuery: item.mediaPlan?.query ?? `${title} raw produce`,
      cue: `${title} is recognized by its ${String(color).toLowerCase()} appearance and ${String(form).toLowerCase()}.`,
      group: normalize(family).replaceAll(" ", "-"),
      sourceItem: item.catalogEvidence.item,
      sourcePages: item.catalogEvidence.sourcePages,
      codePresence: item.codeEvidence.presence,
      codeResolution: item.codeEvidence.resolution,
      primaryCode: item.codeEvidence.primaryCode,
      retailStatus: item.retailEvidence.status,
    };
  });

if (candidates.length !== 163) {
  throw new Error(`Batch 06 media discovery expected 163 in-scope rows; found ${candidates.length}.`);
}
const reviewedMediaById = new Map(
  (reviewedMedia.items ?? []).map((review) => [review.catalogId, review]),
);

const existingStories = [
  ...(await loadJsonRecords(new URL("../data/stories/", import.meta.url))),
  ...(await loadJsonRecords(new URL("../data/story-batches/", import.meta.url))),
  ...(await loadJsonRecords(
    new URL("../data/story-seeds/", import.meta.url),
    (name) => name !== "batch-06-generated.json",
  )),
];
const usedFiles = new Set(
  existingStories.flatMap((story) =>
    (story.photos ?? []).map((photo) => photo.file).filter(Boolean),
  ),
);

const report = {
  schemaVersion: "0.1.0",
  batch: "06",
  strategy:
    "Run the established Batch 05 Commons resolver across all 163 in-scope Batch 06 identities, independent of code readiness; discovery never publishes a lesson.",
  catalogRemainderCount: knowledge.items.length,
  outOfScopeCount: knowledge.items.length - candidates.length,
  candidateCount: candidates.length,
  media: [],
  rejected: [],
};

for (const [candidateIndex, item] of candidates.entries()) {
  try {
    const reviewed = reviewedMediaById.get(item.catalogId) ?? null;
    const media = await resolveImage(item, usedFiles, reviewed?.commonsFile ?? null);
    report.media.push({
      candidateOrder: candidateIndex + 1,
      catalogId: item.catalogId,
      title: item.title,
      query: item.imageQuery,
      codePresence: item.codePresence,
      codeResolution: item.codeResolution,
      primaryCode: item.primaryCode,
      retailStatus: item.retailStatus,
      reviewedLedger: Boolean(reviewed),
      ...media,
    });
    console.log(`Found Batch 06 media ${candidateIndex + 1}/${candidates.length}: ${item.title}.`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    report.rejected.push({
      candidateOrder: candidateIndex + 1,
      catalogId: item.catalogId,
      title: item.title,
      query: item.imageQuery,
      codePresence: item.codePresence,
      codeResolution: item.codeResolution,
      primaryCode: item.primaryCode,
      retailStatus: item.retailStatus,
      reason,
    });
    console.warn(`No Batch 06 media ${candidateIndex + 1}/${candidates.length}: ${item.title}.`);
  }
  await sleep(120);
}

await writeFile(REPORT_URL, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(
  `Discovered ${report.media.length}/${report.candidateCount} media candidates; ${report.rejected.length} remain unresolved.`,
);
