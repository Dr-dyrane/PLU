# PLU

An image-first produce-identification and checkout-code learning system built with Next.js, TypeScript, and Lucide React.

`main` is the implementation branch and the Vercel production source.

## Learning flow

```text
Look → Know → Code → Practice → Recall
```

The app teaches the part that can be reasoned about—exact product recognition—before attaching the store's assigned code. Every lesson uses several realistic photographs so recognition transfers across angle, lighting, specimen, and market context.

## Core 25

Batch 01 is active and defined in `data/batches/batch-01.json`.

- 25 exact catalog mappings are locked.
- Ten complete lessons are live across peppers, bananas, plantains, and avocados.
- The remaining 15 products are queued in a deliberate order covering citrus, herbs, roots, alliums, potatoes, tomatoes, cucumbers, broccoli, and apples.

Ready lessons are available at `/learn/[story-id]/`; the set overview is available at `/batch-01/` and at the home page.

## Product stories

Every ready lesson carries:

- exact catalog ID and checkout code;
- sold-by-weight or sold-each behavior;
- three realistic photographs with provenance;
- visual cues and classification decisions;
- package, case, bulk, size, organic, and related listings where present;
- nearest visual confusions;
- local code relationships presented as observations, never formulas.

## Appearance

Light mode is the first-visit default. The home footer provides a persistent Apple-style light/dark switch. Product accents have separate light and dark values, while success, warning, and error colors remain semantic.

## Data

- `data/catalog/*.json` — 475 normalized source rows.
- `data/aisles.json` — 47 grocery-aisle entries.
- `data/batches/*.json` — ordered production batches.
- `data/stories/*.json` — source-backed product stories.
- `data/canonical.ts` — the single runtime entrypoint.
- `data/pegs/*` — legacy workbook material retained for audit, not used by the current lesson.

## Validation

```bash
npm run validate:data
npm run validate:ui
npm run typecheck
npm run build
```

The production build verifies exact catalog mappings, media coverage, batch completeness, native interaction safeguards, semantic appearance, safe areas, touch targets, clean learner copy, and static rendering.

Node is pinned to `22.x`. No database, authentication, API, or environment variable is required.
