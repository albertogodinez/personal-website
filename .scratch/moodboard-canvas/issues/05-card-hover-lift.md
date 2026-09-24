# 05 — Uniform hover lift on all cards

Status: ready-for-agent

Nothing in the scene responds to hover beyond the cursor becoming a pointer, so
the board feels inert. A per-content-type hover affordance (a video preview
panel) was built and removed for firing on incidental mouse passes; the
replacement should apply to every card uniformly so no single type is singled
out and no hover-intent delay is needed.

## Do

- Add a subtle scale lift on pointer-over in
  `src/components/moodboard/CardMesh.tsx`.
- Drive it from the existing single `useFrame` loop that already mutates
  material opacity and mesh visibility via the card registry — do NOT introduce
  camera- or hover-derived React props, which would defeat `React.memo` across
  all cards. This is the documented failure mode in
  `docs/solutions/architecture-patterns/r3f-performance-diagnostic-path-chunk-canvas-2026-04-23.md`.
- Keep the lift small enough that it reads as feedback, not animation.

## Done when

- Pointing at any card lifts it slightly; moving away restores it.
- The stats overlay (Shift+D) shows no p95 regression during hover-heavy
  movement.
- No new per-frame React props were added to the card component.
