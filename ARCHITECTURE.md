# Architecture

## Source of truth

`data/catalog/*.json`, `data/peg-table.json`, and `data/aisles.json` are static runtime representations generated from the supplied workbook. The source workbook remains preserved in the sandbox source pack.

The application performs an exact catalog lookup:

`product identity → catalog record → assigned code`

It never derives an assigned code from color, shape, category, or numerical proximity.

## Catalog disposition model

Every normalized source row has one explicit runtime disposition:

- `ready`: one exact catalog code and reviewed recognition evidence produce a recall lesson;
- `mapped`: the catalog relationship is exact, but ambiguity or missing recognition evidence prevents a one-answer lesson;
- `queued`: identity or code evidence still needs source review;
- `excluded`: the source row is retained for completeness but is outside produce learning.

Only `ready` rows compile to `ProductStory` and `/learn/` routes. Mapped, queued, and excluded rows remain searchable reference records and cannot affect learned progress.

Nineteen explicitly reviewed `mapped` rows also have `/relationships/[catalogId]/` source-row lessons. These teach the exact label, source pages, and complete recorded code set without establishing a primary or current checkout code. Same-label and shared-code neighbors retain their complete source arrays and uncertainty flags. Relationship recall requires every recorded code, preserves leading zeros, and rejects partial sets and duplicates. A separate checkout guard prevents photo-only or interchangeable-label conclusions.

`data/batch-06-relationship-decisions.json` is the evidence ledger; `npm run prepare:relationships` materializes reviewed source photographs and immutable mappings into `data/relationship-lessons.json`. The build validates the exact nineteen targets and their neighbors. Home receives lightweight summaries only. Completion uses `plu:relationship:<catalogId>` and is displayed as “Mapping studied,” never mixed with `plu:complete:<storyId>` mastery. The 26 mapped records therefore comprise 19 studyable relationships and 7 awaiting media, not 26 new checkout-ready lessons.

## Reference-study coverage

`data/reference-lessons.json` adds `/reference/[catalogId]/` studies for the 48 in-scope rows outside ready and relationship lessons. It does not change their canonical `mapped`/`queued` status or make them checkout-ready. The user authorized generated teaching media on 2026-09-07 after confirming no more source material was available.

The separate study contract preserves exact source text, missing values, sale-unit nulls, and evidence restrictions. Ten unflagged singleton codes support explicitly labeled source-row recall; the other 38 records recall their unresolved source note, never uncertain digits. A checkout-boundary exercise is required before saving `plu:reference:<catalogId>` progress. Revision signatures invalidate stale study results. No reference completion writes checkout or relationship mastery.

The reference set contains 36 reviewed photographs and 12 AI-generated general-form illustrations, with visible provenance and claim limits. Generated art is not photographic evidence or cultivar/store-code confirmation. `data/reference-illustrations.json` pins replacements and image hashes; `public/media/reference/provenance.json` publishes the generated prompts and provenance. `npm run prepare:references` rebuilds the studies, while the build validates exact coverage and local asset hashes without needing a network refresh. All 463 in-scope records now have a study route; the other 12 stay catalog-only. Complete study coverage is not complete checkout verification.

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
