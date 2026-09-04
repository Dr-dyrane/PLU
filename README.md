# PLU

An image-first produce-identification and checkout-code learning system built with Next.js, TypeScript, and Lucide React.

`main` is the implementation branch and the Vercel production source.

## Learning flow

```text
Look → Know → Code → Practice → Recall
```

The app teaches the part that can be reasoned about—exact product recognition—before attaching the store's assigned code. Every lesson uses realistic product photography so recognition transfers across angle, lighting, specimen, and market context.

## Catalog 475

Six catalog batches are accounted for:

- `data/batches/batch-01.json` — Core 25
- `data/batches/batch-02.json` — Next 25
- `data/batches/batch-03.json` — Next 50
- `data/batches/batch-04.json` — Products 101–200
- `data/batches/batch-05.json` — Products 201–300
- `data/batches/batch-06.json` — All 175 remaining source rows

The home page combines them into one searchable **Catalog 475** collection. The first five batches remain the completed **Must Know 300** set. Batch-specific views are available at `/batch-01/` through `/batch-06/`.

Batch 05 is selected from the remaining normalized catalog rows. It rejects already-published IDs, uncertain codes, non-produce rows, and weak media matches before accepting exactly 100 lessons.

Batch 06 accounts for every source row left after Batch 05. Its full-remainder pass searches all 163 in-scope identities, not only the old strict loose-produce subset: 108 returned candidate media, all 422 primary/alternative images were decoded and pixel-reviewed, and 75 candidates passed visual review. The admission gate now yields 53 ready Batch 06 lessons and 122 searchable queued rows, bringing the ready lesson total to 353. Approved media for code- or identity-blocked rows is retained as evidence without inventing or guessing a checkout mapping.

## Product stories

Every lesson carries:

- exact catalog ID and checkout code;
- sold-by-weight or sold-each behavior;
- three recognition-photo roles;
- visual cues and classification decisions;
- package, case, bulk, size, organic, and related listings where present;
- nearest visual confusions;
- local code relationships presented as observations, never formulas;
- source flags for handwritten or curated store details.

Batch 01 retains individual story files in `data/stories/`. Batch 02 uses full story packets under `data/story-batches/`. Batches 03–06 use compact source-backed seeds under `data/story-seeds/`, compiled into the same canonical `ProductStory` runtime shape. Only ready Batch 06 rows produce story seeds.

## Media safety

The image pipeline separates three checks:

1. **Identity:** the filename or reviewed override must identify the intended produce family and, where available, the exact variety.
2. **Subject:** prepared meals, catalogue pages, illustrations, animals, historical scans, and unrelated objects are rejected.
3. **Delivery:** the selected Wikimedia URL must resolve as an image with sufficient dimensions.

`media-resolution-batch04.json` records the corrected audit of products 101–200. `media-resolution-batch05.json` records every accepted and rejected Batch 05 candidate. `media-discovery-batch06.json` records the complete non-publishing search pass, `data/batch-06-media-review-decisions.json` preserves the pixel decisions, and `media-resolution-batch06.json` records the subset whose identity, code, label, and media gates all passed.

## Appearance

Light mode is the first-visit default. The home footer provides a persistent Apple-style light/dark switch. Product accents have separate light and dark values, while success, warning, and error colors remain semantic.

## Data

- `data/catalog/*.json` — 475 normalized source rows.
- `data/aisles.json` — 47 grocery-aisle entries.
- `data/batches/*.json` — ordered production batches.
- `data/stories/*.json` — individually curated product stories.
- `data/story-batches/*.json` — full validated story packets.
- `data/story-seeds/*.json` — compact story seeds for scalable batch production.
- `data/stories/compile-story-seed.ts` — runtime seed compiler.
- `data/canonical.ts` — the single runtime entrypoint.
- `data/pegs/*` — legacy workbook material retained for audit, not used by the current lesson.

## Generation and validation

```bash
npm run generate:batch05
npm run discover:batch06-media
python3 scripts/build-media-contact-sheets.py --report public/media-discovery-batch06.json
npm run compile:batch06-reviews
npm run generate:batch06
python3 scripts/build-media-contact-sheets.py
npm run audit:batch04-media
npm run audit:batch05-media
npm run audit:batch06-media
npm run typecheck
npm run build
```

The generated Batch 04–06 data are committed so ordinary Vercel builds are deterministic and do not depend on live media search. A new discovery report invalidates the old lane indexes and must be pixel-reviewed again before compilation. Contact-sheet output is local review material under `artifacts/`; the committed review decisions and `public/media-render-audit.json` preserve the durable evidence. The production build verifies complete 475-row accounting, exact mappings for every ready lesson, explicit reasons for every queued row, media coverage, label-assisted qualifier boundaries, semantic image identity, story uniqueness, visible classification labels, multi-family interaction, semantic appearance, native interaction safeguards, safe areas, touch targets, clean learner copy, and static rendering.

Node is pinned to `22.x`. No database, authentication, API, or environment variable is required.
