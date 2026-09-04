# Batch 06: catalog remainder

Batch 06 accounts for the 175 normalized catalog rows not used by Batches 01–05. It deliberately separates catalog completeness from lesson readiness:

- 75 rows are ready lessons with exact source codes and human-reviewed recognition photos.
- 39 rows are exact mapped references that are deliberately not one-answer lessons.
- 49 rows need source review and retain explicit reason codes.
- 12 rows remain catalog-only because they are outside the produce-learning scope.
- All 475 catalog IDs appear exactly once across the six batch manifests.

The first release admitted only Aloe (`3798`) and HH Red tomato (`4798`) from a 21-row strict loose-produce pool. The corrected pass follows the earlier batch method across the entire remainder: it searched all 163 in-scope identities, found 108 candidate sets, decoded 422 primary/alternative images, and pixel-reviewed every one. Seventy-five candidates passed visual review. Forty-one newly reviewed rows cleared the code and identity gates, joining a 12-row reviewed foundation for 53 lessons. A second pass admitted 22 more single-code rows by reusing already-reviewed recognition photos with explicit source/target provenance and label-assisted qualifier boundaries. Batch 06 therefore has 75 ready lessons and the full catalog has 375.

The 39 mapped references consist of 20 single-code rows still missing lesson-grade recognition evidence, 11 same-label/different-code relationships, and 8 shared-code relationships. They remain searchable but do not create duplicate or ambiguous quizzes.

The true 49-row review queue has mutually exclusive next actions: 26 identity adjudications, 9 missing-code captures, 13 code reconciliations, and 1 long store-code classification. Thirty-five queued rows already retain a reviewed candidate or reviewed reuse relationship; 14 still need a recognition source. The 12 non-produce rows are separately marked catalog-only rather than counted as unfinished lessons.

Package, Organic, HH, FM, Jr, and similar store-label distinctions use a label-assisted contract. The photograph teaches only the visible produce identity, form, and color. The exact qualifier and code remain explicitly tied to the supplied workbook label; generated alt text and visual cues may not claim that those qualifiers are visible.

## Rebuild

```bash
npm run discover:batch06-media
python3 scripts/build-media-contact-sheets.py --report public/media-discovery-batch06.json
npm run compile:batch06-reviews
npm run generate:batch06
npm run audit:batch06-media
npm run build
```

`data/batch-06-knowledge.json` is the claim-level truth overlay for all 175 rows. `data/batch-06-mapping-decisions.json` preserves the reviewed 61-row relationship set, while `data/batch-06-media-reuse.json` preserves the 44 reviewed source/target image relationships. `data/batch-06-media-review-decisions.json` and the three files under `data/review-lanes/` preserve the complete pixel review. `data/batch-06-reviewed-media.json` is the publishing ledger. `data/batch-06-dispositions.json` retains the complete admission outcome, while `data/batch-06-source.json` and `data/story-seeds/batch-06-generated.json` contain only ready rows.
