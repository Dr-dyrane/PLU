# PLU Master

An image-first PLU learning prototype built with Next.js, TypeScript, and a static catalog.

The first complete learning path teaches **Green Pepper → 4065** using:

`See → Encode → Hide → Recall → Correct → Contrast → Schedule`

## The algorithm

The application does not calculate or predict PLU codes from a product's appearance. The workbook/catalog is the source of truth.

For memorization, the code is compiled into stable number pegs:

`4065 → 40 | 65 → Rick Ross | Julius Caesar`

A product-centred visual story connects those pegs back to the item.

## Data

- `data/catalog/*.json` — all 475 source catalog rows, split into static chunks
- `data/peg-table.json` — all 10 single-digit and 100 two-digit mnemonic pegs
- `data/aisles.json` — the grocery aisle directory for a later quiz mode
- `data/lessons.ts` — curated learning content layered on exact catalog records

The first lesson reads `Peppers - Green → 4065` from the catalog; it is not generated from color, shape, or category.

## Current prototype

- Responsive desktop, tablet, and phone layouts
- Product-image recognition
- Correct even/odd code chunking
- Touch keypad and physical keyboard input
- Immediate correction and forced retry
- Family contrast after successful recall
- Optional mnemonic rescue
- Local progress and review scheduling
- Static export with no API, database, authentication, or environment variables

## Local development

```bash
npm install
npm run dev
```

## Validation and production build

```bash
npm run validate:data
npm run build
```

`next.config.ts` uses static export, so a production build emits portable HTML, CSS, JavaScript, and assets to `out/`.

## Deploy on Vercel

1. Import `Dr-dyrane/PLU`.
2. Keep the detected framework as **Next.js**.
3. Keep the repository root as the root directory.
4. No environment variables are required.
5. Deploy `main`.

The included `vercel.json` runs the validated production build. Keep Vercel's output-directory setting on the framework default.
