# TRACE learning engine

## Constraint

PLU codes are assigned identifiers. Product attributes can resolve the exact produce item, but they cannot mathematically derive the official code. The application therefore separates **knowledge that can be reasoned about** from the final arbitrary identifier that must become fluent.

## Canonical algorithm

**TRACE** is the learning loop:

1. **Tell** — reveal the product as a short, source-backed story.
2. **Resolve** — classify family, form, variant, and checkout unit.
3. **Attach** — bind the exact code to a deterministic checkout-keypad path.
4. **Challenge** — reconstruct the path and recall the code without support.
5. **Establish** — test the nearest confusion, record competence, and schedule another retrieval.

The code itself is never predicted. It is fetched from the canonical catalog.

## Why the keypad path is the primary recovery language

The old 00–99 celebrity peg table replaces one arbitrary mapping with another. TRACE instead compiles every code into the same procedural representation used at checkout:

```text
4065 → 40 | 65 → 4 → 0  |  6 → 5
```

Each digit has one fixed key position. A chunk pause separates `40` from `65`. The visual line, tap sequence, rhythm, tone, and haptic pulse are generated from the code itself.

Properties:

- deterministic: the same code and keypad layout always produce the same path;
- reversible: snapped path points decode to the original digits;
- compositional: any 3-, 4-, or 5-digit code works without a 100-item mnemonic dictionary;
- transferable: rehearsal matches the physical act the learner performs at a register;
- fadeable: once direct recall develops, the path disappears.

The learner still has to acquire one unavoidable fact — the exact product is attached to this assigned code — but every recovery step after that fact is systematic.

## Product story graph

Every learning object carries more than a name and code. The source sheets and workbook are normalized into a progressive story:

```text
family → visible form → color/variety → sale form → exact product node → assigned code
```

A product story can include:

- common and store display names;
- family, variety, color, size, and visible form;
- whether it is sold by weight or each;
- loose, bag, package, case, organic, or store-specific variants;
- source-page provenance and confidence flags;
- nearest visual confusions;
- observed local code relationships and explicit exceptions.

The main lesson reveals only the next fact needed. The complete story lives in a native-feeling sheet on mobile and an inspector sheet on desktop.

## Green Pepper story

The first canonical lesson resolves:

```text
Peppers → bell form → green variant → loose/by weight → 4065
```

The source also contains related records that must not be collapsed into the same lesson:

- loose green pepper — `4065`, sold by weight;
- green pepper 4-count bag — `3014`;
- green pepper case — `63866`;
- Green HH bulk — `3120`.

The story therefore teaches not only the code, but **when that code is valid**.

The code-neighborhood sheet also explains that red `4688`, yellow `4689`, and cubanelle `4687` form an observed 468x pocket, while loose green `4065` is an exception. This is surfaced as a relationship, never as a rule for inventing codes.

## One-viewport interaction model

The product remains spatially stable while the right-hand learning surface changes state. Mobile uses the same stage with contextual bottom sheets instead of a vertically stacked article.

```text
meet → resolve → attach → trace → recall → repair/complete
```

- **Meet:** product visual and one-line identity.
- **Resolve:** one discrimination decision at a time.
- **Attach:** official code, chunks, and animated checkout path.
- **Trace:** learner taps the path in order.
- **Recall:** path disappears; learner enters the code from the product alone.
- **Repair:** only the first failed chunk is replayed.
- **Complete:** competence feedback, not a claim of mastery.

## Feedback semantics

Feedback is multimodal but restrained:

- a short visual reaction;
- optional Web Audio tone generated from the digit;
- optional device vibration where supported;
- no punitive lives;
- no loud error state;
- reduced-motion and sound-off paths remain complete.

## Gamification

The product gamifies competence rather than activity. Useful measures are:

- identity accuracy;
- first-try code accuracy;
- path accuracy;
- unsupported recall;
- response latency;
- confusion rate;
- stability across days;
- shift-ready products.

XP, coins, leaderboards, and lives are intentionally outside v0.2.

## Idempotent learner state

Learning events carry an event ID. The reducer records processed IDs and returns the existing state when the same event is applied twice.

```text
reduce(reduce(state, event), event) === reduce(state, event)
```

This prevents double-clicks, retries, hydration, or replayed persistence events from inflating progress.

## Scale gate

The remainder of the catalog must not inherit this lesson until Green Pepper passes:

1. exact source lookup;
2. story provenance;
3. classification flow;
4. code-path round trip;
5. wrong-chunk repair;
6. assisted-versus-unassisted measurement;
7. phone and desktop one-viewport behavior;
8. sound-off and reduced-motion accessibility;
9. successful production build;
10. human judgment of the complete lesson.
