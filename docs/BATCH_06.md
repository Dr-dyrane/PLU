# Batch 06: catalog remainder

Batch 06 accounts for the 175 normalized catalog rows not used by Batches 01–05. It deliberately separates catalog completeness from lesson readiness:

- 53 rows are ready lessons with exact source codes and human-reviewed recognition photos.
- 122 rows remain searchable, evidence-gated records with explicit reason codes.
- All 475 catalog IDs appear exactly once across the six batch manifests.

The first release admitted only Aloe (`3798`) and HH Red tomato (`4798`) from a 21-row strict loose-produce pool. The corrected pass follows the earlier batch method across the entire remainder: it searched all 163 in-scope identities, found 108 candidate sets, decoded 422 primary/alternative images, and pixel-reviewed every one. Seventy-five candidates passed visual review. Forty-one newly reviewed rows cleared the code and identity gates, joining a 12-row reviewed foundation for 53 ready Batch 06 lessons and 353 ready lessons overall.

The remaining work is represented as mutually exclusive next actions rather than one generic lock: 26 identity adjudications, 9 missing-code captures, 32 code reconciliations, 1 long store-code classification, 31 retail-unit/code checks, 10 media searches, 1 title-deduplication decision, and 12 out-of-scope rows. Thirty-two blocked rows already retain pixel-approved media, so resolving their code or identity evidence will not require repeating image review.

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

`data/batch-06-knowledge.json` is the claim-level truth overlay for all 175 rows. `data/batch-06-media-review-decisions.json` and the three files under `data/review-lanes/` preserve the complete pixel review. `data/batch-06-reviewed-media.json` is the publishing ledger. `data/batch-06-dispositions.json` retains the complete admission outcome, while `data/batch-06-source.json` and `data/story-seeds/batch-06-generated.json` contain only ready rows.
