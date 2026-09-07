import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { commonsRequest, loadJsonRecords } from "./batch04/common.mjs";

export const REFERENCE_IDS = Object.freeze([
  "aloe-vera-handwritten", "apples-large-extra-fancy-first-word-obscured", "apples-mcintosh-extra-fancy",
  "artichokes-small-handwritten", "avocado-5ct-bag-handwritten", "bananas-baby-bananas-mini-4186",
  "bananas-red", "bartlett-orchard-run-first-word-obscured", "cabbage-sour", "celery-hearts",
  "cherries-white-ranier-264497", "durian-frozen", "eddoes-handwritten", "fennel-anise", "gourds-ornamental",
  "jackfruit-cut-handwritten", "jicama-roots", "kohlrabi-note-on-sheet-kohlrabi-1692-handwritten",
  "mangoes-ataulfo-case-handwritten", "mangoes-red-case-handwritten", "mangos-spice", "melons-goldendew",
  "melons-honeykiss", "nappa-baby-4540-bag", "onions-1381-label-as-printed", "onions-medium-50lb-724-58312",
  "onions-sweet-4166-59914", "onions-yellow-25lb-334", "papayas-meridol", "parsnips-2lb", "parsnips-bulk-4672",
  "pears-red-4415", "pears-taylor-gold", "peppers-red-long-handwritten", "plumcots-handwritten",
  "potato-sweet-jamaican-handwritten", "pumpkins-jamaican", "pumpkins-small-pie-4737", "pumpkins-white",
  "radish-bunch", "rutabagas", "squash-buttercup", "sweet-sop", "tangerines-fall-glo",
  "tomato-heirloom-handwritten", "turnip-purple-top-white", "walnuts-bulk-nuts-handwritten", "watermelons-mickey-lee",
]);

const sourceBase = "https://github.com/Dr-dyrane/PLU/blob/main/";
const cues = {
  "aloe-vera-handwritten": "Thick green succulent leaves taper to pointed tips.",
  "apples-mcintosh-extra-fancy": "Rounded apples have red and green areas; Extra Fancy is a source grade, not a visible test.",
  "artichokes-small-handwritten": "Green overlapping scales form compact flower buds; size cannot be measured from this photo.",
  "avocado-5ct-bag-handwritten": "A whole avocado and a cut half show the skin, pale flesh, and large central stone; no five-count bag is shown.",
  "bananas-red": "Curved banana fingers have conspicuous red-orange skin.",
  "bartlett-orchard-run-first-word-obscured": "Bell-shaped pears provide a Bartlett reference; the obscured word and orchard-run grade cannot be recovered from the photo.",
  "cherries-white-ranier-264497": "Small stemmed cherries show yellow-to-cream skin with a red blush, not a uniformly white exterior.",
  "eddoes-handwritten": "Small brown corms have hairy, ringed surfaces.",
  "fennel-anise": "A pale layered bulb continues into green stalks and feathery fronds.",
  "gourds-ornamental": "Small ornamental gourds vary in shape, surface texture, and color.",
  "jackfruit-cut-handwritten": "Cut jackfruit exposes pale yellow flesh, a light central core, and large seeds inside a knobbly green rind.",
  "jicama-roots": "Whole jicama roots have firm, rounded tuber forms and brown outer skins.",
  "kohlrabi-note-on-sheet-kohlrabi-1692-handwritten": "A rounded green swollen stem has leaf stalks projecting from its surface.",
  "mangoes-ataulfo-case-handwritten": "The Ataulfo reference shows the mango's curved, elongated form; a case is not pictured.",
  "mangoes-red-case-handwritten": "A whole oval mango has red skin; the photo does not show a case or its quantity.",
  "nappa-baby-4540-bag": "Compact napa cabbage heads have layered leaves and pale ribs; the bag listing comes from the workbook.",
  "onions-1381-label-as-printed": "Whole raw onion bulbs show papery skins; printed label numbers cannot be inferred from their appearance.",
  "onions-sweet-4166-59914": "Whole sweet-onion examples have pale papery skins; sweetness is not established by looking at the photo.",
  "onions-yellow-25lb-334": "A whole yellow onion and a cut section show papery skin and concentric layers; no 25lb package is shown.",
  "parsnips-2lb": "Cream-colored roots taper to narrow tips; no two-pound package is shown.",
  "parsnips-bulk-4672": "Raw tapered parsnips are arranged on a retail shelf; the photo does not settle the label number.",
  "pears-red-4415": "Whole and cut red pears provide a color-and-form example, not proof of the workbook's cultivar or code.",
  "peppers-red-long-handwritten": "Slender red peppers taper to pointed ends.",
  "plumcots-handwritten": "Whole and sliced plumcot/pluot fruit show smooth skin and the cut interior; the handwritten store mapping remains unconfirmed.",
  "potato-sweet-jamaican-handwritten": "Whole sweet-potato roots have pale tan skin; Jamaican origin or a named cultivar is not visible.",
  "pumpkins-small-pie-4737": "A small orange pumpkin has rounded ribs and a stem; the embedded source number is not a visible product trait.",
  "pumpkins-white": "Whole pumpkins have pale white skins and rounded, ribbed forms.",
  "radish-bunch": "Red-and-white radish roots are grouped with their leafy tops.",
  "rutabagas": "Rounded rutabaga roots have pale lower skins and darker shoulders.",
  "squash-buttercup": "A whole buttercup squash has a squat green form; the photo cannot resolve its conflicting code.",
  "sweet-sop": "Sugar apples have segmented, scale-like surfaces; the photographed colors and origin do not define the store listing.",
  "tomato-heirloom-handwritten": "A basket contains tomatoes with varied colors and irregular, sometimes ribbed forms.",
  "turnip-purple-top-white": "Trimmed turnips have purple shoulders above white lower skins.",
  "walnuts-bulk-nuts-handwritten": "A ridged tan shell and an exposed wrinkled kernel show walnut structure; they do not settle whether the listing is shelled or in-shell.",
};

