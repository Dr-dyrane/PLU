import { readFile, readdir } from "node:fs/promises";

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_DELAY_MS = 350;
const DEFAULT_RETRIES = 4;

function parseArgs(argv) {
  const options = {
    batch: null,
    delayMs: DEFAULT_DELAY_MS,
    retries: DEFAULT_RETRIES,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  for (const argument of argv) {
    if (argument === "--all") options.batch = null;
    else if (argument.startsWith("--batch=")) options.batch = argument.slice("--batch=".length);
    else if (argument.startsWith("--delay-ms=")) {
      options.delayMs = Number.parseInt(argument.slice("--delay-ms=".length), 10);
    } else if (argument.startsWith("--retries=")) {
      options.retries = Number.parseInt(argument.slice("--retries=".length), 10);
    } else if (argument.startsWith("--timeout-ms=")) {
      options.timeoutMs = Number.parseInt(argument.slice("--timeout-ms=".length), 10);
    }
  }

  for (const [key, value] of Object.entries(options)) {
    if (key !== "batch" && (!Number.isFinite(value) || value < 0)) {
      throw new Error(`Invalid ${key}: ${value}`);
    }
  }
  return options;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function encodeCommonsTitle(file) {
  return encodeURIComponent(file).replaceAll("%2F", "/");
}

function mediaUrl(photo, seeded) {
  const source = seeded ? photo.src ?? photo.file : photo.src;
  if (typeof source !== "string" || !source.trim()) return null;
  if (/^https?:\/\//i.test(source)) return source;
  if (!seeded) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeCommonsTitle(source)}?width=1600`;
}

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

async function loadJsonRecords(directoryUrl, fileFilter = () => true) {
  const files = (await readdir(directoryUrl).catch(() => []))
    .filter((name) => name.endsWith(".json") && fileFilter(name))
    .sort();
  const records = [];

  for (const name of files) {
    const value = await readJson(new URL(name, directoryUrl));
    for (const record of Array.isArray(value) ? value : [value]) {
      records.push({ record, file: name });
    }
  }
  return records;
}

function imageSignature(bytes) {
  if (!bytes?.length) return null;
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) return "png";

  const ascii = Buffer.from(bytes.subarray(0, Math.min(bytes.length, 24))).toString("ascii");
  if (ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a")) return "gif";
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return "webp";
  if (/^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(Buffer.from(bytes).toString("utf8"))) return "svg";
  if (ascii.slice(4, 12).includes("ftypavif") || ascii.slice(4, 12).includes("ftypavis")) return "avif";
  return null;
}

function signatureMatches(contentType, signature) {
  if (!signature) return false;
  const normalized = contentType.toLowerCase().split(";")[0].trim();
  if (normalized === "image/jpg") return signature === "jpeg";
  if (normalized === "image/svg+xml") return signature === "svg";
  if (normalized === "image/x-png") return signature === "png";
  return normalized.replace(/^image\//, "") === signature;
}

function retryAfterMs(response, attempt) {
  const header = response.headers.get("retry-after");
  const seconds = header == null ? Number.NaN : Number.parseFloat(header);
  if (Number.isFinite(seconds)) return Math.max(5_000, seconds * 1_000);
  return Math.max(5_000, attempt * 4_000);
}

async function probe(url, options) {
  let lastError = null;

  for (let attempt = 1; attempt <= options.retries + 1; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new Error(`Timed out after ${options.timeoutMs} ms`)),
      options.timeoutMs,
    );

    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          Range: "bytes=0-65535",
          "User-Agent": "PLU-published-media-audit/1.0 (+https://plu-beta.vercel.app/)",
        },
      });

      if (response.status === 429) {
        const waitMs = retryAfterMs(response, attempt);
        await response.body?.cancel().catch(() => {});
        clearTimeout(timeout);
        if (attempt <= options.retries) {
          console.warn(`Rate limited; waiting ${Math.round(waitMs / 1000)}s before retry ${attempt}.`);
          await sleep(waitMs);
          continue;
        }
        throw new Error("HTTP 429 after rate-limit retries");
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().startsWith("image/")) {
        throw new Error(`Expected image content, received ${contentType || "no content-type"}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response had no readable body");
      const { value, done } = await reader.read();
      await reader.cancel().catch(() => {});
      if (done || !value?.length) throw new Error("Image response body was empty");

      const signature = imageSignature(value);
      if (!signatureMatches(contentType, signature)) {
        throw new Error(
          `Undecodable or mismatched image bytes (${contentType}; signature ${signature ?? "unknown"})`,
        );
      }

      clearTimeout(timeout);
      return {
        status: response.status,
        contentType: contentType.split(";")[0],
        signature,
        finalUrl: response.url,
      };
    } catch (error) {
      clearTimeout(timeout);
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt <= options.retries) await sleep(Math.max(1_000, attempt * 1_000));
    }
  }

  throw lastError ?? new Error("Unknown media audit failure");
}

