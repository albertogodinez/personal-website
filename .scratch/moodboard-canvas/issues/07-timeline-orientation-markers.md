# 07 — Orient the user within timeline mode

Status: ready-for-agent

Timeline mode spans roughly 700 units at 8 units per card for 90 cards, with no
indication of where in time the viewport is. There is no way to tell which
period you are looking at, and no way to see the whole span.

## Do

- Add year (or month, if the span is short) markers along the timeline axis in
  `src/components/moodboard/layouts/timeline.ts` plus a renderer for them.
- Derive marker positions from the same date field the layout already sorts by,
  so markers and cards cannot drift apart.
- Provide a way to see the whole span — either a zoomed-out home position for
  the mode or an overview affordance. Prefer the zoomed-out home if it makes the
  span legible, since it needs no new UI.
- Markers are static geometry; keep them out of the per-frame card registry.

## Done when

- Entering timeline mode makes the time range legible without dragging.
- Marker positions match the cards they sit beside.
- Marker generation is covered by a test against the layout module's pure
  output.
