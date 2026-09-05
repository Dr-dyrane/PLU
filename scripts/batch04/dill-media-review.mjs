import assert from "node:assert/strict";

/** Keep the reviewed raw-cucumber correction and its attribution on regeneration. */
export function applyDillMediaReview(item, media, photos) {
  if (item.catalogId !== "cucumbers-dill") return;

  assert.equal(item.code, "4596", "Dill cucumber must retain its exact loose-produce catalog code.");
  assert.equal(media.file, "PicklingCucumbers.jpg", "Dill cucumber must use the reviewed raw photograph.");
  const author = "The original Uploader was Gruepig at English Wikipedia";
  const license = "Public domain";
  media.sourceReview = {
    catalogId: item.catalogId,
    code: item.code,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:PicklingCucumbers.jpg",
    author,
    license,
    reviewBasis: "Pixel review confirms short, whole, raw green cucumbers in a basket. This replaces the plated pickles in Tanunda Show 2008 dill cucumbers.jpg. The photograph supports the raw produce identity, not a case quantity or code; loose Weight code 4596 remains the exact workbook mapping.",
  };
  for (const photo of photos) {
    assert.equal(photo.file, media.file, "Dill cucumber photo roles must retain the reviewed raw source.");
    photo.author = author;
    photo.license = license;
  }
}
