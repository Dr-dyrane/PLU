import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";

const API_URL = "https://commons.wikimedia.org/w/api.php";
const BATCH = "03";
const METADATA_CHUNK_SIZE = 40;
const TIMEOUT_MS = 25_000;

const reviewedAnchorsByStory = {
  "red-nectarine-4378": [
    "Nectarines.jpg",
    "Nectavigne fruit.jpg",
    "Nectarine Fruit (4791921423).jpg",
  ],
  "black-seedless-grapes-4056": [
    "Black seedless grapes 4300175324717 pack 01.jpg",
    "Black seedless grapes 4300175324717 pack 02.jpg",
    "Black seedless grapes 4300175324717 berry and seed section 01.jpg",
  ],
  "bosc-pear-4026": [
    "Bosc pear.jpg",
    "Bosc (pear) 20230529 140014.jpg",
  ],
  "danjou-pear-4025": [
    "D'anjou pear.jpg",
    "D'anjou pear (square).jpg",
    "Tj danjoupear.jpg",
  ],
  "yellow-dragon-fruit-3319": [
    "Yellow dragon fruit (50831s).jpg",
    "Yellow dragon fruit (50815s).jpg",
    "Yellow dragon fruit with spoon (50847s).jpg",
  ],
  "star-fruit-4256": [
    "Star Fruit (Carambola) (2858296798).jpg",
    "Carambola fruit.jpg",
    "Star fruit (Averrhoa carambola) 01.jpg",
  ],
  "chinese-eggplant-3089": [
    "Chinese eggplant (Berenjena china).jpg",
    "\"Chinese eggplant\" for sale at Safeway.jpg",
  ],
  "green-swiss-chard-4586": [
    "Swiss chard bunches.jpg",
    "Chard 1.jpg",
    "Swiss Chard 1.jpg",
  ],
  "daikon-radish-4598": [
    "Japanese radish ~ Daikon.jpg",
    "Daikon 20220423 083159.jpg",
    "Daikon.Japan.jpg",
  ],
  "cremini-mushrooms-4648": [
    "Light brown bisporus mushroom.jpg",
    "Fresh-Cut-Crimini-Mushrooms.JPG",
    "A box of brown button mushrooms in the vegetarian food store at Tung Yick Market.jpg",
  ],
};

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

function resolveTitle(title, aliases) {
  let current = title;
  const seen = new Set();
  while (aliases.has(current) && !seen.has(current)) {
    seen.add(current);
    current = aliases.get(current);
  }
  return current;
}

async function apiRequest(parameters) {
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
        "User-Agent": "PLU-media-resolver/1.0 (+https://plu-beta.vercel.app/)",
      },
      body: new URLSearchParams({
        action: "query",
        format: "json",
        formatversion: "2",
        ...parameters,
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

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

async function loadSeedFiles() {
  const directory = new URL("../data/story-seeds/", import.meta.url);
  const names = (await readdir(directory))
    .filter((name) => name.startsWith(`batch-${BATCH}-`) && name.endsWith(".json"))
    .sort();
  const entries = [];

  for (const name of names) {
    const value = await readJson(new URL(name, directory));
    entries.push({
      name,
      directory,
      records: Array.isArray(value) ? value : [value],
    });
  }
  return entries;
}

async function resolveMetadata(files) {
  const metadata = new Map();

  for (const group of chunks(files, METADATA_CHUNK_SIZE)) {
    const response = await apiRequest({
      prop: "imageinfo",
      iiprop: "url|mime|size",
      iiurlwidth: "1600",
      redirects: "1",
      titles: group.map(apiTitle).join("|"),
    });
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
        page,
        image,
        resolved,
      });
    }
  }

  return metadata;
}

function fallbackAlt(story, role) {
  if (role === "hero") return `Verified reference photograph of ${story.title}`;
  if (role === "alternate") return `Alternate verified photograph of ${story.title}`;
  return `${story.title} shown in a verified produce reference photograph`;
}

function fallbackFocus(role, index) {
  if (role === "alternate") return index % 2 === 0 ? "38% 50%" : "62% 50%";
  if (role === "context") return index % 2 === 0 ? "50% 38%" : "50% 62%";
  return "50% 50%";
}

