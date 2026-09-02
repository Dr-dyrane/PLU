# PLU Master

An image-first learning system for produce lookup codes.

The first vertical slice teaches **Green Pepper → 4065** with the reusable sequence:

`See → Encode → Hide → Recall → Correct → Contrast → Schedule`

## What is deterministic

The product code comes from the checked-in catalog. It is never predicted from color, shape, or category.

The memory compiler then creates the learnable relationship:

`4065 → 40 | 65 → Rick Ross | Julius Caesar`

The product-specific visual scene binds those pegs back to the produce item.

## Data

- `source/PLU_Codes.xlsx` — auditable source workbook
- `data/catalog.json` — 475 normalized catalog records
- `data/peg-table.json` — complete 0–9 and 00–99 peg system
- `data/lessons.ts` — curated teaching records layered on the catalog

`npm run validate:data` verifies the catalog, complete peg table, and the first learning path before every production build.

## Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Production build

```bash
npm run build
```

The app uses Next.js static export and emits deployable HTML, CSS, JavaScript, and assets to `out/`.

## Deploy with Vercel

1. Import the GitHub repository `Dr-dyrane/PLU` into Vercel.
2. Keep the detected framework as **Next.js**.
3. No environment variables are required.
4. Deploy from `main`.

The Next.js project is at the repository root, so Vercel requires no root-directory override. After the Git integration is connected, future branch pushes can produce preview deployments and updates to `main` can produce production deployments.

## Current scope

- Responsive image-first lesson
- Physical keyboard and touch keypad
- Immediate correction and retry
- Family contrast after successful recall
- Optional mnemonic rescue
- Local progress and review scheduling
- Static, serverless-free deployment
