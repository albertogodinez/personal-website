# Moodboard Canvas — Remaining Work

Status: ready-for-agent

Scope note: the canvas is built and holds 60fps on desktop. Units 1–3, 7 and
9–12 of the original build are done. This spec covers only what is left —
the media rot, the unbuilt units, the rough edges, and the deferred
projection decision. It is not a retelling of the original build.

## Problem Statement

I saved things to a Raindrop collection and built a 3D canvas to browse them.
Today the board hides a quarter of them. The reason is that the covers were
never mine — they were signed URLs pointing at Instagram's CDN, and those
signatures expired years ago. Nothing warns me about this; the board simply
looks smaller than it should.

As of the 2026-09-29 re-sync the collection holds 158 items and the board
shows 116; 42 are withheld by the adapter's `cdninstagram.com` exclusion.
Those 42 are **permanently** gone, not merely stale — re-fetching from the
Raindrop API was measured to recover 0 of them (see
`issues/15-raindrop-resync-fresh-covers.md`).

The parts that do render still feel unfinished. Timeline mode stretches
across a span I can't orient myself in, with no sense of where in time I am.
Filtering to one content type tightens that cluster but leaves it parked
off-centre, so I end up dragging to find what I just filtered for. Opening a
card full-size shows me a soft, upscaled image, because the overlay reuses
the same small texture the canvas uses. Nothing in the scene reacts when I
move the cursor over it, so the board feels inert. And if the collection ever
came back empty I'd stare at a blank screen with no explanation.

I also don't know whether any of this works on my phone. Touch and pinch are
written but have never been run on a real device, and the 60fps target I set
for mobile has never been measured.

## Solution

Stop depending on third-party signed URLs. Covers get mirrored into storage I
control at ingest time, so a cover that works once works forever. Until that
lands, the smaller failures that are actually recoverable get recovered: the
handful of covers failing through Raindrop's render service are re-requested
from the origin that still serves them, rather than being silently dropped.

The board becomes orientable and responsive. Timeline mode gains markers so a
position in the span means something. Filtering brings the focused group to
the camera instead of leaving it on its ring. Cards lift slightly under the
cursor, so the scene acknowledges input. Opening a card requests a full-size
image rather than the canvas texture. An empty collection says so instead of
rendering nothing.

The unbuilt units land where their data exists: connector lines in clustered
mode, which only need a renderer because the anchor points are already
computed; markdown cards, which need the content pipeline first because
nothing in the collection is markdown today.

Finally, the feature gets verified where it has never been verified: on a real
phone, and as a production build compared against dev, before it merges.

## User Stories

1. As a visitor, I want to see every item I saved, so that the board reflects
   my actual collection rather than the subset whose URLs happen to still work.
2. As a visitor, I want covers to keep working indefinitely, so that the board
   doesn't rot again six months from now.
3. As the maintainer, I want covers stored somewhere I control, so that a
   third party expiring a signature is no longer able to empty my board.
4. As the maintainer, I want the recoverable cover failures retried against an
   origin that still serves them, so that I'm not dropping items I could keep.
5. As the maintainer, I want the expired-host exclusion removed once covers are
   mirrored, so that the adapter stops hiding items that now load fine.
6. As a visitor in timeline mode, I want markers along the span, so that I can
   tell which period I'm looking at.
7. As a visitor in timeline mode, I want a way to see the whole span at once,
   so that I can navigate without dragging blindly.
8. As a visitor filtering to one content type, I want the camera to move to
   that group, so that I don't have to search for what I just filtered for.
9. As a visitor, I want cards to respond when I point at them, so that the
   board feels alive and I can tell what's interactive.
10. As a visitor opening a card, I want the image at full resolution, so that
    inspecting something closely is actually worth doing.
11. As a visitor, I want related items in clustered mode visibly connected, so
    that I can see why they're grouped.
12. As a visitor, I want content types to form meaningful groups, so that I'm
    not looking at a cluster of two items beside clusters of dozens.
13. As a visitor, I want link cards to look like the rest of the board, so that
    a generic site logo doesn't read as a broken card.
14. As a visitor on a phone, I want drag and pinch to work, so that the board
    is usable on the device I browse from most.
15. As a visitor on a phone, I want the board to stay smooth, so that
    navigating doesn't stutter.
16. As a visitor in clustered or timeline mode, I want cards at the edge of the
    viewport to look straight-on, so that a flat layout reads as flat.
17. As a visitor arriving at an empty board, I want to be told it's empty, so
    that I don't mistake it for a failure to load.