const seedFiles = await loadSeedFiles();
const stories = seedFiles.flatMap((entry) =>
  entry.records.map((record) => ({ record, sourceFile: entry.name })),
);
const sourceFiles = stories.flatMap(({ record }) =>
  (record.photos ?? [])
    .map((photo) => photo.file)
    .filter((file) => typeof file === "string" && !/^https?:\/\//i.test(file)),
);
const reviewedFiles = Object.values(reviewedAnchorsByStory).flat();
const originalFiles = [...new Set([...sourceFiles, ...reviewedFiles])];
const originalMetadata = await resolveMetadata(originalFiles);

const invalidReviewedFiles = reviewedFiles.filter(
  (file) => !originalMetadata.get(file)?.exists,
);
if (invalidReviewedFiles.length) {
  for (const file of invalidReviewedFiles) {
    console.error(`Reviewed Commons anchor did not resolve: ${file}`);
  }
  process.exitCode = 1;
  throw new Error(
    `Reviewed anchor verification failed for ${invalidReviewedFiles.length} files.`,
  );
}

const report = {
  generatedAt: new Date().toISOString(),
  batch: BATCH,
  strategy:
    "Keep verified exact-item Commons files. Missing guessed filenames are replaced only by reviewed files for the same product, or by a verified original from that same story.",
  replacements: [],
  media: [],
};

const storiesWithoutVerifiedMedia = [];
let replacementCount = 0;

for (const { record: story, sourceFile } of stories) {
  const verifiedFiles = [];

  for (const photo of story.photos ?? []) {
    if (/^https?:\/\//i.test(photo.file) || originalMetadata.get(photo.file)?.exists) {
      if (!verifiedFiles.includes(photo.file)) verifiedFiles.push(photo.file);
    }
  }
  for (const file of reviewedAnchorsByStory[story.id] ?? []) {
    if (originalMetadata.get(file)?.exists && !verifiedFiles.includes(file)) {
      verifiedFiles.push(file);
    }
  }

  if (!verifiedFiles.length) {
    storiesWithoutVerifiedMedia.push({
      storyId: story.id,
      title: story.title,
      sourceFile,
      files: (story.photos ?? []).map((photo) => photo.file),
    });
    continue;
  }

  let fallbackIndex = 0;
  for (const photo of story.photos ?? []) {
    const isValid = /^https?:\/\//i.test(photo.file)
      ? true
      : originalMetadata.get(photo.file)?.exists;
    if (isValid) continue;

    const verifiedFile = verifiedFiles[fallbackIndex % verifiedFiles.length];
    fallbackIndex += 1;
    const previous = photo.file;
    photo.file = verifiedFile;
    photo.reuseOf = verifiedFile;
    photo.fallbackReason =
      "The intended Commons filename did not resolve; this role uses a reviewed photograph of the same exact product.";
    photo.alt = fallbackAlt(story, photo.role);
    photo.focus = fallbackFocus(photo.role, fallbackIndex);
    replacementCount += 1;

    report.replacements.push({
      storyId: story.id,
      title: story.title,
      sourceFile,
      role: photo.role,
      previous,
      selected: verifiedFile,
      method: (reviewedAnchorsByStory[story.id] ?? []).includes(verifiedFile)
        ? "reviewed-exact-product-anchor"
        : "reuse-verified-exact-product",
    });
  }
}

if (storiesWithoutVerifiedMedia.length) {
  console.error(
    `\n${storiesWithoutVerifiedMedia.length} Batch 03 stories have no verified photograph:\n`,
  );
  for (const story of storiesWithoutVerifiedMedia) {
    console.error(`- ${story.storyId} · ${story.title} · ${story.sourceFile}`);
    for (const file of story.files) console.error(`  ${file}`);
  }
  process.exitCode = 1;
  throw new Error(
    "Batch 03 media repair stopped rather than substitute a photograph from another product.",
  );
}

const finalFiles = [
  ...new Set(
    stories.flatMap(({ record }) =>
      (record.photos ?? []).map((photo) => photo.file),
    ),
  ),
];
const finalMetadata = await resolveMetadata(finalFiles);
const finalFailures = finalFiles.filter(
  (file) => !/^https?:\/\//i.test(file) && !finalMetadata.get(file)?.exists,
);

if (finalFailures.length) {
  for (const file of finalFailures) {
    console.error(`Final Commons file did not resolve: ${file}`);
  }
  process.exitCode = 1;
  throw new Error(`Final media verification failed for ${finalFailures.length} files.`);
}

for (const { record: story, sourceFile } of stories) {
  for (const photo of story.photos ?? []) {
    if (/^https?:\/\//i.test(photo.file)) {
      photo.src = photo.file;
      report.media.push({
        storyId: story.id,
        title: story.title,
        sourceFile,
        role: photo.role,
        file: photo.file,
        src: photo.src,
        mime: null,
      });
      continue;
    }

    const image = finalMetadata.get(photo.file).image;
    photo.src = image.thumburl ?? image.url;
    report.media.push({
      storyId: story.id,
      title: story.title,
      sourceFile,
      role: photo.role,
      file: photo.file,
      src: photo.src,
      mime: image.mime,
      width: image.width,
      height: image.height,
      thumbWidth: image.thumbwidth ?? null,
      thumbHeight: image.thumbheight ?? null,
      reuseOf: photo.reuseOf ?? null,
    });
  }
}

const publicDirectory = new URL("../public/", import.meta.url);
const resolvedDirectory = new URL("resolved-seeds/", publicDirectory);
await mkdir(resolvedDirectory, { recursive: true });

for (const entry of seedFiles) {
  const serialized = `${JSON.stringify(entry.records, null, 2)}\n`;
  await writeFile(new URL(entry.name, entry.directory), serialized, "utf8");
  await writeFile(new URL(entry.name, resolvedDirectory), serialized, "utf8");
}
await writeFile(
  new URL("media-resolution-batch03.json", publicDirectory),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(
  `Repaired ${replacementCount} missing Batch 03 image references with same-product media and verified ${report.media.length} canonical CDN sources.`,
);
