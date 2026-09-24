# 17 — Remove the expired-host exclusion from the adapter

Status: ready-for-agent
Blocked by: 16

`src/components/moodboard/data-adapter.ts` drops items whose cover matches
`EXPIRED_MEDIA_HOSTS` (currently `['cdninstagram.com']`), leaving 90 of 133
items. This is a deliberate temporary measure: it keeps the board looking
correct rather than showing blank cards.

Do not remove it before covers are mirrored (ticket 16). Removing it early
re-introduces exactly the blank cards it was added to suppress.

## Do

- Delete `EXPIRED_MEDIA_HOSTS` and the `isExpiredMedia` check.
- Confirm the board now shows the full collection.
- Keep the proxy's transparent-pixel fallback and the `CardMesh` skip for
  failed covers — those are the general safety net and stay regardless.

## Done when

- The adapter returns all items from the collection.
- The board renders the full set with no blank cards.
- The adapter's item count is covered by a test asserting it no longer filters
  by host.