function readJson(path) { return readFile(new URL(`../${path}`, import.meta.url), "utf8").then(JSON.parse); }
export async function loadReferenceInputs() {
  const [catalog, knowledge, dispositions, relationships, codes, mapped, replacements] = await Promise.all([
    loadJsonRecords(new URL("../data/catalog/", import.meta.url)),
    readJson("data/batch-06-knowledge.json"), readJson("data/batch-06-dispositions.json"),
    readJson("data/relationship-lessons.json"), readJson("data/review-lanes/batch06-final-source-codes.json"),
    readJson("data/review-lanes/batch06-final-mapped-media.json"), readJson("data/reference-illustrations.json"),
  ]);
  const relationshipIds = new Set(relationships.items.map(item => item.catalogId));
  const targetIds = dispositions.filter(item => ["queued", "mapped"].includes(item.decision) && !relationshipIds.has(item.catalogId)).map(item => item.catalogId);
  assert.deepEqual(targetIds.sort(), [...REFERENCE_IDS].sort(), "Reference studies must cover the exact 48 unfinished IDs, not ready or relationship lessons.");
  assert.equal(replacements.schemaVersion, 1);
  assert.equal(new Set(replacements.items.map(item => item.catalogId)).size, replacements.items.length);
  for (const item of replacements.items) assert.ok(REFERENCE_IDS.includes(item.catalogId), `Unexpected replacement ${item.catalogId}`);
  return {
    catalog: new Map(catalog.map(item => [item.id, item])),
    knowledge: new Map(knowledge.items.map(item => [item.catalogId, item])),
    codes: new Map(codes.items.map(item => [item.catalogId, item])),
    mapped: new Map(mapped.items.map(item => [item.catalogId, item])),
    replacements: new Map(replacements.items.map(item => [item.catalogId, item])),
  };
}

export function referenceCodeStatus(record, knowledge) {
  if (!record.codes.length || record.codes.some(code => !/^\d+$/.test(code))) return "missing";
  const evidence = knowledge.codeEvidence;
  if (evidence.conflictingCatalogIds.length || evidence.competingLabelNumbers.length || evidence.resolution === "conflict-review-required") return "conflicted";
  if (record.flags.some(flag => ["handwritten", "obscured-label", "unverified-code"].includes(flag)) || evidence.resolution === "code-kind-required") return "uncertain";
  return "recorded";
}

function plain(value) {
  return String(value ?? "").replace(/<[^>]*>/g, "").replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&nbsp;", " ").replace(/\s+/g, " ").trim();
}

