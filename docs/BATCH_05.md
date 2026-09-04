# Batch 05 release

Batch 05 adds products 201–300 and promotes the home collection to Must Know 300.

Release gates:

- regenerate Batch 04 through the hardened semantic resolver;
- replace known incorrect Batch 04 image matches;
- select 100 unused catalog records for Batch 05;
- resolve product-anchored Wikimedia photography;
- download and decode every Batch 04 and Batch 05 image;
- validate exact catalog/code/sold-by mappings;
- validate 300 stories and the production static export;
- commit the generated data so Vercel builds remain deterministic.
