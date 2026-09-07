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

Relationship presentation uses one title/page marker, complete chunked code sets, short recall and checkout choices, and a fixed action dock. Full listing evidence, sale-unit gaps, all related-row arrays and flags, and photo credits live in a native Listing / Related / Sources sheet. Concise presentation never selects a primary code or changes the source-row completion contract.

`data/batch-06-relationship-decisions.json` is the evidence ledger; `npm run prepare:relationships` materializes reviewed source photographs and immutable mappings into `data/relationship-lessons.json`. The build validates the exact nineteen targets and their neighbors. Home receives lightweight summaries only. Completion uses `plu:relationship:<catalogId>` and is displayed as “Mapping studied,” never mixed with `plu:complete:<storyId>` mastery. The 26 mapped records therefore comprise 19 studyable relationships and 7 awaiting media, not 26 new checkout-ready lessons.

## Reference-study coverage

`data/reference-lessons.json` adds `/reference/[catalogId]/` studies for the 48 in-scope rows outside ready and relationship lessons. It does not change their canonical `mapped`/`queued` status or make them checkout-ready. The user authorized generated teaching media on 2026-09-07 after confirming no more source material was available.

The separate study contract preserves exact source text, missing values, sale-unit nulls, and evidence restrictions. Ten unflagged singleton codes support explicitly labeled source-row recall; the other 38 records identify their existing missing/conflicting/uncertain source status, never uncertain digits. A checkout-boundary exercise is required before saving `plu:reference:<catalogId>` progress. Revision signatures invalidate stale study results. No reference completion writes checkout or relationship mastery.

Reference presentation follows the Core 25 contract: a stable image and single title, one short cue or choice at a time, chunked recorded codes, brief repair feedback, and a fixed action dock. AI/reference labels remain visible. A native Item / Code / Sources sheet retains full source wording, missing units, image restrictions and credits without repeating them in the exercise. The sheet owns scrolling, keyboard focus and dismissal; existing source records and eligibility are not changed by copy refinement.

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

Ready lessons show short form, color and unit cues during Look, with a wider phone cue for long exact forms. Code uses a fixed short prompt rather than repeating the product title. Full recognition cues remain in ProductSheet; reviewed-panel credits and reuse limitations are available through its Photo source disclosure.

## Dyrane UI principles

For PLU, follow the user's borderless, show-don't-tell direction:

- Group with spacing, alignment and subtle semantic surface tones. Avoid decorative enclosing borders, inset outline substitutes, repeated badges and unnecessary dividers.
- Let reviewed product images lead. Show one clear current action, short prompts and useful feedback; don't repeat what the image, selected navigation or progress already communicates.
- Keep supporting evidence in existing disclosures. Never hide source uncertainty, provenance or recovery feedback merely to reduce copy.
- Preserve visible keyboard focus, readable contrast, touch targets, reduced-motion support and both themes. Borderless does not mean removing interaction states.
- Reuse the lesson engine, shared components and theme tokens. Verify rendered appearance as well as behaviour before release.

The Today, shared navigation and session-summary CSS have a focused regression check for decorative borders and missing focus indicators. This is not a claim that every legacy surface has been restyled.

## Runtime

### Today and bounded practice

`data/core-session.ts` selects exactly five authored Core 25 stories. The home route sends only their photo/title summaries to `TodayHome`; `/session/core-25/` sends those five stories to `CoreSession`, which reuses `PluLesson` and its exact-code success gate. The callback runs after successful recall; a finish-actions slot keeps standalone continuation unchanged.

`plu:session:core-25:v1` saves a versioned, exact ordered ID/code signature, completed ID prefix, and timestamp. Invalid, stale-signature, out-of-order, and future-dated payloads are rejected. Session completion is idempotent and never inferred from legacy lesson flags or relationship/reference results. Storage errors leave an in-memory session usable, with a visible warning. No daily scheduling, retention scoring, or cross-device sync is claimed.

`/library/` retains all catalog routes and filters. Old root search URLs redirect client-side to Library for static-export compatibility. Explicit `returnTo` links preserve Library filters across lessons and continuation; only the local `/library/` path is accepted. Today and Library share a small two-destination navigation component.

The first version is intentionally local-first:

- Next.js App Router
- TypeScript
- static export
- browser localStorage
- no server actions
- no database
- no environment variables

A future sync service can replace the storage adapter without changing the learning algorithm.
