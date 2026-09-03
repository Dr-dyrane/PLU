# Batch 04 · products 101–200

Batch 04 adds 100 ready lessons to the original 100-product curriculum.

## Feed loading contract

- The full result count remains searchable and filterable.
- Only 18 lesson cards are mounted initially.
- An `IntersectionObserver` advances the mounted window by 18 as the user approaches the bottom.
- The observer starts 850 px before the sentinel reaches the viewport so the next group is ready without mounting the full library.
- Only the first six mounted images are eager; later mounted images use native lazy loading.
- A button remains at the sentinel as an accessible manual fallback.
- Home cards receive lightweight story summaries rather than complete lesson payloads.

## Media publishing contract

Each Batch 04 source item is checked against the supplied catalog, resolved to a Wikimedia Commons image, converted to the canonical thumbnail URL, and then audited twice:

1. Commons metadata must identify an image resource.
2. The CDN response must return bytes matching its declared image type.

A failed lookup or byte audit blocks the deployment. The browser-level local placeholder remains a final runtime guard against temporary CDN failure.

## Selection

The 100 records preserve the Must-Know scoring inputs and score band in the generated media report. Packaged inventory and case records are excluded; the batch favors primary produce listings, common families, explicit Weight/Each records, and useful visual-confusion groups.
