# 06 — Recentre the camera on a focused cluster

Status: ready-for-agent

Filtering to one content type tightens that cluster's radius but leaves it at
its ring position in `src/components/moodboard/layouts/clustered.ts`, so the
focused group can sit off-centre and the user has to drag to find what they
just filtered for. The original mockup zoomed the camera to the focused group.

## Do

- On filtering to a single content type in clustered mode, move the camera to
  that cluster's centre. `clusterCenters` is already exported from
  `clustered.ts`, so the target position exists.
- Implement the move in `src/components/moodboard/CameraRig.tsx`, reusing the
  existing position-lerp used for mode transitions rather than adding a second
  animation mechanism.
- Move the camera, not the layout — repositioning the group itself would fight
  the layout module's ring assignment.
- Returning to "all" should return to the mode's home position.

## Done when

- Filtering to one type brings that cluster to the camera smoothly.
- Clearing the filter returns to the clustered home position.
- Filter changes in infinite and timeline modes are unaffected.
