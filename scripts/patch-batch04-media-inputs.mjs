import { readFile, writeFile } from "node:fs/promises";

const sourceUrl = new URL("../data/batch-04-source.json", import.meta.url);
const source = JSON.parse(await readFile(sourceUrl, "utf8"));

const reviewedQueries = new Map([
  ["carrots-jumbo", "Big Carrot-2356"],
]);

let changes = 0;
for (const item of source) {
  const reviewedQuery = reviewedQueries.get(item.catalogId);
  if (!reviewedQuery || item.imageQuery === reviewedQuery) continue;
  item.imageQuery = reviewedQuery;
  changes += 1;
}

if (changes > 0) {
  await writeFile(sourceUrl, `${JSON.stringify(source, null, 2)}\n`, "utf8");
}

console.log(`Applied ${changes} reviewed Batch 04 media-input correction${changes === 1 ? "" : "s"}.`);
