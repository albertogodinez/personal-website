# 17 — Remove the expired-host exclusion from the adapter

Status: ready-for-agent
Blocked by: 16

`src/components/moodboard/data-adapter.ts` drops items whose cover matches
`EXPIRED_MEDIA_HOSTS` (currently `['cdninstagram.com']`), leaving **116 of 158**
items after the 2026-09-29 re-sync (was 90 of 133). This is a deliberate
temporary measure: it keeps the board looking correct rather than showing blank
cards.

Do not remove it before covers are mirrored (ticket 16). Removing it early
re-introduces exactly the blank cards it was added to suppress.

**The 42 excluded items will never render, and this ticket cannot fully
complete.** Ticket 15 measured their covers at HTTP 403 after a fresh API
re-fetch, with 0 of 42 recovered, so mirroring (ticket 16) has no bytes to
copy for them. Deleting the host exclusion therefore surfaces 42 permanently
blank cards, not 42 restored ones.

Decide which this ticket actually means before starting:

- **Drop the 42 items from the collection** and then delete the exclusion. The
  adapter stops filtering, and the board shows everything it has. This is the
  only version that reaches "no blank cards".
- **Keep the exclusion indefinitely** as the permanent handling for dead media,
  and close this ticket. The filter is then not temporary and the comment in
  `data-adapter.ts` should say so.
- **Re-capture the 42 covers from Instagram directly**, outside Raindrop, then
  mirror those. Largest scope, and the only route that keeps the items.

## Do

- Delete `EXPIRED_MEDIA_HOSTS` and the `isExpiredMedia` check.
- Confirm the board now shows the full collection.
- Keep the proxy's transparent-pixel fallback and the `CardMesh` skip for
  failed covers — those are the general safety net and stay regardless.

## Done when

- The chosen option above is recorded here, with its reason.
- The adapter returns every item the collection still contains.
- The board renders that full set with no blank cards.
- The adapter's item count is covered by a test asserting it no longer filters
  by host.
