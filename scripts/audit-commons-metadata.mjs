import { readFile, readdir } from "node:fs/promises";

const API_URL = "https://commons.wikimedia.org/w/api.php";
const CHUNK_SIZE = 40;
const TIMEOUT_MS = 25_000;

function parseBatch(argv) {
  const argument = argv.find((value) => value.startsWith("--batch="));
  const batch = argument?.slice("--batch=".length) ?? "03";
  if (!/^\d{2}$/.test(batch)) throw new Error(`Invalid batch identifier: ${batch}`);
  return batch;
}

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

async function loadSeeds(batch) {
  const directory = new URL("../data/story-seeds/", import.meta.url);
  const files = (await readdir(directory))
    .filter((name) => name.startsWith(`batch-${batch}-`) && name.endsWith(".json"))
    .sort();
  const records = [];
  for (const name of files) {
    const value = await readJson(new URL(name, directory));
    for (const record of Array.isArray(value) ? value : [value]) {
      records.push({ record, sourceFile: name });
    }
  }
  return records;
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function apiTitle(file) {
  return `File:${file.replaceAll("_", " ")}`;
}

async function queryCommons(files) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error(`Timed out after ${TIMEOUT_MS} ms`)),
    TIMEOUT_MS,
  );
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "PLU-published-media-audit/1.0 (+https://plu-beta.vercel.app/)",
      },
      body: new URLSearchParams({
        action: "query",
        format: "json",
        formatversion: "2",
        prop: "imageinfo",
        iiprop: "url|mime|size",
        iiurlwidth: "1600",
        redirects: "1",
        titles: files.map(apiTitle).join("|"),
      }),
    });
    if (!response.ok) {
      throw new Error(`Commons API returned HTTP ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function resolveTitle(title, aliases) {
  let current = title;
  const seen = new Set();
  while (aliases.has(current) && !seen.has(current)) {
    seen.add(current);
    current = aliases.get(current);
  }
  return current;
}

const batch = parseBatch(process.argv.slice(2));
const seeds = await loadSeeds(batch);
if (!seeds.length) throw new Error(`No Batch ${batch} story seeds were found.`);

const references = [];
for (const { record, sourceFile } of seeds) {
  for (const photo of record.photos ?? []) {
    if (typeof photo.file !== "string" || !photo.file.trim()) continue;
    if (/^https?:\/\//i.test(photo.file)) continue;
    references.push({
      file: photo.file,
      storyId: record.id,
      title: record.title,
      role: photo.role,
      sourceFile,
    });
  }
}

const uniqueFiles = [...new Set(references.map((reference) => reference.file))];
const metadata = new Map();

for (const [index, group] of chunks(uniqueFiles, CHUNK_SIZE).entries()) {
  const response = await queryCommons(group);
  const query = response?.query ?? {};
  const aliases = new Map();
  for (const item of query.normalized ?? []) aliases.set(item.from, item.to);
  for (const item of query.redirects ?? []) aliases.set(item.from, item.to);
  const pages = new Map((query.pages ?? []).map((page) => [page.title, page]));

  for (const file of group) {
    const requested = apiTitle(file);
    const resolved = resolveTitle(requested, aliases);
    const page = pages.get(resolved);
    const image = page?.imageinfo?.[0];
    metadata.set(file, {
      exists: Boolean(
        page &&
          !page.missing &&
          image?.url &&
          image?.mime?.startsWith("image/")
      ),
      requested,
      resolved,
      page,
      image,
    });
  }

  console.log(
    `Resolved Batch ${batch} Commons metadata ${Math.min((index + 1) * CHUNK_SIZE, uniqueFiles.length)}/${uniqueFiles.length}.`,
  );
}

const failures = [];
for (const reference of references) {
  const result = metadata.get(reference.file);
  if (!result?.exists) failures.push({ reference, result });
}

if (failures.length) {
  console.error(
    `\n${failures.length} Batch ${batch} image reference${failures.length === 1 ? "" : "s"} do not resolve to a Commons image:\n`,
  );
  for (const { reference, result } of failures) {
    console.error(`- ${reference.storyId} · ${reference.role} · ${reference.file}`);
    console.error(`  ${reference.sourceFile}`);
    if (result?.resolved && result.resolved !== result.requested) {
      console.error(`  resolved title: ${result.resolved}`);
    }
  }
  process.exitCode = 1;
  throw new Error(
    `Commons metadata audit failed for ${failures.length} Batch ${batch} image reference${failures.length === 1 ? "" : "s"}.`,
  );
}

const mimeCounts = new Map();
for (const result of metadata.values()) {
  const mime = result.image.mime;
  mimeCounts.set(mime, (mimeCounts.get(mime) ?? 0) + 1);
}

console.log(
  `Validated ${references.length} Batch ${batch} image references across ${seeds.length} stories through the Wikimedia Commons API.`,
);
console.log(
  `Unique files: ${uniqueFiles.length}. Image formats: ${[...mimeCounts.entries()]
    .map(([mime, count]) => `${mime} ${count}`)
    .join(", ")}.`,
);
