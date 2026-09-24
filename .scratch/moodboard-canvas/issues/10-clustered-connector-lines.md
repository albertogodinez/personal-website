# 10 — Connector lines between related items in clustered mode

Status: ready-for-agent

Original build Unit 6 (requirement R6) calls for lines between related items in
clustered mode. `src/components/moodboard/layouts/clustered.ts` already exports
`clusterCenters`, so the anchor points exist; there is no renderer.

## Do

- Render the connectors in-scene (drei `<Line>` or equivalent), not as an SVG
  DOM overlay. The overlay option is rejected: it would require mirroring the
  camera projection in DOM space, and would drift from the cards on every
  camera move.
- Drive endpoints from `clusterCenters` and the card positions the layout
  already computes.
- Connectors are static per layout; update them when the layout changes, not
  per frame, and keep them out of the per-frame card registry.
- Respect the active filter: connectors to filtered-out cards should fade with
  them rather than dangling.

## Done when

- Clustered mode shows connectors between items and their cluster centre.
- Connectors track cards through mode transitions and filtering.
- The stats overlay shows no p95 regression in clustered mode.