async function resolveReviewedPhotos(inputs) {
  const files = [...new Set(REFERENCE_IDS.filter(id => !inputs.replacements.has(id)).map(id => {
    const source = inputs.knowledge.get(id).mediaPlan.source;
    assert.ok(source?.file && ["pixel-reviewed-candidate", "reviewed-reuse-candidate"].includes(source.match), `${id}: reviewed photo or explicit illustration mapping required.`);
    return source.file;
  }))];
  const response = await commonsRequest({
    action: "query", format: "json", formatversion: "2", prop: "imageinfo", redirects: "1",
    iiprop: "url|mime|size|extmetadata", iiurlwidth: "1280", titles: files.map(file => `File:${file}`).join("|"),
  });
  const pages = new Map((response.query?.pages ?? []).map(page => [page.title.replaceAll("_", " "), page]));
  const aliases = new Map([...(response.query?.normalized ?? []), ...(response.query?.redirects ?? [])].map(item => [item.from, item.to]));
  return new Map(files.map(file => {
    let title = `File:${file}`;
    const seen = new Set();
    while (aliases.has(title) && !seen.has(title)) { seen.add(title); title = aliases.get(title); }
    const photo = pages.get(title.replaceAll("_", " "))?.imageinfo?.[0];
    assert.ok(photo?.mime?.startsWith("image/") && photo.width >= 360 && photo.height >= 300, `${file}: usable image metadata required.`);
    const metadata = photo.extmetadata;
    const author = plain(metadata?.Artist?.value), license = plain(metadata?.LicenseShortName?.value);
    assert.ok(author && /^(CC BY(?:-SA)? |CC0|Public domain)/.test(license), `${file}: named author and usable rights required, got ${license}.`);
    const licenseUrl = plain(metadata?.LicenseUrl?.value).replace(/^http:/, "https:").replace(/^\/\//, "https://");
    return [file, {
      src: photo.thumburl ?? photo.url, author, license,
      sourceUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replaceAll(" ", "_"))}`,
      ...(licenseUrl ? { licenseUrl } : {}),
    }];
  }));
}

export function referenceRevision(item) {
  const { revision: _revision, ...content } = item;
  return `ref-v1-${createHash("sha256").update(JSON.stringify(content)).digest("hex").slice(0, 16)}`;
}

export function makeReferenceLesson(id, inputs, photo) {
  const record = inputs.catalog.get(id), knowledge = inputs.knowledge.get(id);
  const source = knowledge.mediaPlan.source, replacement = inputs.replacements.get(id);
  const issue = inputs.codes.get(id)?.requiredEvidence ?? inputs.mapped.get(id)?.blocker;
  assert.ok(issue, `${id}: exact remaining source issue required.`);
  const visualCue = replacement?.visualCue ?? cues[id] ?? replacement?.media?.alt;
  assert.ok(visualCue, `${id}: bounded visual cue required.`);
  const labelClaims = source?.labelClaims?.map(claim => claim.value) ?? [];
  const boundary = source?.claimBoundary ?? (labelClaims.length
    ? `The source-only qualifiers ${labelClaims.join(", ")} are not established by the photo.`
    : "This is a produce example, not proof of this store's exact retail unit, origin, cultivar, or entered code.");
  const media = replacement?.media ?? {
    kind: "reviewed-photo", ...photo,
    alt: `Reference photograph: ${visualCue}`,
    claimBoundary: `${boundary} It does not verify this source row's checkout mapping.`,
  };
  let identityNote = replacement?.identityNote;
  if (!identityNote) {
    const uncertainty = record.flags.includes("obscured-label")
      ? "Part of the original label is obscured; the exact wording below remains a transcription, not a restored identity."
      : record.flags.includes("handwritten")
        ? "This is a transcription of a handwritten line; the original handwriting has not been independently checked."
        : "The title preserves the workbook wording. This source-reading lesson does not independently certify that listing.";
    identityNote = `${uncertainty} ${media.claimBoundary}`;
  }
  const codeStatus = referenceCodeStatus(record, knowledge);
  const codeCaveat = {
    recorded: "The number is recorded in the workbook, not newly verified at a current checkout.",
    missing: "The source has no confirmed code. Do not guess one from an image, a similar item, or a number embedded in the label.",
    conflicted: "The source contains a conflicting mapping or another unexplained number. Do not select a checkout code from this study.",
    uncertain: "The recorded number or source reading still needs confirmation. Do not treat it as a verified checkout instruction.",
  }[codeStatus];
  const sourceLedger = inputs.codes.has(id) ? "data/review-lanes/batch06-final-source-codes.json" : "data/review-lanes/batch06-final-mapped-media.json";
  const evidenceSources = [
    { title: "Workbook transcription and remaining source issue", url: `${sourceBase}${sourceLedger}` },
    { title: media.kind === "generated-illustration" ? "Generated illustration provenance" : "Photograph and reuse rights", url: media.sourceUrl },
    ...(replacement?.evidenceSources ?? []),
  ].filter((entry, index, all) => all.findIndex(other => other.url === entry.url) === index);
  const item = {
    catalogId: id, title: record.item, family: knowledge.identityEvidence.family.value,
    sourcePages: [...record.sourcePages], soldBy: record.soldBy,
    codes: [...record.codes], sourceCodeText: record.codeText, codeStatus,
    visualCue, identityNote,
    checkoutCaveat: `${codeCaveat} ${record.soldBy === null ? "The workbook sale-unit cell is blank; no sale unit is inferred." : `The workbook records ${record.soldBy}; confirm the current exact retail listing before use.`}`,
    sourceIssue: issue, media,
    evidenceSources,
  };
  return { ...item, revision: referenceRevision(item) };
}

export async function prepareReferenceLessons() {
  const inputs = await loadReferenceInputs();
  const photos = await resolveReviewedPhotos(inputs);
  const items = REFERENCE_IDS.map(id => makeReferenceLesson(id, inputs, photos.get(inputs.knowledge.get(id).mediaPlan.source?.file)));
  const document = { schemaVersion: 1, purpose: "Source-reading reference study only. Does not change checkout readiness or learned mastery.", items };
  await writeFile(new URL("../data/reference-lessons.json", import.meta.url), `${JSON.stringify(document, null, 2)}\n`);
  console.log(`Prepared ${items.length} reference studies (${items.filter(item => item.media.kind === "reviewed-photo").length} reviewed photographs). Canonical codes, dispositions, and checkout lessons are unchanged.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await prepareReferenceLessons();
