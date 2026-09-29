# 15 — Re-sync the collection for fresh signed covers

Status: wontfix

**Done, and the premise it rested on is disproven. Re-syncing recovers zero
covers.** The re-fetch was run on 2026-09-29 and
`src/content/moodboard/raindrop-collection.json` is updated, so the mechanical
part of this ticket is complete. But the reason for doing it does not hold.

This ticket asserted that the dead Instagram covers "come back only by
re-fetching from the Raindrop API, which re-signs them." Measured against the
real API:

- **0** cover URLs changed among the 116 items present in both the old and new
  collections. The API returns byte-identical URLs, not re-signed ones.
- **8 of 8** sampled `cdninstagram.com` covers returned **HTTP 403** after the
  re-fetch. Four non-Instagram covers from the same response returned HTTP 200,
  so the probe method is sound.

Raindrop stores the cover URL it captured at bookmark time; it does not
re-derive it. Nothing in this repo can make an expired Instagram signature
valid again.

Recovered-cover count, which ticket 17 was waiting on: **0 of 42**.

What the re-fetch did change is the collection itself — the board's content had
drifted since the last sync:

- 133 → 158 items (**42 added, 17 removed**)
- Items filtered out by the `cdninstagram.com` exclusion: 43 → 42
- Usable cards: 90 → **116**
- YouTube items: 7 → 12

## Why this is `wontfix` rather than `ready-for-agent`

Re-running it is cheap (`pnpm scaffold:raindrop`, and
`pnpm scaffold:raindrop:dry` to preview) and worth doing whenever the board's
content drifts. But as a *media-rot remedy* it is a dead end, so it is not a
prerequisite for anything. Ticket 16 no longer waits on it.
