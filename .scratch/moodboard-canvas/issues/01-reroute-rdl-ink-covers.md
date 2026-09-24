# 01 — Reroute the 7 rdl.ink cover failures

Status: ready-for-agent

Seven covers in `src/content/moodboard/raindrop-collection.json` fail through
Raindrop's render service (`rdl.ink`): six return HTTP 500, one returns 415.
Unlike the Instagram failures, these are not expired signatures — the renderer
itself is erroring, and the underlying files may still be served by the origin.

These are the only recoverable cover failures that do not require the content
pipeline. Everything else in the broken set is an expired signature or a
deleted source.

## Do

1. Re-probe the 7 URLs (Raindrop IDs `559163735`, `397697806`, `407278234`,
   `495660822`, `769657797`, `807249791`, `872257170`) with a browser
   User-Agent, so the current state is known rather than assumed from the
   2026-09-19 probe.
2. For each that still fails, try the `up.raindrop.io` / origin URL instead of
   the `rdl.ink` render URL.
3. Where an origin URL works, prefer it. Decide in
   `src/components/moodboard/data-adapter.ts` whether to rewrite `rdl.ink`
   covers to the origin form generally, or to carry per-item overrides —
   prefer the general rule if the URL shape is predictable.
4. Note in the ticket comments which IDs recovered and which did not.

## Done when

- The recoverable subset renders on the board.
- Any still-dead IDs are recorded here so they are not re-probed blindly later.
- No new cover URLs are hardcoded per-item unless the general rewrite is
  genuinely impossible.
