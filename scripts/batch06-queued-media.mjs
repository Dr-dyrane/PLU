import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const reviewedFiles = {
  "cherries-white-ranier-264497": "Rainier cherries.jpg",
  "jackfruit-cut-handwritten": "Jackfruit NS-1 01 Asit.jpg",
  "sweet-sop": "Sugar apples from Sint Eustatius.jpg",
  "turnip-purple-top-white": "Liat Portal for Foodie Disorder - Turnip.jpg",
  "walnuts-bulk-nuts-handwritten": "Walnuts whole and open.jpg",
};
const provenance = "data/review-lanes/batch06-final-queued-media.json";

// These are photo candidates only. No identity/code/retail override is returned.
export async function loadQueuedMedia(catalog) {
  const document = JSON.parse(await readFile(new URL(`../${provenance}`, import.meta.url), "utf8"));
  const approved = document.items.filter((item) => item.decision === "reviewed-recognition-candidate");
  assert.deepEqual(approved.map((item) => item.catalogId).sort(), Object.keys(reviewedFiles).sort());
  const byId = new Map(catalog.map((item) => [item.id, item]));
  return new Map(approved.map((item) => {
    const record = byId.get(item.catalogId), photo = item.photo;
    assert.equal(item.sourceItem, record?.item, `${item.catalogId}: reviewed source label drifted.`);
    assert.equal(item.codeText, record.codeText, `${item.catalogId}: media must preserve even unknown codes.`);
    assert.deepEqual(item.sourcePages, record.sourcePages);
    assert.equal(photo.commonsFile, reviewedFiles[item.catalogId]);
    assert.ok(photo.author && photo.license && photo.pixelReview && photo.claimBoundary);
    assert.match(photo.src, /^https:\/\/(?:upload|thumb)\.wikimedia\.org\//);
    assert.match(photo.sourceUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    assert.match(photo.license, /^CC BY(?:-SA)? (?:2\.0|3\.0|4\.0)$/);
    assert.ok(photo.width >= 360 && photo.height >= 300);
    return [item.catalogId, {
      provenance, file: photo.commonsFile, url: photo.src, match: "pixel-reviewed-candidate",
      reviewReason: photo.pixelReview, claimBoundary: photo.claimBoundary,
      author: photo.author, license: photo.license, sourceUrl: photo.sourceUrl,
    }];
  }));
}
