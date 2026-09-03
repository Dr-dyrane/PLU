# PLU

An image-first produce-identification and checkout-code learning system built with Next.js, TypeScript, and Lucide React.

`main` is the implementation branch and the Vercel production source.

## Learning flow

```text
Look → Know → Code → Practice → Recall
```

The app teaches the part that can be reasoned about—exact product recognition—before attaching the store's assigned code. Every lesson uses several realistic photographs so recognition transfers across angle, lighting, specimen, and market context.

## Must Know 50

The first two 25-product batches are complete:

- `data/batches/batch-01.json` — Core 25
- `data/batches/batch-02.json` — Next 25

The home page combines them into one searchable **Must Know 50** collection. Batch-specific views remain available at `/batch-01/` and `/batch-02/`.

The set spans peppers, bananas, avocados, apples, citrus, mangoes, melons, carrots, cabbage, lettuce, celery, beans, zucchini, roots, alliums, onions, potatoes, mushrooms, asparagus, corn, tomatoes, cucumbers, and broccoli.

## Product stories

Every lesson carries:

- exact catalog ID and checkout code;
- sold-by-weight or sold-each behavior;
- three realistic photographs with provenance;
- visual cues and classification decisions;
- package, case, bulk, size, organic, and related listings where present;
- nearest visual confusions;
- local code relationships presented as observations, never formulas;
- source flags for handwritten or curated store details.

Batch 01 retains individual story files in `data/stories/`. Batch 02 is split into validated story packets under `data/story-batches/`; both forms feed the same canonical runtime registry.

## Appearance

Light mode is the first-visit default. The home footer provides a persistent Apple-style light/dark switch. Product accents have separate light and dark values, while success, warning, and error colors remain semantic.

## Data

- `data/catalog/*.json` — 475 normalized source rows.
- `data/aisles.json` — 47 grocery-aisle entries.
- `data/batches/*.json` — ordered production batches.
- `data/stories/*.json` — individually curated product stories.
- `data/story-batches/*.json` — validated batch story packets.
- `data/canonical.ts` — the single runtime entrypoint.
- `data/pegs/*` — legacy workbook material retained for audit, not used by the current lesson.

## Validation

```bash
npm run validate:data
npm run validate:ui
npm run typecheck
npm run build
```

The production build verifies 50 exact mappings, media coverage, story uniqueness, visible classification labels, multi-family interaction, semantic appearance, native interaction safeguards, safe areas, touch targets, clean learner copy, and static rendering.

Node is pinned to `22.x`. No database, authentication, API, or environment variable is required.