const options = parseArgs(process.argv.slice(2));
const seedFilter = options.batch
  ? (name) => name.startsWith(`batch-${options.batch}-`)
  : () => true;
const sources = [];

if (!options.batch) {
  sources.push(
    ...(await loadJsonRecords(new URL("../data/stories/", import.meta.url))).map((entry) => ({ ...entry, seeded: false })),
    ...(await loadJsonRecords(new URL("../data/story-batches/", import.meta.url))).map((entry) => ({ ...entry, seeded: false })),
  );
}
sources.push(
  ...(await loadJsonRecords(new URL("../data/story-seeds/", import.meta.url), seedFilter)).map((entry) => ({ ...entry, seeded: true })),
);

const references = [];
for (const { record: story, file, seeded } of sources) {
  for (const [index, photo] of (story.photos ?? []).entries()) {
    references.push({
      storyId: story.id ?? "unknown-story",
      title: story.title ?? "Untitled",
      role: photo.role ?? `photo-${index + 1}`,
      sourceFile: file,
      original: seeded ? photo.src ?? photo.file : photo.src,
      url: mediaUrl(photo, seeded),
    });
  }
}

const structurallyInvalid = references.filter((entry) => !entry.url);
if (structurallyInvalid.length) {
  for (const entry of structurallyInvalid) {
    console.error(`[INVALID] ${entry.storyId}/${entry.role}: ${entry.original ?? "missing source"}`);
  }
  process.exitCode = 1;
  throw new Error(`${structurallyInvalid.length} media references have no valid URL.`);
}

const byUrl = new Map();
for (const reference of references) {
  const matches = byUrl.get(reference.url) ?? [];
  matches.push(reference);
  byUrl.set(reference.url, matches);
}
const uniqueEntries = [...byUrl.entries()].map(([url, linked]) => ({ url, linked }));

console.log(
  `Auditing ${references.length} published image references across ${sources.length} stories (${uniqueEntries.length} unique URLs; ${options.batch ? `Batch ${options.batch}` : "all batches"}).`,
);

const failures = [];
for (const [index, { url, linked }] of uniqueEntries.entries()) {
  try {
    await probe(url, options);
  } catch (error) {
    failures.push({
      url,
      linked,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const checked = index + 1;
  if (checked % 20 === 0 || checked === uniqueEntries.length) {
    console.log(`Checked ${checked}/${uniqueEntries.length} unique images.`);
  }
  if (options.delayMs > 0 && checked < uniqueEntries.length) await sleep(options.delayMs);
}

if (failures.length) {
  console.error(`\n${failures.length} unique image URL${failures.length === 1 ? "" : "s"} failed:\n`);
  for (const failure of failures) {
    console.error(`- ${failure.error}`);
    console.error(`  ${failure.url}`);
    for (const reference of failure.linked) {
      console.error(
        `  ↳ ${reference.storyId} · ${reference.role} · ${reference.original} · ${reference.sourceFile}`,
      );
    }
  }
  process.exitCode = 1;
  throw new Error(
    `Published media audit failed for ${failures.length} unique image URL${failures.length === 1 ? "" : "s"}.`,
  );
}

console.log(
  `Validated ${references.length} published image references: every URL returned image bytes with a matching decodable signature.`,
);
