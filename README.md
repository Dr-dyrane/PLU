# PLU Trace

An image-first produce identification and checkout-code learning system built with Next.js and TypeScript.

## Branches

- `main` — deployed v0.1 reference prototype.
- `v0.2-learning-engine` — experimental TRACE lesson. This branch must be judged before becoming canon.

## TRACE

PLU identifiers are exact catalog assignments, so the application never predicts a code from product appearance. It teaches the parts that can be reasoned about, then makes the unavoidable final association procedural.

```text
Tell → Resolve → Attach → Challenge → Establish
```

For Green Pepper:

```text
Peppers → bell form → green → loose/by weight → 4065
```

The code is compiled into the actual checkout-keypad action:

```text
4065 → 40 | 65 → 4 → 0  |  6 → 5
```

The same code and keypad layout always produce the same visual path, rhythm, tones, and haptic sequence. Path points decode back to the original code.

## Product stories

The supplied workbook and reference sheets contain context beyond the number itself. `data/stories/green-pepper.json` demonstrates how progressive disclosure preserves it:

- exact product identity;
- visible discrimination cues;
- sold by weight versus each;
- loose, bag, bulk, and case records;
- source-sheet provenance and confidence;
- nearby code relationships and exceptions;
- nearest visual confusion.

The main lesson reveals one fact at a time. The complete product story is available through a mobile bottom sheet or desktop inspector sheet.

## Data

- `data/catalog/*.json` — 475 normalized source rows.
- `data/aisles.json` — 47 grocery-aisle entries.
- `data/stories/*.json` — curated, source-backed progressive product stories.
- `data/canonical.ts` — the single runtime entrypoint.
- `data/pegs/*` — legacy workbook material retained for audit, not used by TRACE.

## Learning state

The v0.2 reducer records identity, path, support, and recall events. Event IDs make updates idempotent:

```text
reduce(reduce(state, event), event) === reduce(state, event)
```

The interface infers competence from behavior instead of asking the learner to choose `Again`, `Hard`, `Good`, or `Easy`.

## Local development

```bash
npm install
npm run dev
```

## Validation and build

```bash
npm run validate:data
npm run typecheck
npm run build
```

The validator checks the 475-row catalog, Green Pepper's loose/package/case records, story provenance, code chunking, keypad-path round trip, and idempotent event behavior.

Node is pinned to `22.x`. No database, API, authentication, or environment variables are required.

## Design plan

See [`docs/TRACE_LEARNING_ENGINE.md`](docs/TRACE_LEARNING_ENGINE.md) for the algorithm, story model, progressive-disclosure interaction, feedback semantics, gamification policy, and scale gate.
