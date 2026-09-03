import {
  SEARCH_LIMIT,
  allowedMime,
  cleanFileTitle,
  commonsRequest,
  genericQueryTokens,
  hardBlockedTokens,
  normalize,
  queryAliasesByCatalogId,
  sleep,
  softBlockedTokens,
  words,
} from "./common.mjs";

function targetTokens(item) {
  return [item.title, item.imageQuery, ...(queryAliasesByCatalogId[item.catalogId] ?? [])]
    .flatMap(words)
    .filter((token) => !genericQueryTokens.has(token));
}

function scoreCandidate(page, item, usedFiles, relaxed = false) {
  const image = page.imageinfo?.[0];
  if (!image || !allowedMime.has(image.mime)) return Number.NEGATIVE_INFINITY;
  if ((image.width ?? 0) < 360 || (image.height ?? 0) < 300) return Number.NEGATIVE_INFINITY;

  const title = normalize(page.title);
  const titleTokens = new Set(words(page.title));
  if ([...hardBlockedTokens].some((token) => titleTokens.has(token))) {
    return Number.NEGATIVE_INFINITY;
  }

  const meaningfulTokens = [...new Set(targetTokens(item))];
  const matchedTokens = meaningfulTokens.filter((token) => titleTokens.has(token));
  if (!relaxed && matchedTokens.length === 0) return Number.NEGATIVE_INFINITY;

  const searchRank = Number.isFinite(page.__searchRank) ? page.__searchRank : SEARCH_LIMIT;
  let score = Math.max(0, 72 - searchRank * 2) + matchedTokens.length * 24;
  const phrases = [item.title, item.imageQuery, ...(queryAliasesByCatalogId[item.catalogId] ?? [])]
    .map(normalize)
    .filter((phrase) => phrase.length >= 5);
  for (const phrase of phrases) if (title.includes(phrase)) score += 55;

  if (titleTokens.has("fruit") || titleTokens.has("vegetable") || titleTokens.has("produce")) score += 8;
  if (titleTokens.has("bunch") || titleTokens.has("harvest") || titleTokens.has("market")) score += 5;
  if ([...softBlockedTokens].some((token) => titleTokens.has(token))) score -= 40;
  if (!normalize(item.form).includes("flower") && titleTokens.has("flower")) score -= 28;
  if ((image.width ?? 0) >= 1_000 && (image.height ?? 0) >= 700) score += 10;
  if ((image.width ?? 0) >= 1_600) score += 5;
  if (image.mime === "image/jpeg") score += 3;

  const file = cleanFileTitle(page.title);
  if (usedFiles.has(file)) score -= 18;
  if (relaxed) score -= 35;
  return score;
}

async function searchCommons(query) {
  const response = await commonsRequest({
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: String(SEARCH_LIMIT),
    gsrsearch: query,
    prop: "imageinfo",
    iiprop: "url|mime|size",
    iiurlwidth: "1600",
  });
  return (response?.query?.pages ?? []).map((page, index) => ({ ...page, __searchRank: index }));
}

function rankPages(pages, item, usedFiles, relaxed) {
  return pages
    .map((page) => ({
      page,
      file: cleanFileTitle(page.title),
      score: scoreCandidate(page, item, usedFiles, relaxed),
    }))
    .filter((candidate) => Number.isFinite(candidate.score))
    .sort((left, right) => right.score - left.score || left.file.localeCompare(right.file));
}

export async function resolveImage(item, usedFiles) {
  const queries = [
    item.imageQuery,
    ...(queryAliasesByCatalogId[item.catalogId] ?? []),
    `${item.title} ${item.family}`,
    `${item.title} food produce`,
    `${item.title} vegetable fruit`,
  ];
  const pageMap = new Map();
  let strict = [];

  for (const query of [...new Set(queries.map((value) => value.trim()).filter(Boolean))]) {
    const pages = await searchCommons(query);
    for (const page of pages) {
      if (page?.title && page.imageinfo?.[0]) pageMap.set(page.title, page);
    }
    strict = rankPages([...pageMap.values()], item, usedFiles, false);
    const bestUnique = strict.find((candidate) => !usedFiles.has(candidate.file));
    if ((bestUnique ?? strict[0])?.score >= 55) break;
    await sleep(180);
  }

  const allPages = [...pageMap.values()];
  const relaxed = rankPages(allPages, item, usedFiles, true);
  const selected =
    strict.find((candidate) => !usedFiles.has(candidate.file)) ??
    strict[0] ??
    relaxed.find((candidate) => !usedFiles.has(candidate.file)) ??
    relaxed[0];

  if (!selected) {
    throw new Error(`No usable Commons photograph found for ${item.title} (${item.imageQuery}).`);
  }

  const sharedAcrossProducts = usedFiles.has(selected.file);
  usedFiles.add(selected.file);
  const image = selected.page.imageinfo[0];
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
    match: strict.includes(selected)
      ? sharedAcrossProducts ? "shared-token-matched" : "token-matched"
      : sharedAcrossProducts ? "shared-search-result-fallback" : "search-result-fallback",
    alternatives: strict.slice(0, 4).filter((candidate) => candidate.file !== selected.file).map((candidate) => ({
      file: candidate.file,
      score: candidate.score,
      src: candidate.page.imageinfo?.[0]?.thumburl ?? candidate.page.imageinfo?.[0]?.url,
    })),
  };
}
