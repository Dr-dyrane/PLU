import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  allowedMime,
  hardBlockedTokens,
  knownBadMediaFiles,
  mediaOverridesByCatalogId,
  normalize,
  productHeadGroups,
  queryAliasesByCatalogId,
  reviewedIdentityEvidenceByCatalogId,
  softBlockedTokens,
  words,
} from "./batch04/common.mjs";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));
}

function targetHead(item) {
  const title = new Set(words(item.title));
  const direct = productHeadGroups.find((group) => group.some((token) => title.has(token)));
  if (direct) return direct;
  const target = new Set([
    ...words(item.title),
    ...words(item.query),
    ...(queryAliasesByCatalogId[item.catalogId] ?? []).flatMap(words),
  ]);
  return productHeadGroups.find((group) => group.some((token) => target.has(token))) ?? [];
}

const rawSubjectTokens = new Set([
  "bunch", "corm", "corms", "fruit", "fruits", "market", "pod", "pods",
  "produce", "root", "roots", "stalk", "stalks", "tuber", "tubers",
  "vegetable", "vegetables", "whole",
]);
const metadataHardBlockExceptions = new Set([
  "bird", "garden", "label", "orchard", "plant", "price", "seed", "seeds", "tree",
]);

function validateMediaItem(item, label) {
  assert.ok(item.catalogId && item.title && item.file, `${label}: identity fields are required.`);
  assert.ok(!knownBadMediaFiles.has(item.file), `${label}: known incorrect image is still selected: ${item.file}`);
  assert.ok(allowedMime.has(item.mime), `${label}: unsupported image type ${item.mime}.`);
  assert.ok(Number(item.width) >= 360 && Number(item.height) >= 300, `${label}: source image is too small.`);
  assert.ok(
    typeof item.src === "string" && /^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(item.src),
    `${label}: image must resolve through Wikimedia's image host.`,
  );

  const filenameTokens = new Set(words(item.file));
  const sourceTokens = new Set(words(Object.values(item.sourceEvidence ?? {}).join(" ")));
  const sourceContextTokens = new Set(
    words([
      item.sourceEvidence?.title,
      item.sourceEvidence?.objectName,
      item.sourceEvidence?.categories,
    ].join(" ")),
  );
  assert.ok(sourceTokens.size > 0, `${label}: committed Commons source evidence is required.`);
  for (const token of hardBlockedTokens) {
    assert.ok(!filenameTokens.has(token), `${label}: filename contains blocked subject '${token}'.`);
    assert.ok(
      !sourceContextTokens.has(token) || metadataHardBlockExceptions.has(token),
      `${label}: Commons metadata contains blocked subject '${token}'.`,
    );
  }

  const target = new Set([
    ...words(item.title),
    ...words(item.query),
    ...(queryAliasesByCatalogId[item.catalogId] ?? []).flatMap(words),
  ]);
  for (const token of softBlockedTokens) {
    assert.ok(
      !filenameTokens.has(token) || target.has(token),
      `${label}: image is a non-retail '${token}' view rather than the checkout item.`,
    );
    assert.ok(
      !sourceContextTokens.has(token) ||
        target.has(token) ||
        [...rawSubjectTokens].some((subject) => sourceContextTokens.has(subject)),
      `${label}: Commons metadata describes a non-retail '${token}' view without a checkout subject.`,
    );
  }

  assert.ok(
    ["strict-identity-match", "clean-family-fallback", "reviewed-override"].includes(item.match),
    `${label}: unreviewed media match mode ${item.match}.`,
  );

  if (mediaOverridesByCatalogId[item.catalogId]) {
    assert.equal(item.match, "reviewed-override", `${label}: configured reviewed override was not used.`);
    assert.equal(item.file, mediaOverridesByCatalogId[item.catalogId], `${label}: incorrect reviewed override file.`);
    const head = targetHead(item);
    const headMatches = head.filter((token) => sourceTokens.has(token));
    const explicitEvidence = (reviewedIdentityEvidenceByCatalogId[item.catalogId] ?? []).find(
      (phrase) => words(phrase).every((token) => sourceTokens.has(token)),
    );
    assert.ok(
      headMatches.length > 0 || explicitEvidence,
      `${label}: reviewed override has no committed product identity evidence.`,
    );
  } else {
    const head = targetHead(item);
    assert.ok(head.length > 0, `${label}: no product-head vocabulary is configured.`);
    assert.ok(
      head.some((token) => filenameTokens.has(token)),
      `${label}: filename does not identify the intended product family (${item.file}).`,
    );
  }

  if (item.match !== "reviewed-override") assert.ok(Number(item.score) >= 55, `${label}: resolver confidence is below 55.`);
  assert.ok(!/\b(18\d{2}|19[0-5]\d)\b/.test(normalize(item.file)), `${label}: historical scan selected.`);
}

const reports = [
  ["Batch 04", await readJson("../public/media-resolution-batch04.json")],
  ["Batch 05", await readJson("../public/media-resolution-batch05.json")],
];

const exactMappings = new Set();
let validated = 0;
for (const [batchLabel, report] of reports) {
  assert.equal(report.media?.length, 100, `${batchLabel}: expected 100 generated media selections.`);
  for (const item of report.media) {
    const label = `${batchLabel}/${item.order}/${item.title}`;
    validateMediaItem(item, label);
    const mapping = `${item.catalogId}:${item.storyId}`;
    assert.ok(!exactMappings.has(mapping), `${label}: duplicate image audit mapping.`);
    exactMappings.add(mapping);
    validated += 1;
  }
}

console.log(
  `Validated ${validated} Batch 04–05 media selections for product-head identity, safe subject matter, dimensions, source host, and reviewed overrides.`,
);
