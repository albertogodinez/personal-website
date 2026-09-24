# 02 — Empty state when the adapter returns no items

Status: ready-for-agent

If `src/components/moodboard/data-adapter.ts` ever returns zero items, the
canvas renders nothing and gives no explanation — visually identical to a
failed load. This is reachable today: the expired-host exclusion already drops
32% of the collection, and a wider outage would drop more.

## Do

- Render an empty state when the item list is empty, in or alongside
  `src/components/moodboard/MoodboardCanvas.tsx`.
- Say that the board is empty, not that something broke. Match the existing
  glass-morphism UI chrome used by `FilterBar` / `ModeSwitch`.
- Distinguish "no items at all" from "no items match the active filter" — the
  second is reachable by filtering and needs different wording.
- Per this repo's CSS rule, do not import CSS from inside the `client:only`
  React component; add any styles to `src/styles/moodboard-canvas.css`, which
  the page already imports.

## Done when

- Zero items shows an explanatory empty state rather than a blank canvas.
- Filtering to a content type with no matches shows the filter-specific
  message.
- The adapter's empty case is covered by a test asserting it returns an empty
  list cleanly rather than throwing.
