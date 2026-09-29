# 16 — Mirror covers into owned storage on ingest

Status: ready-for-agent

No longer blocked by 15. That ticket was closed `wontfix` once re-syncing was
measured to recover **0 of 42** covers, so there is nothing to wait for.

Still depends on the content-pipeline workstream at
`.scratch/content-pipeline/`, which owns the ingest step this hooks into.

This is the **only** fix for media rot, not merely the durable one. Ticket 15
established that re-syncing does not reset the timer — the expired URLs never
come back — so mirroring is the whole remedy rather than a follow-up to it.

**Mirroring cannot recover the 42 already-dead Instagram covers.** Their URLs
return 403, so there are no bytes left to copy. Mirroring protects covers that
still resolve *today* and stops the same loss recurring; the 42 are gone unless
their source URLs are re-captured from Instagram itself, which is out of scope
here. Size the ticket against the ~116 live covers, not all 158 items.

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
