# Architecture

## Source of truth

`data/catalog/*.json`, `data/peg-table.json`, and `data/aisles.json` are static runtime representations generated from the supplied workbook. The source workbook remains preserved in the sandbox source pack.

The application performs an exact catalog lookup:

`product identity → catalog record → assigned code`

It never derives an assigned code from color, shape, category, or numerical proximity.

## Mnemonic compiler

The deterministic rule is:

- Even digit count: split into two-digit chunks from the beginning.
- Odd digit count: keep the first digit alone, then split the remainder into pairs.
- Resolve each chunk through `data/peg-table.json`.
- Bind the ordered pegs to the product in one vivid, product-centred scene.

Examples:

- `4065 → 40 | 65`
- `433 → 4 | 33`
- `94133 → 9 | 41 | 33`

## Learning loop

`See → Encode → Hide → Recall → Correct → Contrast → Schedule`

The React component is reusable. Product-specific facts, images, visual anchors, stories, and confusion sets live in lesson data.

## Runtime

The first version is intentionally local-first:

- Next.js App Router
- TypeScript
- static export
- browser localStorage
- no server actions
- no database
- no environment variables

A future sync service can replace the storage adapter without changing the learning algorithm.
