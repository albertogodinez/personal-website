# 16 — Mirror covers into owned storage on ingest

Status: ready-for-agent
Blocked by: 15

Also depends on the content-pipeline workstream at
`.scratch/content-pipeline/`, which owns the ingest step this hooks into.

This is the actual fix for media rot. Without it, re-syncing (ticket 15) just
resets a timer: the board keeps depending on third-party signed URLs that
expire, and it will rot again.

## Do

- On ingest, download each cover and store it in storage we control (R2, per
  `.scratch/content-pipeline/spec.md`), then record the owned URL on the item.
- The canvas keeps treating cover URLs as opaque — this is an ingest concern,
  not a render concern, and `data-adapter.ts` should need no knowledge of where
  a cover is hosted.
- Decide whether the image proxy is still needed for owned covers: once covers
  are same-origin with correct CORS headers, the proxy's CORS role disappears,
  though its resize role may still be worth keeping. Record the decision.

## Done when

- Every item's cover resolves from owned storage.
- A cover that loads once keeps loading, with no dependency on a third-party
  signature.
- The proxy's remaining role (if any) is written down.
