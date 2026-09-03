import { categoryForFamily, normalize, peerColors, slugify } from "./common.mjs";

export function calculateSelection(item, groupSize) {
  const explicitSoldBy = !(item.flags ?? []).includes("sold-by-curated");
  const rawScore = 30 + (item.specialty ? 0 : 25) + (explicitSoldBy ? 15 : 0) +
    (groupSize > 1 ? 15 : 0) + 10 + 10 - (item.specialty ? 10 : 0);
  const score = Math.max(0, Math.min(100, rawScore));
  const band = score >= 80 ? "Essential" : score >= 60 ? "Common" :
    score >= 40 ? "Useful" : score >= 20 ? "Specialty" : "Reference";
  const priority = band === "Essential" ? "must-know" : band === "Common" ? "common" :
    band === "Reference" ? "rare" : "specialty";
  return { rawScore, score, band, priority };
}

function uniqueByCatalog(records) {
  const seen = new Set();
  return records.filter((record) => {
    if (!record?.catalogId || seen.has(record.catalogId)) return false;
    seen.add(record.catalogId);
    return true;
  });
}

export function peerSummary(record) {
  return {
    catalogId: record.catalogId,
    title: record.title,
    code: record.code ?? record.checkout?.code,
    family: record.family,
    form: record.form ?? record.identity?.form ?? "Distinct produce form",
    color: record.color ?? record.identity?.color ?? "Natural",
    cue: record.cue ?? record.visualCues?.[0] ?? "Compare shape, color, and sale form.",
    group: record.group ?? normalize(record.family),
    category: record.category ?? categoryForFamily(record.family),
  };
}

export function choosePeers(item, sourcePool, basePool, count = 3) {
  const sameGroup = sourcePool.filter(
    (peer) => peer.catalogId !== item.catalogId && peer.group === item.group,
  );
  const sameFamily = basePool.filter(
    (peer) => peer.catalogId !== item.catalogId && normalize(peer.family) === normalize(item.family),
  );
  const sameCategory = [...sourcePool, ...basePool].filter(
    (peer) => peer.catalogId !== item.catalogId && peer.category === item.category,
  );
  return uniqueByCatalog([...sameGroup, ...sameFamily, ...sameCategory]).slice(0, count);
}

export function chooseFamilyChoices(item, allPeers) {
  const families = [item.family];
  for (const peer of allPeers) {
    if (!families.some((family) => normalize(family) === normalize(peer.family))) {
      families.push(peer.family);
    }
    if (families.length === 3) break;
  }
  while (families.length < 3) families.push(`Produce family ${families.length + 1}`);
  return families.map((family) => ({ id: slugify(family), label: family }));
}

export function photoRole(storyId, item, media, role, index) {
  const focus = role === "hero" ? "50% 50%" : role === "alternate" ? "38% 50%" : "62% 50%";
  const alt = role === "hero"
    ? `${item.title} reference photograph showing ${item.cue.toLowerCase()}`
    : role === "alternate"
      ? `Alternate crop of ${item.title} highlighting its ${item.form.toLowerCase()}`
      : `${item.title} produce reference emphasizing its ${item.color.toLowerCase()} appearance`;
  return {
    id: `${storyId}-${role}`,
    file: media.file,
    src: media.src,
    alt,
    role,
    focus,
    ...(index > 0 ? {
      reuseOf: media.file,
      fallbackReason:
        "One verified exact-item photograph is reused with a different crop so no unverified image can publish.",
    } : {}),
  };
}

export { peerColors, slugify };
