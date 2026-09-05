import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { commonsRequest } from "./batch04/common.mjs";
import { loadRelationshipInputs, validateRelationshipDecisions, validateRelationshipLessons, makeRelationshipLesson } from "./relationship-data.mjs";

const inputs = await loadRelationshipInputs();
validateRelationshipDecisions(inputs);
const files = [...new Set(inputs.decisions.items.map(x => x.mediaEvidence.commonsFile))];
const response = await commonsRequest({
  action: "query", format: "json", formatversion: "2", prop: "imageinfo", redirects: "1",
  iiprop: "url|mime|size|extmetadata", iiurlwidth: "1600", titles: files.map(x => `File:${x}`).join("|"),
});
const pages = new Map((response.query?.pages ?? []).map(x => [x.title.replaceAll("_", " "), x]));
const aliases = new Map([...(response.query?.normalized ?? []), ...(response.query?.redirects ?? [])].map(x => [x.from, x.to]));
function plain(value) {
  return String(value ?? "").replace(/<[^>]*>/g, "").replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&nbsp;", " ").trim();
}
const items = inputs.decisions.items.map(decision => {
  let title = `File:${decision.mediaEvidence.commonsFile}`;
  const visited = new Set();
  while (aliases.has(title) && !visited.has(title)) { visited.add(title); title = aliases.get(title); }
  const image = pages.get(title.replaceAll("_", " "))?.imageinfo?.[0];
  assert.ok(image?.mime.startsWith("image/") && image.width >= 360 && image.height >= 300, `${title}: usable image metadata required.`);
  const metadata = image.extmetadata;
  return makeRelationshipLesson(decision, {
    id: `${decision.catalogId}-reference`, role: "hero", src: image.thumburl ?? image.url,
    alt: `${decision.mediaEvidence.visibleIdentity.label}: ${decision.mediaEvidence.visibleIdentity.cue}`,
    source: {
      label: "Wikimedia Commons", author: plain(metadata.Artist?.value),
      license: plain(metadata.LicenseShortName?.value),
      url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(decision.mediaEvidence.commonsFile.replaceAll(" ", "_"))}`,
    },
  });
});
const document = { schemaVersion: 1, items };
validateRelationshipLessons(document, inputs);
await writeFile(new URL("../data/relationship-lessons.json", import.meta.url), `${JSON.stringify(document, null, 2)}\n`);
console.log(`Prepared ${items.length} source-row relationship lessons using ${files.length} reviewed photographs. Checkout readiness remains unchanged.`);
