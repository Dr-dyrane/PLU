# Batch 06: catalog remainder

Batch 06 accounts for the 175 normalized catalog rows not used by Batches 01–05. It deliberately separates catalog completeness from lesson readiness:

- 2 rows are ready lessons with exact source codes and human-reviewed recognition photos.
- 173 rows remain searchable source-review records with explicit reason codes.
- All 475 catalog IDs appear exactly once across the six batch manifests.

The ready additions are Aloe (`3798`) and HH Red tomato (`4798`). Their reviewed photographs are recorded in `public/media-resolution-batch06.json`; the catalog remains the authority for the checkout codes.

Queued rows are not failed lessons. They preserve source material that still needs evidence, including missing or conflicting codes, package or quantity confirmation, ambiguous identity, duplicate labels with different codes, and exact recognition photography. A queued row must not receive a story seed until its specific reason is resolved.

## Rebuild

```bash
npm run generate:batch06
npm run audit:batch06-media
npm run build
```

`data/batch-06-dispositions.json` is the complete admission ledger. `data/batch-06-source.json` and `data/story-seeds/batch-06-generated.json` contain only ready rows. `data/batches/batch-06.json` and `public/media-resolution-batch06.json` retain the complete ready/queued outcome.