18. As a visitor, I want the canvas to behave the same in production as in
    development, so that what I see deployed is what was built.
19. As the maintainer, I want markdown items rendered as cards, so that the
    board covers every content type in the collection once the data exists.
20. As the maintainer, I want chunk streaming tuned predictably, so that
    loading behaviour follows navigation speed rather than a hand-picked delay.

## Implementation Decisions

- **Cover durability is an ingest concern, not a render concern.** The fix
  belongs in the content pipeline, which mirrors covers into owned storage as
  items are ingested. The canvas keeps treating cover URLs as opaque.
- **The expired-host exclusion in the data adapter is a temporary measure** and
  is removed once mirroring lands, not before — deleting it early re-introduces
  the blank cards it was added to suppress.
- **The image proxy keeps its resolution cap for canvas textures** and gains an
  opt-out for full-size requests. The cap is correct for the board and wrong for
  the overlay; both need to be expressible against the same endpoint.
- **Failed covers keep skipping their mesh** rather than drawing a placeholder.
  This behaviour is already correct; it means the standing placeholder asset is
  dead weight and should go.
- **Connector lines render in-scene, not as a DOM overlay.** The cluster anchor
  points are already computed in the clustered layout module, and an in-scene
  renderer keeps them in the same transform as the cards. The SVG-overlay option
  is rejected: it would need the camera projection mirrored in DOM space.
- **Hover feedback applies uniformly to all cards.** A per-content-type hover
  affordance was built once and removed for firing on incidental mouse passes;
  a uniform subtle lift avoids singling out one type and needs no intent delay.
- **Focused-cluster recentring moves the camera, not the layout.** Filtering
  already tightens the cluster radius; moving the group itself would fight the
  layout module's ring positions.
- **Per-frame work stays out of React.** Any card-level reaction added here
  (hover lift, connector endpoints, camera moves) mutates Three.js objects from
  the existing single `useFrame` loop rather than re-rendering cards, per the
  documented performance pattern.
- **Markdown cards are gated on data, not effort.** They stay unbuilt until the
  content pipeline produces markdown items; building them against no data risks
  designing for the wrong shape.
- **Mobile verification requires a physical device** and cannot be satisfied by
  emulation — it is the one item here that needs a human in the loop.

## Testing Decisions

A good test here asserts external behaviour: what the adapter returns, what the
proxy responds with, what the layout modules compute. It does not assert on
Three.js object graphs, frame timings inside React, or mesh internals — those
are implementation details and change with every perf pass.

- **Data adapter** is the highest-value seam and already the natural one: it
  takes the collection JSON and returns items. Cover exclusion, content-type
  derivation, expired-media handling and the empty case are all assertable here
  as pure input/output, with no canvas involved.
- **Image proxy endpoint** is testable as a request/response pair: capped
  versus uncapped variant, the transparent-pixel fallback and its marker
  header, and the resize skip for formats that can't be resized.
- **Layout modules** are pure functions from items to positions. Cluster
  centres, timeline span and marker positions, and chunk generation are all
  assertable without rendering.
- **Prior art:** there are no tests in this repo yet, so these are the first.
  That makes the adapter the right place to start — it is the seam with the most
  behaviour behind the smallest interface, and it needs no rendering harness.
- **Performance** is measured, not unit-tested, using the existing stats
  overlay and the documented benchmark procedure. The mobile 60fps target is a
  measurement on a real device, recorded as a number, not an assertion.
- **Production parity** is verified by comparing a production build against dev
  in a browser before merge, per this repo's pre-push validation rule.

## Out of Scope

- **Re-instating the hover video preview.** It was built and deliberately
  removed for firing on incidental mouse passes. The uniform hover lift covers
  the underlying "the scene feels inert" complaint without re-adding a
  dependency or needing hover-intent timing.
- **The content pipeline itself.** Mirroring covers and producing markdown items
  are that workstream's deliverables; this spec depends on them and does not
  define them. See `.scratch/content-pipeline/`.
- **The Cloudflare migration.** Tracked separately at
  `.scratch/cloudflare-migration/`.
- **Recovering the Instagram and Twitter covers from their current URLs.** Those
  42 and 2 items respectively carry expired signatures and deleted-tweet 404s;
  they come back only by re-fetching from the Raindrop API, which is the
  pipeline's job.
- **Frustum culling, LOD and instanced meshes.** The documented performance
  guidance puts these beyond the current card count; the present three-lens
  approach is not yet saturated.
