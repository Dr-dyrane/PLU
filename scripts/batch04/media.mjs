import {
  SEARCH_LIMIT,
  allowedMime,
  cleanFileTitle,
  commonsRequest,
  genericQueryTokens,
  hardBlockedTokens,
  knownBadMediaFiles,
  mediaOverridesByCatalogId,
  normalize,
  productHeadGroups,
  queryAliasesByCatalogId,
  reviewedIdentityEvidenceByCatalogId,
  sleep,
  softBlockedTokens,
  words,
} from "./common.mjs";

const modifierStopWords = new Set([
  ...genericQueryTokens,
  "herbs", "roots", "fruit", "vegetable", "flesh", "bulk", "handwritten",
]);

function extValue(image, key) {
  return image?.extmetadata?.[key]?.value ?? "";
}

function candidateText(page) {
  const image = page.imageinfo?.[0];
  return [
    page.title,
    extValue(image, "ObjectName"),
    extValue(image, "ImageDescription"),
    extValue(image, "Categories"),
  ].join(" ");
}

function candidateContextText(page) {
  const image = page.imageinfo?.[0];
  return [page.title, extValue(image, "ObjectName"), extValue(image, "Categories")].join(" ");
}

function targetWords(item) {
  return [item.title, item.imageQuery, ...(queryAliasesByCatalogId[item.catalogId] ?? [])]
    .flatMap(words);
}

