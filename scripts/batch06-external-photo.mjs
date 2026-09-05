import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// One reviewed research figure, not an unrestricted external-image bypass.
export const vanigliaPhoto = Object.freeze({
  src: "https://www.frontiersin.org/files/Articles/1093074/xml-images/fpls-14-1093074-g001.webp",
  sourceUrl: "https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2023.1093074/full",
  sourceLabel: "Frontiers in Plant Science (2023), Figure 1C; reviewed panel viewport",
  author: "De Pascale, Troise, Petriccione, Nunziata, Cice, Magri, Salzano and Scaloni",
  license: "CC BY 4.0",
  mime: "image/webp",
  width: 1949,
  height: 1553,
  sha256: "d2d628626cee812c3bf379a95a459bed4e4acc5e91d1b17a795929e64989d15c",
  viewport: { x: 8, y: 760, width: 1068, height: 745, sourceWidth: 1949, sourceHeight: 1553 },
});

export function validateExternalPhoto(recovery) {
  const photo = recovery.externalPhoto;
  assert.ok(["persimmons-vanilla", "persimmons-vanilla-case"].includes(recovery.catalogId),
    "Only the two reviewed Vanilla persimmon rows may use this research figure.");
  assert.deepEqual(photo, vanigliaPhoto, `${recovery.catalogId}: external photo evidence drifted.`);
  for (const key of ["src", "sourceUrl", "author", "license"]) {
    assert.equal(recovery[key], photo[key], `${recovery.catalogId}: external ${key} drifted.`);
  }
  assert.equal(recovery.mediaReview.commonsFile, photo.src,
    `${recovery.catalogId}: legacy media key must identify the exact external source.`);
}

const verifiedSources = new Set();
export async function resolveExternalPhoto(recovery, usedFiles) {
  validateExternalPhoto(recovery);
  const photo = recovery.externalPhoto;
  if (!verifiedSources.has(photo.src)) {
    const response = await fetch(photo.src, { signal: AbortSignal.timeout(30000) });
    assert.ok(response.ok, `Research photograph unavailable: HTTP ${response.status}.`);
    assert.equal(response.headers.get("content-type")?.split(";")[0], photo.mime,
      "Research photograph MIME changed.");
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(createHash("sha256").update(bytes).digest("hex"), photo.sha256,
      "Research figure pixels changed; review the source and panel before publication.");
    verifiedSources.add(photo.src);
  }
  const sharedAcrossProducts = usedFiles.has(photo.src);
  usedFiles.add(photo.src);
  return {
    file: photo.src, src: photo.src, mime: photo.mime,
    width: photo.width, height: photo.height, thumbWidth: null, thumbHeight: null,
    score: 100, match: "reviewed-override", sharedAcrossProducts,
    matchedTargets: ["persimmon"], matchedModifiers: [], identityEvidence: ["Vaniglia"],
    sourceEvidence: {
      title: "Persimmon Vaniglia, Figure 1C",
      objectName: "Vaniglia persimmon fruits",
      description: "Reviewed panel C contains whole orange persimmon fruit and cut seeded brown-flesh views. Other cultivar panels are excluded by the pinned viewport. The photo does not establish a store code or case quantity.",
      categories: "Diospyros kaki; Vaniglia persimmon",
    },
    sourceSha256: photo.sha256, viewport: photo.viewport, alternatives: [],
  };
}
