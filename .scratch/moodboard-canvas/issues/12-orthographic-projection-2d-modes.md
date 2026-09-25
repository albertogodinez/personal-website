# 12 — Flatten projection for clustered and timeline modes

Status: ready-for-agent

Clustered and timeline are conceptually flat layouts but still render through a
perspective camera, so cards at the edge of the viewport skew. The intended
approach was to interpolate FOV to fake an orthographic projection when entering
a 2D mode; `src/components/moodboard/CameraRig.tsx` currently only lerps position
to a per-mode home.

Current behaviour was accepted as good enough, so this is an improvement, not a
defect. Confirm it is still wanted before building it.

## Do

- Interpolate toward a flattened projection on entering clustered or timeline
  mode, and back on entering infinite mode.
- Prefer FOV interpolation on the existing perspective camera over swapping in
  an orthographic camera — a camera swap would invalidate the card registry and
  every position the layouts compute against the current projection.
- Keep the transition on the same lerp the rig already uses for mode changes.

## Done when

- Cards at the viewport edge read as straight-on in clustered and timeline.
- Infinite mode's perspective depth is unchanged.
- Transitions in both directions are smooth, with no visible pop.