function targetHeadGroup(item) {
  const title = new Set(words(item.title));
  const direct = productHeadGroups.find((group) => group.some((token) => title.has(token)));
  if (direct) return direct;
  const target = new Set(targetWords(item));
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

function targetModifiers(item, headGroup) {
  const heads = new Set(headGroup);
  return [...new Set(words(item.title))].filter(
    (token) => !heads.has(token) && !modifierStopWords.has(token) && token.length >= 3,
  );
}

function blockedReason(page, item) {
  const image = page.imageinfo?.[0];
  if (!image || !allowedMime.has(image.mime)) return "unsupported-image";
  if ((image.width ?? 0) < 360 || (image.height ?? 0) < 300) return "too-small";

  const file = cleanFileTitle(page.title);
  if (knownBadMediaFiles.has(file)) return "known-bad-selection";

  const titleTokens = new Set(words(page.title));
  for (const token of hardBlockedTokens) {
    if (titleTokens.has(token)) return `blocked-${token}`;
  }

  const sourceTokens = new Set(words(candidateContextText(page)));
  for (const token of hardBlockedTokens) {
    if (sourceTokens.has(token) && !metadataHardBlockExceptions.has(token)) {
      return `blocked-source-${token}`;
    }
  }

  const title = normalize(page.title);
  if (/\b(18\d{2}|19[0-5]\d)\b/.test(title)) return "historical-source";

  const target = new Set(targetWords(item));
  for (const token of softBlockedTokens) {
    if (titleTokens.has(token) && !target.has(token)) return `non-retail-${token}`;
    if (
      sourceTokens.has(token) &&
      !target.has(token) &&
      ![...rawSubjectTokens].some((subject) => sourceTokens.has(subject))
    ) {
      return `non-retail-source-${token}`;
    }
  }

  return null;
}

function analyzeCandidate(page, item, usedFiles, mode = "strict") {
  const reason = blockedReason(page, item);
  if (reason) return { valid: false, reason, score: Number.NEGATIVE_INFINITY };

  const image = page.imageinfo[0];
  const file = cleanFileTitle(page.title);
  const fileWords = new Set(words(page.title));
  const searchableWords = new Set(words(candidateText(page)));
  const targets = [...new Set(targetWords(item))];
  const headGroup = targetHeadGroup(item);
  const modifiers = targetModifiers(item, headGroup);

  const headInFile = headGroup.some((token) => fileWords.has(token));
  const headAnywhere = headGroup.some((token) => searchableWords.has(token));
  if (headGroup.length && !(headInFile || (mode === "family" && headAnywhere))) {
    return { valid: false, reason: "missing-product-head", score: Number.NEGATIVE_INFINITY };
  }

  const matchedTargets = targets.filter((token) => searchableWords.has(token));
  const matchedFileTargets = targets.filter((token) => fileWords.has(token));
  const matchedModifiers = modifiers.filter((token) => searchableWords.has(token));
  const matchedFileModifiers = modifiers.filter((token) => fileWords.has(token));
  const matchedIdentity = headGroup.filter((token) => searchableWords.has(token));

  if (!matchedFileTargets.length && mode !== "family") {
    return { valid: false, reason: "no-filename-anchor", score: Number.NEGATIVE_INFINITY };
  }
  if (mode === "strict" && modifiers.length && !matchedModifiers.length) {
    return { valid: false, reason: "missing-variant-modifier", score: Number.NEGATIVE_INFINITY };
  }

  const searchRank = Number.isFinite(page.__searchRank) ? page.__searchRank : SEARCH_LIMIT;
  let score = Math.max(0, 90 - searchRank * 2);
  score += matchedTargets.length * 12;
  score += matchedFileTargets.length * 18;
  score += matchedModifiers.length * 15;
  score += matchedFileModifiers.length * 18;
  if (headInFile) score += 35;
  if ((image.width ?? 0) >= 1_000 && (image.height ?? 0) >= 700) score += 12;
  if ((image.width ?? 0) >= 1_600) score += 6;
  if (image.mime === "image/jpeg") score += 5;
  if (/\b(market|produce|supermarket|bunch|whole|raw)\b/.test(normalize(page.title))) score += 8;
  if (usedFiles.has(file)) score -= 100;
  if (mode === "family") score -= 45;

  return {
    valid: true,
    score,
    file,
    headInFile,
    matchedTargets,
    matchedFileTargets,
    matchedModifiers,
    matchedFileModifiers,
    matchedIdentity,
  };
}

function reviewedIdentityEvidence(page, item) {
  const sourceWords = new Set(words(candidateText(page)));
  return (reviewedIdentityEvidenceByCatalogId[item.catalogId] ?? []).find((phrase) =>
    words(phrase).every((token) => sourceWords.has(token)),
  );
}

async function queryExactFile(file) {
  const response = await commonsRequest({
    titles: `File:${file}`,
    redirects: "1",
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: "1600",
  });
  return (response?.query?.pages ?? []).find((page) => !page.missing && page.imageinfo?.[0]);
}

async function searchCommons(query) {
  const response = await commonsRequest({
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: String(SEARCH_LIMIT),
    gsrsearch: query,
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: "1600",
  });
  return (response?.query?.pages ?? []).map((page, index) => ({ ...page, __searchRank: index }));
}

function rankPages(pages, item, usedFiles, mode) {
  return pages
    .map((page) => ({ page, ...analyzeCandidate(page, item, usedFiles, mode) }))
    .filter((candidate) => candidate.valid && Number.isFinite(candidate.score))
    .sort((left, right) => right.score - left.score || left.file.localeCompare(right.file));
}

function mediaResult(selected, alternatives, match, usedFiles) {
  const image = selected.page.imageinfo[0];
  const sharedAcrossProducts = usedFiles.has(selected.file);
  usedFiles.add(selected.file);
  return {
    file: selected.file,
    src: image.thumburl ?? image.url,
    mime: image.mime,
    width: image.width,
    height: image.height,
    thumbWidth: image.thumbwidth ?? null,
    thumbHeight: image.thumbheight ?? null,
    score: selected.score,
    sharedAcrossProducts,
    match,
    matchedTargets: selected.matchedTargets ?? [],
    matchedModifiers: selected.matchedModifiers ?? [],
    identityEvidence: selected.identityEvidence ?? selected.matchedIdentity ?? [],
    sourceEvidence: {
      title: cleanFileTitle(selected.page.title),
      objectName: extValue(image, "ObjectName"),
      description: extValue(image, "ImageDescription"),
      categories: extValue(image, "Categories"),
    },
    alternatives: alternatives
      .filter((candidate) => candidate.file !== selected.file)
      .slice(0, 4)
      .map((candidate) => ({
        file: candidate.file,
        score: candidate.score,
        src: candidate.page.imageinfo?.[0]?.thumburl ?? candidate.page.imageinfo?.[0]?.url,
      })),
  };
}

export async function resolveImage(item, usedFiles, reviewedFile = null) {
  const override = reviewedFile ?? mediaOverridesByCatalogId[item.catalogId];
  if (override) {
    const page = await queryExactFile(override);
    if (!page) throw new Error(`${item.title}: reviewed media override is missing (${override}).`);
    const analyzed = { page, ...analyzeCandidate(page, item, usedFiles, "family") };
    const aliasEvidence = reviewedIdentityEvidence(page, item);
    const reviewedAliasOnly = !analyzed.valid &&
      analyzed.reason === "missing-product-head" &&
      aliasEvidence;
    if (!analyzed.valid && !reviewedAliasOnly) {
      throw new Error(`${item.title}: reviewed media override failed safety checks (${analyzed.reason}).`);
    }
    const reviewed = reviewedAliasOnly
      ? {
          ...analyzed,
          file: cleanFileTitle(page.title),
          score: 55,
          matchedTargets: words(aliasEvidence),
          matchedModifiers: [],
          identityEvidence: aliasEvidence,
        }
      : analyzed;
    return mediaResult(reviewed, [], "reviewed-override", usedFiles);
  }

  if (!targetHeadGroup(item).length) {
    throw new Error(`No product-head vocabulary is configured for ${item.title}.`);
  }

  const aliases = queryAliasesByCatalogId[item.catalogId] ?? [];
  const queries = [
    `intitle:${JSON.stringify(item.title)} ${item.imageQuery}`,
    item.imageQuery,
    ...aliases,
    `${item.title} raw produce`,
    `${item.title} ${item.family}`,
  ];
  const pageMap = new Map();

  for (const query of [...new Set(queries.map((value) => value.trim()).filter(Boolean))]) {
    const pages = await searchCommons(query);
    for (const page of pages) {
      if (page?.title && page.imageinfo?.[0]) pageMap.set(page.title, page);
    }
    const strict = rankPages([...pageMap.values()], item, usedFiles, "strict");
    if (strict[0]?.score >= 125) {
      return mediaResult(strict[0], strict, "strict-identity-match", usedFiles);
    }
    await sleep(120);
  }

  const pages = [...pageMap.values()];
  const strict = rankPages(pages, item, usedFiles, "strict");
  if (strict[0]) return mediaResult(strict[0], strict, "strict-identity-match", usedFiles);

  const family = rankPages(pages, item, usedFiles, "family");
  if (family[0]) return mediaResult(family[0], family, "clean-family-fallback", usedFiles);

  throw new Error(`No semantically safe Commons photograph found for ${item.title}.`);
}
