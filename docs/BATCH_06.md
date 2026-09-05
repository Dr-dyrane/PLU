# Batch 06: catalog remainder

Batch 06 accounts for the 175 normalized catalog rows not used by Batches 01–05. It deliberately separates catalog completeness from lesson readiness:

- 92 rows are ready lessons with exact source codes and visually reviewed recognition photos.
- 28 rows are exact mapped references awaiting media or code-relationship lesson support.
- 43 rows need source review and retain explicit reason codes.
- 12 rows remain catalog-only because they are outside the produce-learning scope.
- All 475 catalog IDs appear exactly once across the six batch manifests.

The first release admitted only Aloe (`3798`) and HH Red tomato (`4798`) from a 21-row strict loose-produce pool. The corrected pass follows the earlier batch method across the entire remainder: it searched all 163 in-scope identities, found 108 candidate sets, decoded 422 primary/alternative images, and pixel-reviewed every one. Seventy-five candidates passed visual review. Forty-one newly reviewed rows cleared the code and identity gates, joining a 12-row reviewed foundation for 53 lessons. A second pass admitted 22 more single-code rows by reusing already-reviewed recognition photos with explicit source/target provenance and label-assisted qualifier boundaries. At that stage, Batch 06 had 75 ready lessons and the full catalog had 375.

The subsequent 26-record recovery pass reviewed six inherited Batch 05 exclusions and twenty media gaps. It admitted all six exact workbook listings after recording row-specific adjudications, plus eleven media recoveries. The catalog now has 392 playable lessons. `data/batch-06-recovery-decisions.json` pins all 26 outcomes, their source evidence, and the exact media allowed to publish. The three recovery files in `data/review-lanes/` preserve search attempts, rejected candidates, workbook locators, and rights findings.

The 28 mapped references consist of nine single-code rows still missing usable recognition evidence, eleven same-label/different-code relationships, and eight shared-code relationships. The nine media cases are celery hearts, Goldendew, Honey Kiss, Meridol papaya, Taylor Gold pear, both Vanilla persimmon listings, Fall Glo tangerine, and Mickey Lee watermelon. Their next steps require exact form/cultivar photographs with suitable rights; Meridol's candidate also shows a conflicting visible checkout code. They remain unfinished learning work.

The 43-row review queue has mutually exclusive next actions: 20 identity adjudications, nine missing-code captures, thirteen code reconciliations, and one long store-code classification. Twenty-nine queued rows already retain reviewed candidate or reuse evidence; fourteen still need recognition media. The twelve non-produce rows remain catalog-only. In total, 71 in-scope catalog records do not yet have playable lessons (28 mapped plus 43 queued).

The recovery's seventeen new lessons use 23 distinct reviewed photographs with author and license attribution. Blackberry, raspberry, and strawberry lessons use different images for hero, alternate, and context roles; cucumber and peeled garlic also gain a second view. Where only one appropriate photograph is available, the established seed fallback explicitly records its reuse across roles. Supplier and university identity references do not grant permission to copy their photographs.

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

`data/batch-06-knowledge.json` is the claim-level truth overlay for all 175 rows. `data/batch-06-mapping-decisions.json` preserves the reviewed 61-row relationship set, while `data/batch-06-media-reuse.json` preserves the 44 reviewed source/target image relationships. `data/batch-06-media-review-decisions.json` and the original three review-lane files preserve the first complete pixel review. Recovery decisions can clear only the six named legacy exclusions; handwritten flags, missing codes, and code collisions remain independent gates. `data/batch-06-reviewed-media.json` is the publishing ledger. `data/batch-06-dispositions.json` retains the complete admission outcome, while `data/batch-06-source.json` and `data/story-seeds/batch-06-generated.json` contain only ready rows.
