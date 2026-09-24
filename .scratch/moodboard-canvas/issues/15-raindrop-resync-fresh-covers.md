# 15 — Re-sync the collection for fresh signed covers

Status: ready-for-agent

Blocked on the content-pipeline workstream at `.scratch/content-pipeline/`,
not on any ticket in this directory.

42 Instagram covers and 2 Twitter covers are dead: the Instagram URLs carry
signatures that expired years ago, `file` is `null` on all of them, and every
entry in their `media[]` points at the same expired host. They come back only
by re-fetching from the Raindrop API, which re-signs them. The 2 Twitter items
are 404s from deleted tweets and will not come back at all.

Re-syncing alone only buys time — the fresh signatures will also expire. It is
worth doing because it is the input to mirroring (ticket 16), not as a fix in
itself.

## Do

- Re-fetch the collection from the Raindrop API, replacing
  `src/content/moodboard/raindrop-collection.json`.
- Confirm how many of the 42 Instagram covers return with working signatures.
- Record the recovered count, and confirm the 2 Twitter items are permanently
  gone.

## Done when

- The collection JSON is refreshed from the API.
- The recovered-cover count is recorded here, so ticket 17 knows what removing
  the host exclusion will actually reveal.
