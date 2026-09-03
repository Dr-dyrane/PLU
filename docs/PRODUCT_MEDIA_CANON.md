# Product Media Canon

## Purpose

A learner must recognize a produce item across natural variation, not memorize the exact pixels of one training image. Product media is therefore part of the learning algorithm rather than decoration.

## Required set

Every canonical product story must provide at least three distinct realistic photographs:

| Role | Learning job |
| --- | --- |
| `hero` | Clean first exposure with the target easy to inspect |
| `alternate` | Different angle, contour, lighting, or natural specimen |
| `context` | Produce-bin, market, packaging, or neighboring-item context |

A fourth `detail` photograph is optional for cut surfaces, stems, labels, packaging, or other discriminating features.

## Stage mapping

TRACE keeps one fixed workspace and changes the media progressively:

```text
Meet       → hero
Resolve    → alternate
Attach     → hero
Trace      → alternate
Recall     → context
Repair     → alternate
Complete   → context
```

The recall stage intentionally uses the most natural context. A correct response should transfer beyond the image used during instruction.

## Data contract

Each photo contains:

```ts
{
  id: string;
  src: string;
  alt: string;
  role: "hero" | "alternate" | "context" | "detail";
  focus?: string;
  source: {
    label: string;
    author: string;
    license: string;
    url: string;
  };
}
```

`image` and `alt` remain compatibility aliases for the hero photograph.

## Selection rules

- The target must remain identifiable without labels baked into the image.
- Photographs should differ meaningfully; crops of one source do not count as separate photographs.
- Color must be natural enough to support visual discrimination.
- Context photographs may include close confusions, but the target must still be visible.
- Avoid stylized illustration as the sole recognition source.
- Prefer assets with clear reuse rights and preserve source metadata.
- Do not let photographic novelty reveal the answer pattern; roles should be consistent across products.

## UX

The learner does not scroll through a gallery. Media changes in place with a quiet crossfade as the TRACE stage advances. This preserves the Dyrane one-viewport canon, keeps the product spatially stable, and introduces difficulty through controlled variation rather than additional interface.

Reduced-motion users receive an immediate image swap without animation.

## Validation

`scripts/validate-media.mjs` requires:

- at least three unique images;
- hero, alternate, and context roles;
- descriptive alt text;
- HTTPS or local sources;
- source, author, license, and provenance URL;
- compatibility aliases matching the hero image.
